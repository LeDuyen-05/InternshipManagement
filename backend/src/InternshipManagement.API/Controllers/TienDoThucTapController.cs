using InternshipManagement.BLL.DTOs.TienDoThucTap;
using InternshipManagement.BLL.Services.TienDoThucTap;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class TienDoThucTapController : ControllerBase
{
    private readonly ITienDoThucTapService _tienDoThucTapService;

    public TienDoThucTapController(ITienDoThucTapService tienDoThucTapService)
    {
        _tienDoThucTapService = tienDoThucTapService;
    }

    [HttpGet("sinhvien/{maSV}")]
    public async Task<IActionResult> GetTienDoBySinhVien(string maSV)
    {
        var result = await _tienDoThucTapService.GetTienDoBySinhVienAsync(maSV);
        return Ok(result);
    }

    [HttpGet("giangvien/{maGV}/choduyet")]
    public async Task<IActionResult> GetBaoCaoChoDuyetByGiangVien(string maGV)
    {
        var result = await _tienDoThucTapService.GetBaoCaoChoDuyetByGiangVienAsync(maGV);
        return Ok(result);
    }

    [HttpGet("{maTienDo}")]
    public async Task<IActionResult> GetChiTietTienDo(string maTienDo)
    {
        var result = await _tienDoThucTapService.GetChiTietTienDoAsync(maTienDo);
        if (result == null)
            return NotFound(new { Message = "Không tìm thấy báo cáo tiến độ này." });

        return Ok(result);
    }

    [HttpPut("{maTienDo}/duyet")]
    public async Task<IActionResult> DuyetTienDo(string maTienDo, [FromBody] DuyetTienDoRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var isSuccess = await _tienDoThucTapService.DuyetTienDoAsync(maTienDo, request);
            if (!isSuccess)
            {
                return BadRequest(new { Message = "Không thể cập nhật trạng thái duyệt hoặc không tìm thấy mã tiến độ." });
            }

            return Ok(new { Message = "Cập nhật trạng thái duyệt thành công." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
        catch (Exception)
        {
            return StatusCode(500, new { Message = "Đã xảy ra lỗi hệ thống khi duyệt báo cáo." });
        }
    }
}
