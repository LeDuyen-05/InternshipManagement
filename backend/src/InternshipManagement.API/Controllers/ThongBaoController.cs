using InternshipManagement.BLL.DTOs.Admin;
using InternshipManagement.BLL.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/thong-bao"), Authorize]
public class ThongBaoController(AdminService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetNotifications()
    {
        return Ok(await service.NotificationsAsync());
    }

    [HttpPost, Authorize(Roles = "Khoa")]
    public async Task<IActionResult> SendNotification([FromBody] SendNotificationRequest r)
    {
        await service.SendNotificationAsync(r, User.FindFirst("sub")?.Value);
        return Ok(new { success = true, message = "Gửi thông báo thành công." });
    }
}
