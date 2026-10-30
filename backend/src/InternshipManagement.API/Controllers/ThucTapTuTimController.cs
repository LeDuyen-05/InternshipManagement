using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.DTOs.ThucTapTuTim;
using InternshipManagement.BLL.Services.ThucTapTuTim;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController]
[Route("api/ThucTapTuTim")]
public class ThucTapTuTimController(ThucTapTuTimService service) : ControllerBase
{
    [HttpGet("cua-toi")]
    [Authorize(Roles = Roles.SinhVien)]
    public async Task<IActionResult> Mine([FromQuery] string maDot) =>
        Ok(await service.GetMineAsync(User.MaSV() ?? throw new UnauthorizedAccessException(), maDot));

    [HttpPost]
    [Authorize(Roles = Roles.SinhVien)]
    public async Task<IActionResult> Submit(GuiHoSoTuTimRequest request) =>
        Ok(await service.SubmitAsync(User.MaSV() ?? throw new UnauthorizedAccessException(), request));

    [HttpGet("khoa")]
    [Authorize(Roles = Roles.Khoa)]
    public async Task<IActionResult> Faculty([FromQuery] string? maDot) => Ok(await service.GetForFacultyAsync(maDot));

    [HttpPut("{maHoSo}/duyet")]
    [Authorize(Roles = Roles.Khoa)]
    public async Task<IActionResult> Review(string maHoSo, DuyetHoSoTuTimRequest request) =>
        Ok(await service.ReviewAsync(maHoSo, User.MaTaiKhoan() ?? throw new UnauthorizedAccessException(), request));
}
