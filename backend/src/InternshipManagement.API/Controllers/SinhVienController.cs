using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.DTOs.SinhVien;
using InternshipManagement.BLL.Services.SinhVien;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SinhVienController : ControllerBase
{
    private readonly ISinhVienService _service;
    private readonly IResourceAccess _access;

    public SinhVienController(ISinhVienService service, IResourceAccess access)
    {
        _service = service;
        _access = access;
    }

    [HttpGet]
    [Authorize(Roles = $"{Roles.Khoa},{Roles.GiangVien}")]
    public async Task<ActionResult<IReadOnlyList<SinhVienDto>>> GetAll()
        => Ok(await _service.GetAllAsync());

    [HttpGet("{maSV}")]
    public async Task<ActionResult<SinhVienDto>> GetById(string maSV)
    {
        if (!await _access.CanAccessStudentAsync(User, maSV)) return Forbid();
        var result = await _service.GetByIdAsync(maSV);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = Roles.Khoa)]
    public async Task<ActionResult<SinhVienDto>> Create([FromBody] CreateSinhVienDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { maSV = result.MaSV }, result);
    }

    [HttpPut("{maSV}")]
    [Authorize(Roles = Roles.Khoa)]
    public async Task<IActionResult> Update(string maSV, [FromBody] UpdateSinhVienDto dto)
    {
        await _service.UpdateAsync(maSV, dto);
        return NoContent();
    }
}
