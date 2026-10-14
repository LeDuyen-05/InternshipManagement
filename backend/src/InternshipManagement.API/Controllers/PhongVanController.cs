using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.PhongVan;
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
}
