using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;

namespace InternshipManagement.BLL.Services.Documents;

public class DocumentStorageOptions
{
    public bool Enabled { get; set; }
    public string Provider { get; set; } = "R2";
    public string LocalPath { get; set; } = "App_Data/uploads";
    public string Endpoint { get; set; } = "";
    public string Bucket { get; set; } = "";
    public string AccessKeyId { get; set; } = "";
    public string SecretAccessKey { get; set; } = "";
    public int MaxFileMb { get; set; } = 10;
    public int MaxFilesPerResource { get; set; } = 20;

    public bool IsLocal => string.Equals(Provider, "Local", StringComparison.OrdinalIgnoreCase);

    public string StorageId => IsLocal
        ? "LOCAL_STORAGE"
        : Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(Endpoint.TrimEnd('/').ToLowerInvariant() + "/" + Bucket)));

    public void Validate()
    {
        if (MaxFileMb is < 1 or > 10 || MaxFilesPerResource is < 1 or > 100) throw new InvalidOperationException("Giới hạn kho tệp không hợp lệ.");
        if (!Enabled) return;
        if (IsLocal) return;
        if (!string.Equals(Provider, "R2", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Loại kho tệp chưa được hỗ trợ.");

        if (!Uri.TryCreate(Endpoint, UriKind.Absolute, out var uri) || uri.Scheme != "https" || uri.Port != 443
            || !System.Text.RegularExpressions.Regex.IsMatch(uri.Host, "^[a-fA-F0-9]{32}\\.r2\\.cloudflarestorage\\.com$")
            || uri.AbsolutePath != "/" || !string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.UserInfo)
            || !System.Text.RegularExpressions.Regex.IsMatch(Bucket, "^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$")
            || string.IsNullOrWhiteSpace(AccessKeyId) || string.IsNullOrWhiteSpace(SecretAccessKey))
            throw new InvalidOperationException("Cấu hình R2 chưa hợp lệ; kiểm tra endpoint, bucket và khóa tại backend.");
    }
}

public interface IDocumentObjectStore
{
    Task PutAsync(string key, byte[] bytes, string contentType, CancellationToken ct);
    Task<byte[]> GetAsync(string key, long expectedSize, CancellationToken ct);
    Task<byte[]> GetLegacyLocalAsync(string key, long expectedSize, CancellationToken ct)
        => throw new InvalidOperationException("Kho lưu hiện tại không hỗ trợ đọc tệp cũ trên máy.");
    Task DeleteTemporaryAsync(string key, CancellationToken ct);
}

public sealed class R2ObjectStore(DocumentStorageOptions options) : IDocumentObjectStore
{
    // Read historical local objects only when their metadata explicitly identifies LOCAL_STORAGE.
    // Writes and cleanup continue using the active provider; no metadata or object migration here.
    public Task<byte[]> GetLegacyLocalAsync(string key, long expectedSize, CancellationToken ct)
    {
        options.Validate();
        if (!options.Enabled) throw new InvalidOperationException("Kho tệp chưa được cấu hình.");
        return new R2ObjectStore(new DocumentStorageOptions {
            Enabled = true, Provider = "Local", LocalPath = options.LocalPath,
            MaxFileMb = options.MaxFileMb, MaxFilesPerResource = options.MaxFilesPerResource
        }).GetAsync(key, expectedSize, ct);
    }

    private static string LocalFile(string root, string key)
    {
        if (string.IsNullOrWhiteSpace(key) || key.Contains('\\') || key.Split('/').Any(x => x is "" or "." or ".."))
            throw new ArgumentException("Mã tệp không hợp lệ.", nameof(key));
        var basePath = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
        var path = Path.GetFullPath(Path.Combine(basePath, key.Replace('/', Path.DirectorySeparatorChar)));
        if (!path.StartsWith(basePath, OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal))
            throw new ArgumentException("Mã tệp không hợp lệ.", nameof(key));
        return path;
    }

    private string ResolveBasePath()
    {
        var localPath = string.IsNullOrWhiteSpace(options.LocalPath) ? "App_Data/uploads" : options.LocalPath;
        if (Path.IsPathRooted(localPath)) return localPath;

        var cwd = Path.Combine(Directory.GetCurrentDirectory(), localPath);
        if (Directory.Exists(cwd)) return cwd;

        return Path.Combine(AppContext.BaseDirectory, localPath);
    }

    private AmazonS3Client Client()
    {
        options.Validate();
        if (!options.Enabled) throw new InvalidOperationException("Kho tệp chưa được cấu hình.");
        return new(new BasicAWSCredentials(options.AccessKeyId, options.SecretAccessKey), new AmazonS3Config {
            ServiceURL = options.Endpoint, AuthenticationRegion = "auto", ForcePathStyle = true,
            Timeout = TimeSpan.FromSeconds(60), MaxErrorRetry = 1 });
    }

    public async Task PutAsync(string key, byte[] bytes, string contentType, CancellationToken ct)
    {
        options.Validate();
        if (!options.Enabled) throw new InvalidOperationException("Kho tệp chưa được cấu hình.");

        if (options.IsLocal)
        {
            var fullPath = LocalFile(ResolveBasePath(), key);
            var dir = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }
            await File.WriteAllBytesAsync(fullPath, bytes, ct);
            return;
        }

        using var client = Client();
        using var stream = new MemoryStream(bytes, false);
        await client.PutObjectAsync(new PutObjectRequest { BucketName = options.Bucket, Key = key, InputStream = stream,
            ContentType = contentType, DisablePayloadSigning = true, DisableDefaultChecksumValidation = true, AutoCloseStream = false }, ct);
    }

    public async Task<byte[]> GetAsync(string key, long expectedSize, CancellationToken ct)
    {
        options.Validate();
        if (!options.Enabled) throw new InvalidOperationException("Kho tệp chưa được cấu hình.");

        if (options.IsLocal)
        {
            var fullPath = LocalFile(ResolveBasePath(), key);
            if (!File.Exists(fullPath))
            {
                var localPath = string.IsNullOrWhiteSpace(options.LocalPath) ? "App_Data/uploads" : options.LocalPath;
                var alt1 = LocalFile(Path.Combine(AppContext.BaseDirectory, localPath), key);
                var alt2 = LocalFile(Path.Combine(Directory.GetCurrentDirectory(), localPath), key);
                if (File.Exists(alt1)) fullPath = alt1;
                else if (File.Exists(alt2)) fullPath = alt2;
                else throw new FileNotFoundException("Tệp không tồn tại trên kho lưu trữ.");
            }
            var bytes = await File.ReadAllBytesAsync(fullPath, ct);
            if (bytes.LongLength != expectedSize || expectedSize > options.MaxFileMb * 1024L * 1024)
                throw new InvalidOperationException("Kích thước tệp không khớp hồ sơ lưu.");
            return bytes;
        }

        using var client = Client();
        GetObjectResponse objectResponse;
        try { objectResponse = await client.GetObjectAsync(options.Bucket, key, ct); }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) {
            throw new FileNotFoundException("Không tìm thấy nội dung tệp trên kho lưu trữ. Vui lòng liên hệ Khoa để kiểm tra bản lưu.");
        }
        using var response = objectResponse;
        if (response.ContentLength != expectedSize || expectedSize > options.MaxFileMb * 1024L * 1024) throw new InvalidOperationException("Kích thước tệp không khớp hồ sơ lưu.");
        using var output = new MemoryStream();
        var buffer = new byte[81920];
        int n;
        while ((n = await response.ResponseStream.ReadAsync(buffer, ct)) > 0) {
            if (output.Length + n > expectedSize) throw new InvalidOperationException("Tệp vượt dung lượng đã ghi nhận.");
            await output.WriteAsync(buffer.AsMemory(0, n), ct);
        }
        if (output.Length != expectedSize) throw new InvalidOperationException("Nội dung tệp chưa đầy đủ.");
        return output.ToArray();
    }

    public async Task DeleteTemporaryAsync(string key, CancellationToken ct)
    {
        options.Validate();
        if (!options.Enabled) throw new InvalidOperationException("Kho tệp chưa được cấu hình.");
        if (options.IsLocal)
        {
            var fullPath = LocalFile(ResolveBasePath(), key);
            if (File.Exists(fullPath)) File.Delete(fullPath);
            var localPath = string.IsNullOrWhiteSpace(options.LocalPath) ? "App_Data/uploads" : options.LocalPath;
            var alt1 = LocalFile(Path.Combine(AppContext.BaseDirectory, localPath), key);
            if (File.Exists(alt1)) File.Delete(alt1);
            var alt2 = LocalFile(Path.Combine(Directory.GetCurrentDirectory(), localPath), key);
            if (File.Exists(alt2)) File.Delete(alt2);
            return;
        }

        using var client = Client();
        await client.DeleteObjectAsync(options.Bucket, key, ct);
    }
}
