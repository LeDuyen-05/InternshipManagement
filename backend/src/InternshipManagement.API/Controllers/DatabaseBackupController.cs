using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/admin/backups"), Authorize(Roles = "QuanTriVien")]
public sealed class DatabaseBackupController(DatabaseBackupService service, IHostApplicationLifetime lifetime,
    ILogger<DatabaseBackupController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(int page = 1, int pageSize = 10)
        => await Execute(async () => Ok(await service.ListAsync(page, pageSize)));

    [HttpPost]
    public async Task<IActionResult> Create()
        => await Execute(async () =>
        {
            // Disconnecting the browser must not cancel a server backup mid-flight.
            var result = await service.CreateAsync(User.MaTaiKhoan() ?? "", lifetime.ApplicationStopping);
            return result.Status == "Succeeded" ? Ok(result) : StatusCode(500, new { message = result.Message, backup = result });
        });

    private async Task<IActionResult> Execute(Func<Task<IActionResult>> operation)
    {
        try { return await operation(); }
        catch (BackupBusyException) { return Conflict(new { message = "Đang có tác vụ sao lưu. Hãy làm mới danh sách để theo dõi." }); }
        catch (BackupUnavailableException ex) { return StatusCode(503, new { message = ex.Message }); }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or System.Text.Json.JsonException)
        {
            logger.LogError(ex, "Backup storage/manifest unavailable");
            return StatusCode(503, new { message = "Không truy cập được nơi lưu hoặc nhật ký sao lưu. Người kỹ thuật cần kiểm tra cấu hình/quyền; chưa xác nhận kết quả." });
        }
    }
}
