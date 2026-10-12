using InternshipManagement.BLL.DTOs.GioiThieu;
using InternshipManagement.BLL.Exceptions;
using InternshipManagement.BLL.Services.GioiThieu;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GioiThieuController : ControllerBase
{
    private readonly IGioiThieuService _service;

    public GioiThieuController(IGioiThieuService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await _service.GetAllAsync();
        return Ok(new { success = true, data = list, message = "Lấy danh sách giới thiệu thành công" });
    }

    [HttpGet("giang-vien/{maGV}")]
    public async Task<IActionResult> GetByGiangVien(string maGV)
    {
        var list = await _service.GetByGiangVienAsync(maGV);
        return Ok(new { success = true, data = list, message = "Lấy danh sách theo giảng viên thành công" });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var item = await _service.GetByIdAsync(id);
        if (item is null)
            return NotFound(new { success = false, data = (object?)null, message = $"Không tìm thấy mã giới thiệu {id}" });

        return Ok(new { success = true, data = item, message = "Tìm thấy thông tin giới thiệu" });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGioiThieuDto dto)
    {
        try
        {
            var created = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.MaSo },
                new { success = true, data = created, message = "Tạo giới thiệu công ty thành công" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, data = (object?)null, message = ex.Message });
        }
    }

    [HttpPost("de-xuat")]
    public async Task<IActionResult> DeXuatMoi([FromBody] CreateDeXuatCongTyDto dto)
    {
        try
        {
            var created = await _service.DeXuatMoiAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.MaSo },
                new { success = true, data = created, message = "Đề xuất công ty mới thành công! Đang chờ Khoa xét duyệt." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, data = (object?)null, message = ex.Message });
        }
    }

    [HttpPut("{id}/trang-thai")]
    public async Task<IActionResult> UpdateTrangThai(string id, [FromBody] UpdateTrangThaiGioiThieuDto dto)
    {
        try
        {
            await _service.UpdateTrangThaiAsync(id, dto);
            return Ok(new { success = true, message = "Cập nhật trạng thái kết nối thành công" });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        try
        {
            await _service.DeleteAsync(id);
            return Ok(new { success = true, message = "Xóa thông tin giới thiệu thành công" });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
    }
}
