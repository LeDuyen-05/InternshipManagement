using InternshipManagement.BLL.DTOs.SinhVien;
using InternshipManagement.BLL.Services.SinhVien;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

/// <summary>
/// Controller MẪU — dùng làm khuôn mẫu (pattern) cho các module còn lại.
/// Controller CHỈ điều phối request/response, không chứa business logic.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class SinhVienController : ControllerBase
{
    private readonly ISinhVienService _service;

    public SinhVienController(ISinhVienService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SinhVienDto>>> GetAll()
        => Ok(await _service.GetAllAsync());

    [HttpGet("{maSV}")]
    public async Task<ActionResult<SinhVienDto>> GetById(string maSV)
    {
        var result = await _service.GetByIdAsync(maSV);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<SinhVienDto>> Create([FromBody] CreateSinhVienDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { maSV = result.MaSV }, result);
    }

    [HttpPut("{maSV}")]
    public async Task<IActionResult> Update(string maSV, [FromBody] UpdateSinhVienDto dto)
    {
        await _service.UpdateAsync(maSV, dto);
        return NoContent();
    }
}
