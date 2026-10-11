using InternshipManagement.BLL.DTOs.HoSoNangLuc;
using InternshipManagement.BLL.Exceptions;
using InternshipManagement.BLL.Services.HoSoNangLuc;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HoSoNangLucController : ControllerBase
{
    private readonly IHoSoNangLucService _service;

    public HoSoNangLucController(IHoSoNangLucService service)
    {
        _service = service;
    }

    [HttpGet("sinhvien/{maSV}")]
    public async Task<IActionResult> GetBySinhVien(string maSV)
    {
        var result = await _service.GetHoSoBySinhVienAsync(maSV);
        if (result == null)
            return NotFound(new { message = $"Không tìm thấy hồ sơ của sinh viên {maSV}" });

        return Ok(result);
    }

    [HttpPut("sinhvien/{maSV}")]
    public async Task<IActionResult> Update(string maSV, [FromBody] UpdateHoSoNangLucRequest request)
    {
        try
        {
            var result = await _service.UpdateHoSoAsync(maSV, request);
            return Ok(new { success = true, data = result, message = "Cập nhật hồ sơ năng lực thành công" });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "Lỗi khi cập nhật hồ sơ: " + ex.Message });
        }
    }
}
