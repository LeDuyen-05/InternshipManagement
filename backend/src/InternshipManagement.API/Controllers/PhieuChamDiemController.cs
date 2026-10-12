using InternshipManagement.BLL.DTOs.PhieuChamDiem;
using InternshipManagement.BLL.Services.PhieuChamDiem;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class PhieuChamDiemController : ControllerBase
{
    private readonly IPhieuChamDiemService _service;

    public PhieuChamDiemController(IPhieuChamDiemService service)
    {
        _service = service;
    }

    [HttpGet("tieu-chi")]
    public async Task<IActionResult> GetDanhSachTieuChi()
    {
        var result = await _service.GetDanhSachTieuChiAsync();
        return Ok(new { success = true, data = result });
    }

    [HttpGet("sinh-vien/{maSV}/dot/{maDot}")]
    public async Task<IActionResult> GetPhieuChamBySinhVien(string maSV, string maDot)
    {
        var result = await _service.GetPhieuChamBySinhVienAndDotAsync(maSV, maDot);
        if (result == null)
        {
            return Ok(new { success = true, data = (object?)null, message = "Chưa có phiếu chấm điểm cho sinh viên trong đợt này" });
        }
        return Ok(new { success = true, data = result });
    }

    [HttpGet("giang-vien/{maGV}/dot/{maDot}")]
    public async Task<IActionResult> GetDanhSachByGiangVien(string maGV, string maDot)
    {
        var result = await _service.GetDanhSachPhieuChamByGiangVienAsync(maGV, maDot);
        return Ok(new { success = true, data = result });
    }

    [HttpPost("cham-diem")]
    public async Task<IActionResult> ChamDiem([FromBody] LuuPhieuChamRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { success = false, message = "Dữ liệu chấm điểm không hợp lệ", errors = ModelState });

        try
        {
            var result = await _service.LuuPhieuChamDiemAsync(request);
            return Ok(new { success = true, data = result, message = "Lưu và chốt điểm CLO thành công!" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "Lỗi khi lưu phiếu chấm điểm: " + ex.Message });
        }
    }
}
