using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.DTOs.GoiYCongTy;
using InternshipManagement.BLL.Services.GoiYCongTy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace InternshipManagement.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
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
    public async Task<IActionResult> GetTopKGoiY(string maSV, [FromQuery] string maDot, [FromQuery] int topK = 5)
    {
        if (!await _access.CanAccessStudentAsync(User, maSV, maDot)) return Forbid();
        var result = await _goiYCongTyService.GetTopKGoiYAsync(maSV, topK, maDot, HttpContext.RequestAborted);
        if (!await _access.CanAccessStudentAsync(User, maSV, maDot)) return Forbid();
        return Ok(new
        {
            Success = true,
            Message = $"Lấy gợi ý Top-{topK} công ty thành công",
            Data = result,
        });
    }

    [HttpPost("sinhvien/{maSV}/recalculate")]
    public async Task<IActionResult> Recalculate(string maSV, [FromQuery] string maDot, [FromQuery] int topK = 5)
    {
        if (!await _access.CanAccessStudentAsync(User, maSV, maDot)) return Forbid();
        var result = await _goiYCongTyService.RecalculateTopKAsync(maSV, topK, maDot, HttpContext.RequestAborted);
        if (!await _access.CanAccessStudentAsync(User, maSV, maDot)) return Forbid();
        return Ok(new
        {
            Success = true,
            Message = "Tính toán lại độ tương đồng AI thành công",
            Data = result,
        });
    }

    [HttpPut("sinhvien/{maSV}/hoso")]
    [Authorize(Roles = $"{Roles.SinhVien},{Roles.Khoa}")]
    public async Task<IActionResult> CapNhatHoSo(string maSV, [FromBody] CapNhatHoSoRequest request, [FromQuery] string maDot, [FromQuery] int topK = 5)
    {
        if (!await _access.CanAccessStudentAsync(User, maSV, maDot)) return Forbid();
        // Kiểm tra tham số/đợt trước khi ghi hồ sơ; không ghi rồi mới phát hiện request gợi ý sai.
        await _goiYCongTyService.ValidateContextAsync(maSV, topK, maDot);
        await _goiYCongTyService.CapNhatHoSoAsync(maSV, request);
        var updatedResult = await _goiYCongTyService.GetTopKGoiYAsync(maSV, topK, maDot, HttpContext.RequestAborted);
        if (!await _access.CanAccessStudentAsync(User, maSV, maDot)) return Forbid();
        return Ok(new
        {
            Success = true,
            Message = "Cập nhật hồ sơ năng lực và tính toán lại gợi ý AI thành công",
            Data = updatedResult,
        });
    }
}
