using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.PhongVan;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PhongVanController : ControllerBase
{
    private readonly IPhongVanService _service;
    private readonly IResourceAccess _access;

    public PhongVanController(IPhongVanService service, IResourceAccess access)
    {
        _service = service;
        _access = access;
    }

    [HttpGet("sinhvien/{maSV}")]
    public async Task<IActionResult> GetLichPhongVan(string maSV)
    {
        if (!await _access.CanAccessStudentAsync(User, maSV)) return Forbid();
        var list = await _service.GetLichPhongVanBySinhVienAsync(maSV);
        return Ok(list);
    }

    [HttpGet("phan-bo/sinhvien/{maSV}")]
    public async Task<IActionResult> GetPhanBoThucTap(string maSV)
    {
        if (!await _access.CanAccessStudentAsync(User, maSV)) return Forbid();
        var result = await _service.GetPhanBoBySinhVienAsync(maSV);
        if (result == null) return NotFound(new { success = false, message = "Sinh viên chưa có quyết định phân bổ tiếp nhận." });
        return Ok(result);
    }

    [HttpPost("phan-bo/{maPhanBo}/xac-nhan")]
    [Authorize(Roles = Roles.SinhVien)]
    public async Task<IActionResult> XacNhanTiepNhan(string maPhanBo)
    {
        var maSV = User.MaSV() ?? throw new UnauthorizedAccessException();
        var result = await _service.XacNhanTiepNhanAsync(maPhanBo, maSV);
        return Ok(new { success = true, data = result, message = "Đã xác nhận nhận quyết định tiếp nhận thực tập." });
    }
}
