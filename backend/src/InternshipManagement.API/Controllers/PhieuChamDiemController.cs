using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.DTOs.PhieuChamDiem;
using InternshipManagement.BLL.Services.PhieuChamDiem;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class PhieuChamDiemController : ControllerBase
{
    private readonly IPhieuChamDiemService _service;
    private readonly IResourceAccess _access;

    public PhieuChamDiemController(IPhieuChamDiemService service, IResourceAccess access)
    {
        _service = service;
        _access = access;
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
        if (!await _access.CanAccessStudentAsync(User, maSV)) return Forbid();
        var result = await _service.GetPhieuChamBySinhVienAndDotAsync(maSV, maDot);
        if (result == null)
        {
            return Ok(new { success = true, data = (object?)null, message = "Chưa có phiếu chấm điểm cho sinh viên trong đợt này" });
        }
        return Ok(new { success = true, data = result });
    }

    [HttpGet("giang-vien/{maGV}/dot/{maDot}")]
    [Authorize(Roles = $"{Roles.GiangVien},{Roles.Khoa}")]
    public async Task<IActionResult> GetDanhSachByGiangVien(string maGV, string maDot)
    {
        if (!_access.IsLecturer(User, maGV)) return Forbid();
        var result = await _service.GetDanhSachPhieuChamByGiangVienAsync(maGV, maDot);
        return Ok(new { success = true, data = result });
    }

    [HttpPost("cham-diem")]
    [Authorize(Roles = $"{Roles.GiangVien},{Roles.Khoa}")]
    public async Task<IActionResult> ChamDiem([FromBody] LuuPhieuChamRequest request)
    {
        var result = await _service.LuuPhieuChamDiemAsync(request, User.MaGV(), User.IsStaff());
        return Ok(new { success = true, data = result, message = "Lưu và chốt điểm CLO thành công!" });
    }
}
