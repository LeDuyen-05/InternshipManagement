using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.DTOs.HoSoNangLuc;
using InternshipManagement.BLL.Services.HoSoNangLuc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HoSoNangLucController : ControllerBase
{
    private readonly IHoSoNangLucService _service;
    private readonly IResourceAccess _access;

    public HoSoNangLucController(IHoSoNangLucService service, IResourceAccess access)
    {
        _service = service;
        _access = access;
    }

    [HttpGet("sinhvien/{maSV}")]
    public async Task<IActionResult> GetBySinhVien(string maSV)
    {
        if (!await _access.CanAccessStudentAsync(User, maSV)) return Forbid();
        var result = await _service.GetHoSoBySinhVienAsync(maSV);
        if (result == null)
            return NotFound(new { message = $"Không tìm thấy hồ sơ của sinh viên {maSV}" });

        return Ok(result);
    }

    [HttpPut("sinhvien/{maSV}")]
    [Authorize(Roles = $"{Roles.SinhVien},{Roles.Khoa}")]
    public async Task<IActionResult> Update(string maSV, [FromBody] UpdateHoSoNangLucRequest request)
    {
        if (User.IsInRole(Roles.SinhVien) && !string.Equals(User.MaSV(), maSV, StringComparison.OrdinalIgnoreCase))
            return Forbid();

        var result = await _service.UpdateHoSoAsync(maSV, request, laKhoa: User.IsStaff());
        return Ok(new { success = true, data = result, message = "Cập nhật hồ sơ năng lực thành công" });
    }
}
