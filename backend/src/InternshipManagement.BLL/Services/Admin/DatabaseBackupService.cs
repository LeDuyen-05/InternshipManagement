using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace InternshipManagement.BLL.Services.Admin;

public sealed class BackupOptions
{
    public bool Enabled { get; set; }
    // This directory must be accessible at the SAME absolute path by SQL Server and the API.
    public string Directory { get; set; } = "";
    public string ManifestDirectory { get; set; } = "";
    public int TimeoutSeconds { get; set; } = 600;
}

public sealed record BackupRecord(string Id, string FileName, string Database, string Environment,
    string CreatedBy, DateTimeOffset StartedAt, DateTimeOffset? FinishedAt, string Status,
    long? SizeBytes = null, string? Sha256 = null, string Verification = "NotVerified",
    string? ErrorCode = null, string? Message = null, string? ApplicationVersion = null);
public sealed record BackupPage(bool Enabled, string Message, string Database, string Environment,
    IReadOnlyList<BackupRecord> Items, int Page, int PageSize, int TotalItems);
public sealed record BackupFileResult(long SizeBytes, string Sha256);
public interface IDatabaseBackupExecutor
{
    string Database { get; }
    Task<BackupFileResult> ExecuteAsync(string path, int timeoutSeconds, CancellationToken ct);
}
public sealed class BackupBusyException : Exception;
public sealed class BackupUnavailableException(string message) : Exception(message);

/// <summary>Private JSON manifests survive a database restore. No files are served by HTTP.</summary>
public sealed class DatabaseBackupService(BackupOptions options, IDatabaseBackupExecutor executor,
    TimeProvider clock, ILogger<DatabaseBackupService> logger, string environment, string publicDirectory)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { WriteIndented = true };
    private const string Interrupted = "Tác vụ bị gián đoạn; chưa xác nhận bản sao hoàn tất. Người kỹ thuật cần kiểm tra.";

    public async Task<BackupPage> ListAsync(int page = 1, int pageSize = 10)
    {
        if (page < 1 || pageSize is not (10 or 20 or 50)) throw new ArgumentException("Phân trang không hợp lệ.");
        if (!options.Enabled) return new(false, "Chưa bật sao lưu. Người kỹ thuật cần cấu hình thư mục riêng tư và quyền SQL.", executor.Database, environment, [], 1, pageSize, 0);
        Prepare();
        // A crashed process releases the OS lock; do not leave its manifests permanently Running.
        using (var recoveryLock = TryLock())
            if (recoveryLock is not null) await RecoverInterruptedAsync();
        var items = await ReadAllAsync();
        page = Math.Min(page, Math.Max(1, (int)Math.Ceiling(items.Count / (double)pageSize)));
        return new(true, "Sao lưu CSDL; không bao gồm nội dung tệp R2/Drive. Kiểm tra checksum chưa phải thử phục hồi.",
            executor.Database, environment, items.Skip((page - 1) * pageSize).Take(pageSize).ToArray(), page, pageSize, items.Count);
    }

    public async Task<BackupRecord> CreateAsync(string actor, CancellationToken ct = default)
    {
        if (!options.Enabled) throw new BackupUnavailableException("Chưa bật chức năng sao lưu trên máy chủ.");
        if (string.IsNullOrWhiteSpace(actor)) throw new UnauthorizedAccessException();
        Prepare();
        using var gate = TryLock() ?? throw new BackupBusyException();
        await RecoverInterruptedAsync();
        var now = clock.GetUtcNow();
        var id = $"{now:yyyyMMddTHHmmssfff}_{Guid.NewGuid():N}";
        var record = new BackupRecord(id, $"backup_{id}.bak", executor.Database, environment, actor, now, null, "Running",
            ApplicationVersion: typeof(DatabaseBackupService).Assembly.GetName().Version?.ToString());
        // Persist before touching SQL. If this fails, no untracked backup is launched.
        await SaveAsync(record);
        try
        {
            var result = await executor.ExecuteAsync(Path.Combine(options.Directory, record.FileName), options.TimeoutSeconds, ct);
            record = record with { Status = "Succeeded", FinishedAt = clock.GetUtcNow(), SizeBytes = result.SizeBytes,
                Sha256 = result.Sha256, Verification = "SqlChecksumVerified",
                Message = "Đã tạo và kiểm tra bản sao bằng SQL checksum; chưa thử phục hồi." };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database backup {BackupId} failed", id);
            record = record with { Status = "Failed", FinishedAt = clock.GetUtcNow(), ErrorCode = "BackupFailed",
                Message = "Không hoàn tất sao lưu/kiểm tra. Người kỹ thuật cần kiểm tra quyền SQL, thư mục, dung lượng và nhật ký theo mã tác vụ." };
        }
        await SaveAsync(record);
        return record;
    }

    private void Prepare()
    {
        if (options.TimeoutSeconds is < 30 or > 3600 || string.IsNullOrWhiteSpace(executor.Database))
            throw new BackupUnavailableException("Cấu hình CSDL hoặc thời gian chờ sao lưu không hợp lệ.");
        foreach (var directory in new[] { options.Directory, options.ManifestDirectory })
        {
            if (string.IsNullOrWhiteSpace(directory) || !Path.IsPathFullyQualified(directory))
                throw new BackupUnavailableException("Cần cấu hình đường dẫn tuyệt đối cho thư mục sao lưu và nhật ký riêng tư.");
            var full = Path.GetFullPath(directory);
            if (Within(full, publicDirectory) || Within(publicDirectory, full))
                throw new BackupUnavailableException("Thư mục sao lưu/nhật ký không được nằm trong hoặc bao trùm thư mục public.");
            // A configured symlink could otherwise make a private-looking path public.
            for (var current = new DirectoryInfo(full); current is not null; current = current.Parent)
                if (current.Exists && (current.Attributes & FileAttributes.ReparsePoint) != 0)
                    throw new BackupUnavailableException("Thư mục sao lưu không được đi qua symlink/junction.");
            System.IO.Directory.CreateDirectory(full);
        }
    }

    private static bool Within(string child, string parent)
    {
        var comparison = OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
        var normalized = Path.TrimEndingDirectorySeparator(Path.GetFullPath(parent));
        return string.Equals(Path.TrimEndingDirectorySeparator(Path.GetFullPath(child)), normalized, comparison)
            || Path.GetFullPath(child).StartsWith(normalized + Path.DirectorySeparatorChar, comparison);
    }

    private FileStream? TryLock()
    {
        try { return new(Path.Combine(options.ManifestDirectory, ".backup.lock"), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None); }
        catch (IOException ex) when ((ex.HResult & 0xFFFF) is 32 or 33 or 11) { return null; }
    }

    private async Task<List<BackupRecord>> ReadAllAsync()
    {
        var result = new List<BackupRecord>();
        foreach (var file in System.IO.Directory.EnumerateFiles(options.ManifestDirectory, "backup_*.json").OrderDescending())
        {
            using var stream = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
            var record = await JsonSerializer.DeserializeAsync<BackupRecord>(stream, Json)
                ?? throw new IOException("Không đọc được nhật ký sao lưu.");
            if (Path.GetFileName(file) != $"backup_{record.Id}.json" ||
                !System.Text.RegularExpressions.Regex.IsMatch(record.Id, @"^\d{8}T\d{9}_[a-f0-9]{32}$"))
                throw new IOException("Nhật ký sao lưu không hợp lệ.");
            result.Add(record);
        }
        return result;
    }

    private async Task RecoverInterruptedAsync()
    {
        foreach (var record in (await ReadAllAsync()).Where(x => x.Status == "Running"))
            await SaveAsync(record with { Status = "Failed", FinishedAt = clock.GetUtcNow(), ErrorCode = "Interrupted", Message = Interrupted });
    }

    private async Task SaveAsync(BackupRecord record)
    {
        var file = Path.Combine(options.ManifestDirectory, $"backup_{record.Id}.json");
        var temp = file + ".tmp";
        await File.WriteAllTextAsync(temp, JsonSerializer.Serialize(record, Json));
        File.Move(temp, file, true);
    }
}
