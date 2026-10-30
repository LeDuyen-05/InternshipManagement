using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/thoi-han"), Authorize(Roles = "Khoa,GiangVien,DaiDienDN,SinhVien,QuanTriVien")]
public class ThoiHanController(ThoiHanService service) : ControllerBase
{
    [HttpGet("{maDot}/bao-cao"), Authorize(Roles = "Khoa")]
    public async Task<IActionResult> Reports(string maDot) => Ok(await service.ReportsAsync(maDot));

    [HttpPut("bao-cao/{id}/mo-lai"), Authorize(Roles = "Khoa")]
    public async Task<IActionResult> Reopen(string id, ReopenProgressRequest request)
    {
        await service.ReopenAsync(id, request, User.MaTaiKhoan() ?? "");
        return Ok(new { message = "Đã mở hạn nộp bổ sung cho đúng sinh viên và mốc báo cáo." });
    }
    [HttpGet("{maDot}")]
    public async Task<IActionResult> Get(string maDot) => Ok(await service.GetAsync(maDot));

    [HttpPut("{maDot}"), Authorize(Roles = "Khoa")]
    public async Task<IActionResult> Save(string maDot, SaveGradingDeadlineRequest request)
    {
        await service.SaveAsync(maDot, request, User.MaTaiKhoan() ?? "");
        return Ok(await service.GetAsync(maDot));
    }

    [HttpGet("{maDot}/lich-su"), Authorize(Roles = "Khoa")]
    public async Task<IActionResult> History(string maDot) => Ok(await service.HistoryAsync(maDot));
}
