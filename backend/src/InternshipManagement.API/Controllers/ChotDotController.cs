using System.Text;
using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/dot-thuc-tap/{maDot}/khoa"), Authorize]
public class TrangThaiKhoaDotController(ChotDotService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Status(string maDot) => Ok(await service.StatusAsync(maDot));
}

[ApiController, Route("api/khoa/chot-dot/{maDot}"), Authorize(Roles = "Khoa")]
public class ChotDotController(ChotDotService service) : ControllerBase
{
    private string Actor => User.MaTaiKhoan() ?? throw new UnauthorizedAccessException();
    [HttpGet]
    public async Task<IActionResult> Preview(string maDot) => Ok(await service.PreviewAsync(maDot));
    [HttpPost("chot")]
    public async Task<IActionResult> Close(string maDot, ChotDotRequest request)
    {
        await service.CloseAsync(maDot, request, Actor);
        return Ok(new { message = "Đã chốt điểm, lưu bản kết quả và khóa đợt." });
    }
    [HttpPost("mo-lai")]
    public async Task<IActionResult> Reopen(string maDot, MoLaiDotRequest request)
    {
        await service.ReopenAsync(maDot, request, Actor);
        return Ok(new { message = "Đã mở phạm vi điểm/báo cáo đến hạn chỉ định; cần rà soát và chốt lại." });
    }
    [HttpPut("sinh-vien/{maSV}/khong-hoan-tat")]
    public async Task<IActionResult> NonCompletion(string maDot, string maSV, KhongHoanTatRequest request)
    {
        await service.ConfirmNonCompletionAsync(maDot, maSV, request, Actor);
        return Ok(new { message = request.ThuHoi ? "Đã thu hồi xác nhận không hoàn tất." : "Đã xác nhận không hoàn tất; giữ lịch sử, không tự gán điểm 0." });
    }
    [HttpGet("lich-su")]
    public async Task<IActionResult> History(string maDot) => Ok(await service.HistoryAsync(maDot));
    [HttpGet("lich-su/{id}")]
    public async Task<IActionResult> Snapshot(string maDot, string id)
        => File(Encoding.UTF8.GetBytes(await service.SnapshotAsync(maDot, id)), "application/json; charset=utf-8", $"lich-su-chot-{maDot}-{id}.json");
}
