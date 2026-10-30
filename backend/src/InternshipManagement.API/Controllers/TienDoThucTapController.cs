using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.DTOs.TienDoThucTap;
using InternshipManagement.BLL.Services.TienDoThucTap;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class TienDoThucTapController : ControllerBase
{
    private readonly ITienDoThucTapService _tienDoThucTapService;
    private readonly IResourceAccess _access;

    public TienDoThucTapController(ITienDoThucTapService tienDoThucTapService, IResourceAccess access)
    {
        _tienDoThucTapService = tienDoThucTapService;
        _access = access;
    }

    [HttpGet("sinhvien/{maSV}")]
    public async Task<IActionResult> GetTienDoBySinhVien(string maSV, [FromQuery] string? maDot)
    {
        if (User.IsInRole(Roles.GiangVien) && string.IsNullOrWhiteSpace(maDot))
            return BadRequest(new { message = "Vui lòng chọn đợt để xem tiến độ sinh viên." });
        if (!await _access.CanAccessStudentAsync(User, maSV, maDot)) return Forbid();

        if (!string.IsNullOrWhiteSpace(maDot))
        {
            var resultWithDot = await _tienDoThucTapService.GetTienDoBySinhVienAndDotAsync(maSV, maDot);
            return Ok(resultWithDot);
        }

        var result = await _tienDoThucTapService.GetTienDoBySinhVienAsync(maSV);
        return Ok(result);
    }

    [HttpGet("giangvien/{maGV}/choduyet")]
    [Authorize(Roles = $"{Roles.GiangVien},{Roles.Khoa}")]
    public async Task<IActionResult> GetBaoCaoChoDuyetByGiangVien(string maGV)
    {
        if (!_access.IsLecturer(User, maGV)) return Forbid();
        var result = await _tienDoThucTapService.GetBaoCaoChoDuyetByGiangVienAsync(maGV);
        return Ok(result);
    }

    [HttpGet("{maTienDo}")]
    public async Task<IActionResult> GetChiTietTienDo(string maTienDo)
    {
        var result = await _tienDoThucTapService.GetChiTietTienDoAsync(maTienDo);
        if (result == null)
            return NotFound(new { Message = "Không tìm thấy báo cáo tiến độ này." });

        if (!await _access.CanAccessStudentAsync(User, result.MaSV, result.MaDot)) return Forbid();

        return Ok(result);
    }

    [HttpPut("{maTienDo}/duyet")]
    [Authorize(Roles = $"{Roles.GiangVien},{Roles.Khoa}")]
    public async Task<IActionResult> DuyetTienDo(string maTienDo, [FromBody] DuyetTienDoRequest request)
    {
        var isSuccess = await _tienDoThucTapService.DuyetTienDoAsync(maTienDo, request, User.MaGV(), User.IsStaff());
        if (!isSuccess)
        {
            return BadRequest(new { Message = "Không thể cập nhật trạng thái duyệt hoặc không tìm thấy mã tiến độ." });
        }

        return Ok(new { Message = "Cập nhật trạng thái duyệt thành công." });
    }

    [HttpPost("nop-bao-cao")]
    [Authorize(Roles = Roles.SinhVien)]
    public async Task<IActionResult> NopBaoCao([FromBody] NopBaoCaoRequest request)
    {
        var userMaSV = User.MaSV() ?? throw new UnauthorizedAccessException();
        request.MaSV = userMaSV;
        var result = await _tienDoThucTapService.NopBaoCaoTienDoAsync(request, userMaSV);
        return Ok(new { success = true, data = result, message = "Nộp báo cáo tiến độ thành công!" });
    }
}
