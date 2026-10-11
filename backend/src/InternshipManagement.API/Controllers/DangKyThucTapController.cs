using InternshipManagement.BLL.DTOs.DangKyThucTap;
using InternshipManagement.BLL.Exceptions;
using InternshipManagement.BLL.Services.DangKyThucTap;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DangKyThucTapController : ControllerBase
{
    private readonly IDangKyThucTapService _service;

    public DangKyThucTapController(IDangKyThucTapService service)
    {
        _service = service;
    }

    [HttpGet("sinhvien/{maSV}")]
    public async Task<IActionResult> GetBySinhVien(string maSV)
    {
        var list = await _service.GetDanhSachDangKyBySinhVienAsync(maSV);
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> DangKy([FromBody] CreateDangKyThucTapRequest request)
    {
        try
        {
            var result = await _service.DangKyNguyenVongAsync(request);
            return Ok(new { success = true, data = result, message = "Đăng ký nguyện vọng thực tập thành công!" });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "Lỗi khi đăng ký: " + ex.Message });
        }
    }

    [HttpDelete("{maDK}")]
    public async Task<IActionResult> HuyDangKy(string maDK)
    {
        var success = await _service.HuyDangKyAsync(maDK);
        if (!success)
            return NotFound(new { success = false, message = "Không tìm thấy mã đăng ký này." });

        return Ok(new { success = true, message = "Hủy đăng ký nguyện vọng thành công." });
    }
}
