using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.DTOs.GoiYCongTy;
using InternshipManagement.BLL.Services.GoiYCongTy;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class GoiYCongTyController : ControllerBase
{
    private readonly IGoiYCongTyService _goiYCongTyService;
    private readonly IResourceAccess _access;

    public GoiYCongTyController(IGoiYCongTyService goiYCongTyService, IResourceAccess access)
    {
        _goiYCongTyService = goiYCongTyService;
        _access = access;
    }

    [HttpGet("sinhvien/{maSV}")]
    public async Task<IActionResult> GetTopKGoiY(string maSV, [FromQuery] int topK = 5)
    {
        if (!await _access.CanAccessStudentAsync(User, maSV)) return Forbid();
        var result = await _goiYCongTyService.GetTopKGoiYAsync(maSV, topK);
        return Ok(new
        {
            Success = true,
            Message = $"Lấy gợi ý Top-{topK} công ty thành công",
            Data = result,
        });
    }

    [HttpPost("sinhvien/{maSV}/recalculate")]
    public async Task<IActionResult> Recalculate(string maSV, [FromQuery] int topK = 5)
    {
        if (!await _access.CanAccessStudentAsync(User, maSV)) return Forbid();
        var result = await _goiYCongTyService.RecalculateTopKAsync(maSV, topK);
        return Ok(new
        {
            Success = true,
            Message = "Tính toán lại độ tương đồng AI thành công",
            Data = result,
        });
    }

    [HttpPut("sinhvien/{maSV}/hoso")]
    public async Task<IActionResult> CapNhatHoSo(string maSV, [FromBody] CapNhatHoSoRequest request)
    {
        if (!await _access.CanAccessStudentAsync(User, maSV)) return Forbid();
        await _goiYCongTyService.CapNhatHoSoAsync(maSV, request);
        var updatedResult = await _goiYCongTyService.GetTopKGoiYAsync(maSV);
        return Ok(new
        {
            Success = true,
            Message = "Cập nhật hồ sơ năng lực và tính toán lại gợi ý AI thành công",
            Data = updatedResult,
        });
    }
}
