using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.DTOs.DangKyThucTap;
using InternshipManagement.BLL.Services.DangKyThucTap;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DangKyThucTapController : ControllerBase
{
    private readonly IDangKyThucTapService _service;
    private readonly IResourceAccess _access;

    public DangKyThucTapController(IDangKyThucTapService service, IResourceAccess access)
    {
        _service = service;
        _access = access;
    }

    [HttpGet("sinhvien/{maSV}")]
    public async Task<IActionResult> GetBySinhVien(string maSV)
    {
        if (!await _access.CanAccessStudentAsync(User, maSV)) return Forbid();
        var list = await _service.GetDanhSachDangKyBySinhVienAsync(maSV);
        return Ok(list);
    }

    [HttpPost]
    [Authorize(Roles = Roles.SinhVien)]
    public async Task<IActionResult> DangKy([FromBody] CreateDangKyThucTapRequest request)
    {
        request.MaSV = User.MaSV() ?? throw new UnauthorizedAccessException();
        var result = await _service.DangKyNguyenVongAsync(request);
        return Ok(new { success = true, data = result, message = "Đăng ký nguyện vọng thực tập thành công!" });
    }

    [HttpDelete("{maDK}")]
    [Authorize(Roles = $"{Roles.SinhVien},{Roles.Khoa}")]
    public async Task<IActionResult> HuyDangKy(string maDK)
    {
        var success = await _service.HuyDangKyAsync(maDK, User.MaSV(), User.IsStaff());
        if (!success)
            return NotFound(new { success = false, message = "Không tìm thấy mã đăng ký này." });

        return Ok(new { success = true, message = "Hủy đăng ký nguyện vọng thành công." });
    }
}
