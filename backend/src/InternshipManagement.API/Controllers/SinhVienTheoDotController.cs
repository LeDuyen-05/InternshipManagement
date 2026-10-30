using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.DTOs.SinhVienTheoDot;
using InternshipManagement.BLL.Services.SinhVienTheoDot;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/khoa/sinh-vien-theo-dot"), Authorize(Roles = Roles.Khoa)]
public class SinhVienTheoDotController(SinhVienTheoDotService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string maDot) => Ok(await service.GetAsync(maDot));

    [HttpPost]
    public async Task<IActionResult> Add(ThemSinhVienTheoDotRequest request) => Ok(new
    {
        soLuongThem = await service.AddAsync(request, User.MaTaiKhoan() ?? throw new UnauthorizedAccessException())
    });

    [HttpDelete("{maSV}")]
    public async Task<IActionResult> Remove(string maSV, [FromQuery] string maDot)
    {
        await service.RemoveAsync(maDot, maSV, User.MaTaiKhoan() ?? throw new UnauthorizedAccessException());
        return Ok(new { message = "Đã gỡ SV khỏi danh sách do Khoa thêm. Bản ghi lịch sử vẫn được giữ." });
    }

    [HttpGet("cong-ty-bo-tri")]
    public async Task<IActionResult> Companies([FromQuery] string maDot) => Ok(await service.GetCompaniesForInitialAllocationAsync(maDot));

    [HttpPost("{maSV}/bo-tri")]
    public async Task<IActionResult> InitialAllocate(string maSV, BoTriBanDauRequest request) => Ok(new
    {
        maPhanBo = await service.InitialAllocateAsync(maSV, request, User.MaTaiKhoan() ?? throw new UnauthorizedAccessException()),
        message = "Đã bố trí nơi thực tập ban đầu; sinh viên sẵn sàng để Khoa phân công GVHD."
    });
}
