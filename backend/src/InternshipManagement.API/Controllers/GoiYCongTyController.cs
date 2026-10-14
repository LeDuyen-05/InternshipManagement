using InternshipManagement.BLL.DTOs.GoiYCongTy;
using InternshipManagement.BLL.Services.GoiYCongTy;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class GoiYCongTyController : ControllerBase
{
    private readonly IGoiYCongTyService _goiYCongTyService;

    public GoiYCongTyController(IGoiYCongTyService goiYCongTyService)
    {
        _goiYCongTyService = goiYCongTyService;
    }

    [HttpGet("sinhvien/{maSV}")]
    public async Task<IActionResult> GetTopKGoiY(string maSV, [FromQuery] int topK = 5)
    {
        try
        {
            var result = await _goiYCongTyService.GetTopKGoiYAsync(maSV, topK);
            return Ok(new
            {
                Success = true,
                Message = $"Lấy gợi ý Top-{topK} công ty thành công",
                Data = result,
            });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { Success = false, Message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                Success = false,
                Message = "Lỗi khi lấy dữ liệu gợi ý công ty: " + ex.Message,
            });
        }
    }

    [HttpPost("sinhvien/{maSV}/recalculate")]
    public async Task<IActionResult> Recalculate(string maSV, [FromQuery] int topK = 5)
    {
        try
        {
            var result = await _goiYCongTyService.RecalculateTopKAsync(maSV, topK);
            return Ok(new
            {
                Success = true,
                Message = "Tính toán lại độ tương đồng AI thành công",
                Data = result,
            });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { Success = false, Message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                Success = false,
                Message = "Lỗi khi tính toán lại: " + ex.Message,
            });
        }
    }

    [HttpPut("sinhvien/{maSV}/hoso")]
    public async Task<IActionResult> CapNhatHoSo(string maSV, [FromBody] CapNhatHoSoRequest request)
    {
        try
        {
            await _goiYCongTyService.CapNhatHoSoAsync(maSV, request);
            var updatedResult = await _goiYCongTyService.GetTopKGoiYAsync(maSV);
            return Ok(new
            {
                Success = true,
                Message = "Cập nhật hồ sơ năng lực và tính toán lại gợi ý AI thành công",
                Data = updatedResult,
            });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { Success = false, Message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                Success = false,
                Message = "Lỗi khi cập nhật hồ sơ: " + ex.Message,
            });
        }
    }
}
