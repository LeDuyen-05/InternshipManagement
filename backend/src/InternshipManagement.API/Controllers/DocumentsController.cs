using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.Documents;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/documents"), Authorize]
public class DocumentsController(DocumentService service, DocumentAccessService access, DocumentStorageOptions options) : ControllerBase
{
    private DocumentActor Actor => new(User.MaTaiKhoan() ?? throw new UnauthorizedAccessException(),
        new[] { Roles.Khoa, Roles.QuanTriVien, Roles.SinhVien, Roles.GiangVien, Roles.DaiDienDN }.SingleOrDefault(User.IsInRole) ?? throw new UnauthorizedAccessException(),
        User.MaSV(), User.MaGV(), User.MaDaiDien());
    [HttpGet("capabilities")]
    public IActionResult Capabilities()
    {
        Response.Headers.CacheControl = "private, no-store";
        return Ok(new { options.Enabled, options.MaxFileMb, cvMaxMb = Math.Min(5, options.MaxFileMb), options.MaxFilesPerResource, kinds = DocumentAccessService.KindsFor(Actor.Role) });
    }
    [HttpGet("operations/pending"), Authorize(Roles = Roles.QuanTriVien)]
    public async Task<IActionResult> Pending() => Ok(await service.PendingAsync(Actor));
    [HttpPost("operations/{id}/cleanup"), Authorize(Roles = Roles.QuanTriVien)]
    public async Task<IActionResult> Cleanup(string id, CancellationToken ct) { await service.CleanupAsync(id, Actor, ct); return Ok(new { message = "Đã dọn tệp tạm/lỗi; giữ metadata và dấu người thực hiện." }); }
    [HttpGet("operations/manifest"), Authorize(Roles = Roles.QuanTriVien)]
    public async Task<IActionResult> Manifest() {
        Response.Headers.CacheControl = "private, no-store";
        return File(System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(new { exportedAt = DateTimeOffset.UtcNow, objects = await service.ManifestAsync(Actor), note = "Metadata only; object bytes require separate private backup." }), "application/json", "r2-object-manifest.json");
    }
    [HttpGet("resources")]
    public async Task<IActionResult> Resources(string kind, string? maDot, string? search, int page = 1) => Ok(await access.ResourcesAsync(kind, maDot, search, page, Actor));
    [HttpGet]
    public async Task<IActionResult> List(string kind, string resourceId)
    {
        try
        {
            return Ok(await service.ListAsync(kind, resourceId, Actor));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
    }
    [HttpGet("permission")]
    public async Task<IActionResult> Permission(string kind, string resourceId)
    {
        try
        {
            await access.RequireAsync(kind, resourceId, Actor, false);
            try { await access.RequireAsync(kind, resourceId, Actor, true); return Ok(new { canUpload = options.Enabled, maxFileMb = kind == "CV" ? Math.Min(5, options.MaxFileMb) : options.MaxFileMb, reason = options.Enabled ? "" : "Kho R2 chưa được cấu hình." }); }
            catch (Exception e) when (e is UnauthorizedAccessException or InvalidOperationException) { return Ok(new { canUpload = false, reason = "Bạn chỉ được xem hoặc hồ sơ/đợt đang khóa, quá hạn." }); }
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
    }
    [HttpPost, RequestSizeLimit(11 * 1024 * 1024), RequestFormLimits(MultipartBodyLengthLimit = 11 * 1024 * 1024)]
    public async Task<IActionResult> Upload([FromForm] string kind, [FromForm] string resourceId, [FromForm] string requestId, IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0) return BadRequest(new { message = "Chọn tệp không rỗng." });
        await using var stream = file.OpenReadStream();
        return Ok(await service.UploadAsync(kind, resourceId, requestId, file.FileName, stream, Actor, ct));
    }
    [HttpGet("{id}/download")]
    public async Task<IActionResult> Download(string id, CancellationToken ct)
    {
        var result = await service.DownloadAsync(id, Actor, ct);
        Response.Headers.CacheControl = "private, no-store"; Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(result.Bytes, result.Metadata.ContentType, result.Metadata.FileName);
    }
}
