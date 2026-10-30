using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.SinhVienTheoDot;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/khoa/ra-soat-noi"), Authorize(Roles = Roles.Khoa)]
public class RaSoatNoiController(RaSoatNoiService service) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> Get([FromQuery] string maDot) => Ok(await service.GetAsync(maDot));
    [HttpPut("{maSV}")] public async Task<IActionResult> Confirm(string maSV, [FromQuery] string maDot, GhiNhanChuaCoNoiRequest request)
    {
        await service.ConfirmAsync(maDot, maSV, request, User.MaTaiKhoan() ?? throw new UnauthorizedAccessException());
        return Ok(new { message = request.ThuHoi ? "Đã thu hồi xác nhận, giữ lịch sử." : "Đã ghi nhận Không hoàn tất vì chưa có nơi; giữ lịch sử, không gán điểm 0." });
    }
}
