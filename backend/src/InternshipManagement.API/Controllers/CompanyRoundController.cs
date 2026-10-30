using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/khoa/cong-ty-theo-dot"), Authorize(Roles = Roles.Khoa)]
public class CompanyRoundController(CompanyRoundService service) : ControllerBase
{
    [HttpPut("{maDot}/{maCongTy}/gv-gioi-thieu")]
    public async Task<IActionResult> Lecturer(string maDot, string maCongTy, ConfirmRoundLecturerRequest request)
    {
        await service.ConfirmLecturerAsync(maDot, maCongTy, request, User.MaTaiKhoan() ?? "");
        return Ok(new { message = "Đã ghi nhận GV đầu mối do Khoa xác nhận trong đúng đợt; không thay GVHD đã phân công." });
    }
    [HttpGet("lich-su")]
    public async Task<IActionResult> History([FromQuery] string maDot) => Ok(await service.HistoryAsync(maDot));
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string maDot) => Ok(await service.GetAsync(maDot));
    [HttpPut("{maDot}/{maCongTy}")]
    public async Task<IActionResult> Save(string maDot, string maCongTy, SaveCompanyRoundRequest request)
    {
        await service.SaveAsync(maDot, maCongTy, request, User.MaTaiKhoan() ?? "");
        return Ok(new { message = "Đã lưu công ty/vị trí/chỉ tiêu và thời hạn trong đợt." });
    }
}

[ApiController, Route("api/doanh-nghiep-theo-dot"), Authorize(Roles = Roles.DaiDienDN)]
public class EnterpriseCompanyRoundController(CompanyRoundService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? maDot)
    {
        if (string.IsNullOrWhiteSpace(maDot)) return BadRequest(new { message = "Chọn đợt thực tập." });
        return Ok(await service.ForRepresentativeAsync(User.MaDaiDien(), maDot.Trim()));
    }
}
