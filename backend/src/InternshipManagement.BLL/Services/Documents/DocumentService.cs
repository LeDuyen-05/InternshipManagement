using System.Data;
using System.Security.Cryptography;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.Documents;

public record DocumentDto(string Id, string Kind, string ResourceId, string FileName, string ContentType, long Size, string Sha256, DateTimeOffset CreatedAt);
public class DocumentService(AppDbContext db, DocumentAccessService access, IDocumentObjectStore store, DocumentStorageOptions options, TimeProvider clock)
{
    private static DocumentDto Dto(StoredDocument d) => new(d.Id, d.Kind, d.ResourceId, d.FileName, d.ContentType, d.Size, d.Sha256, d.CreatedAt);
    private void Enabled() { options.Validate(); if (!options.Enabled) throw new DocumentStorageUnavailableException(); }
    private async Task<DocumentResource> LockedResource(string kind, string id, DocumentActor actor)
    {
        var resource = await access.RequireAsync(kind, id, actor, true);
        if (resource.RoundId != null) await db.LockRoundsAsync(new[] { resource.RoundId });
        return await access.RequireAsync(kind, id, actor, true);
    }
    public async Task<object> ListAsync(string kind, string id, DocumentActor actor)
    {
        await access.RequireAsync(kind, id, actor, false);
        return await db.StoredDocuments.AsNoTracking().Where(x => x.Kind == kind && x.ResourceId == id && x.State == "Ready")
            .OrderByDescending(x => x.CreatedAt).ThenBy(x => x.Id)
            .Select(x => new DocumentDto(x.Id, x.Kind, x.ResourceId, x.FileName, x.ContentType, x.Size, x.Sha256, x.CreatedAt)).ToListAsync();
    }
    public async Task<DocumentDto> UploadAsync(string kind, string id, string requestId, string filename, Stream input, DocumentActor actor, CancellationToken ct)
    {
        await access.RequireAsync(kind, id, actor, true); Enabled();
        if (!Guid.TryParse(requestId, out var parsed)) throw new ArgumentException("Thiếu mã yêu cầu tải tệp.");
        using var body = new MemoryStream(); var buffer = new byte[81920]; int n;
        while ((n = await input.ReadAsync(buffer, ct)) > 0) {
            if (body.Length + n > options.MaxFileMb * 1024L * 1024) throw new ArgumentException("Tệp vượt dung lượng cho phép.");
            await body.WriteAsync(buffer.AsMemory(0, n), ct);
        }
        var bytes = body.ToArray(); var content = DocumentContent.Validate(filename, bytes, kind, options.MaxFileMb);
        var request = parsed.ToString("N"); StoredDocument record;
        await using (var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct) : null) {
            var resource = await LockedResource(kind, id, actor);
            var previous = await db.StoredDocuments.SingleOrDefaultAsync(x => x.ActorId == actor.Id && x.RequestId == request, ct);
            if (previous != null) {
                if (previous.Kind != kind || previous.ResourceId != id || previous.Sha256 != content.Hash || previous.FileName != content.Name) throw new ArgumentException("Mã yêu cầu đã dùng cho tệp/hồ sơ khác.");
                if (previous.StorageId != options.StorageId) throw new InvalidOperationException("Kho lưu đã thay đổi; quản trị cần đối chiếu dữ liệu trước khi thử lại.");
                if (previous.CleanedAt != null) throw new ArgumentException("Tệp tạm đã được dọn. Chọn lại tệp để tạo yêu cầu mới.");
                if (previous.State == "Ready") return Dto(previous);
                if (previous.State == "Uploading") throw new DbUpdateConcurrencyException();
                if (await db.StoredDocuments.CountAsync(x => x.Kind == kind && x.ResourceId == id && x.State != "Failed", ct) >= options.MaxFilesPerResource)
                    throw new InvalidOperationException("Hồ sơ đã đạt giới hạn số tệp.");
                record = previous; record.State = "Uploading"; record.LastAttemptAt = clock.GetUtcNow();
            } else {
                if (await db.StoredDocuments.CountAsync(x => x.Kind == kind && x.ResourceId == id && x.State != "Failed", ct) >= options.MaxFilesPerResource)
                    throw new InvalidOperationException("Hồ sơ đã đạt giới hạn số tệp; liên hệ quản trị, không xóa lịch sử để tải thêm.");
                record = new StoredDocument { Id = Guid.NewGuid().ToString("N"), Kind = kind, ResourceId = id, RoundId = resource.RoundId,
                    ActorId = actor.Id, RequestId = request, ObjectKey = "internship/" + Guid.NewGuid().ToString("N"), FileName = content.Name,
                    ContentType = content.Mime, Size = bytes.Length, Sha256 = content.Hash, StorageId = options.StorageId, CreatedAt = clock.GetUtcNow(), LastAttemptAt = clock.GetUtcNow() };
                db.StoredDocuments.Add(record);
            }
            await db.SaveChangesAsync(ct); if (tx != null) await tx.CommitAsync(ct);
        }
        try {
            await store.PutAsync(record.ObjectKey, bytes, content.Mime, ct);
            await FinalizeAsync(record, actor, ct);
            return Dto(record);
        } catch {
            // Never delete a committed historical file if commit succeeded but response was lost.
            var committed = await db.StoredDocuments.AsNoTracking().SingleOrDefaultAsync(x => x.Id == record.Id && x.State == "Ready", CancellationToken.None);
            if (committed != null) return Dto(committed);
            try { using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(10)); await store.DeleteTemporaryAsync(record.ObjectKey, cleanup.Token); } catch { /* Failed metadata retains key for operator reconciliation. */ }
            await db.Entry(record).ReloadAsync(CancellationToken.None);
            record.State = "Failed";
            await db.SaveChangesAsync(CancellationToken.None);
            throw new InvalidOperationException("Chưa lưu được tệp vào hồ sơ. Hãy tải lại kiểm tra rồi thử lại; không coi đây là đã nộp báo cáo hoặc đã chấm điểm.");
        }
    }
    private async Task FinalizeAsync(StoredDocument d, DocumentActor a, CancellationToken ct)
    {
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct) : null;
        await LockedResource(d.Kind, d.ResourceId, a);
        d.State = "Ready"; d.ReadyAt = clock.GetUtcNow(); await db.SaveChangesAsync(ct);
        if (tx != null) await tx.CommitAsync(ct);
    }
    public async Task<(DocumentDto Metadata, byte[] Bytes)> DownloadAsync(string id, DocumentActor actor, CancellationToken ct)
    {
        var document = await db.StoredDocuments.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id && x.State == "Ready", ct) ?? throw new KeyNotFoundException("Không tìm thấy tệp đã gắn hồ sơ.");
        await access.RequireAsync(document.Kind, document.ResourceId, actor, false);
        Enabled();
        if (document.StorageId != options.StorageId) throw new InvalidOperationException("Tệp thuộc kho lưu khác cấu hình hiện tại; liên hệ quản trị đối chiếu trước khi tải.");
        var bytes = await store.GetAsync(document.ObjectKey, document.Size, ct);
        if (bytes.LongLength != document.Size || Convert.ToHexString(SHA256.HashData(bytes)) != document.Sha256) throw new InvalidOperationException("Nội dung tệp không khớp checksum; liên hệ quản trị kiểm tra.");
        await access.RequireAsync(document.Kind, document.ResourceId, actor, false);
        return (Dto(document), bytes);
    }
    public async Task<object> PendingAsync(DocumentActor actor)
    {
        if (actor.Role != "QuanTriVien") throw new UnauthorizedAccessException();
        var cutoff = clock.GetUtcNow().AddHours(-24);
        return await db.StoredDocuments.AsNoTracking().Where(x => x.State != "Ready" && x.LastAttemptAt < cutoff && x.CleanedAt == null)
            .OrderBy(x => x.CreatedAt).Select(x => new { x.Id, x.Kind, x.ResourceId, x.State, x.FileName, x.CreatedAt }).ToListAsync();
    }
    public async Task CleanupAsync(string id, DocumentActor actor, CancellationToken ct)
    {
        if (actor.Role != "QuanTriVien") throw new UnauthorizedAccessException(); Enabled();
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct) : null;
        var doc = await db.StoredDocuments.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        if (doc.State == "Ready" || doc.LastAttemptAt >= clock.GetUtcNow().AddHours(-24) || doc.StorageId != options.StorageId || doc.CleanedAt != null)
            throw new InvalidOperationException("Chỉ dọn tệp tạm/lỗi quá 24 giờ của đúng kho; không xóa tệp đã gắn hồ sơ.");
        await store.DeleteTemporaryAsync(doc.ObjectKey, ct);
        doc.State = "Failed"; doc.CleanedAt = clock.GetUtcNow(); doc.CleanedBy = actor.Id;
        await db.SaveChangesAsync(ct); if (tx != null) await tx.CommitAsync(ct);
    }
    public async Task<object> ManifestAsync(DocumentActor actor)
    {
        if (actor.Role != "QuanTriVien") throw new UnauthorizedAccessException();
        return await db.StoredDocuments.AsNoTracking().Where(x => x.State == "Ready").OrderBy(x => x.Id)
            .Select(x => new { x.Id, x.Kind, x.ResourceId, x.RoundId, x.StorageId, x.ObjectKey, x.FileName, x.Size, x.Sha256, x.ReadyAt }).ToListAsync();
    }
}
