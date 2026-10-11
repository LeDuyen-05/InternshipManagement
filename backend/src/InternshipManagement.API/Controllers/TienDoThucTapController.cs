using InternshipManagement.BLL.DTOs.TienDoThucTap;
using InternshipManagement.BLL.Services.TienDoThucTap;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TienDoThucTapController : ControllerBase
{
    private readonly ITienDoThucTapService _service;

    public TienDoThucTapController(ITienDoThucTapService service)
    {
        _service = service;
    }

    [HttpGet("sinhvien/{maSV}")]
    public async Task<IActionResult> GetBySinhVien(string maSV)
    {
        var list = await _service.GetTienDoBySinhVienAsync(maSV);
        return Ok(list);
    }

    [HttpPost("nop-bao-cao")]
    public async Task<IActionResult> NopBaoCao([FromBody] NopBaoCaoRequest request)
    {
        try
        {
            var result = await _service.NopBaoCaoTienDoAsync(request);
            return Ok(new { success = true, data = result, message = "Nộp báo cáo tiến độ thành công!" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "Lỗi khi nộp báo cáo: " + ex.Message });
        }
    }
}
