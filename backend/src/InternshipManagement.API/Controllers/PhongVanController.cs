using InternshipManagement.BLL.Services.PhongVan;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PhongVanController : ControllerBase
{
    private readonly IPhongVanService _service;

    public PhongVanController(IPhongVanService service)
    {
        _service = service;
    }

    [HttpGet("sinhvien/{maSV}")]
    public async Task<IActionResult> GetLichPhongVan(string maSV)
    {
        var list = await _service.GetLichPhongVanBySinhVienAsync(maSV);
        return Ok(list);
    }

    [HttpGet("phan-bo/sinhvien/{maSV}")]
    public async Task<IActionResult> GetPhanBoThucTap(string maSV)
    {
        var result = await _service.GetPhanBoBySinhVienAsync(maSV);
        if (result == null) return NotFound(new { success = false, message = "Sinh viên chưa có quyết định phân bổ tiếp nhận." });
        return Ok(result);
    }
}
