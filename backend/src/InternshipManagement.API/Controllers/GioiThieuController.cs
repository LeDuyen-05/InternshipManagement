using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.DTOs.GioiThieu;
using InternshipManagement.BLL.Services.GioiThieu;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GioiThieuController : ControllerBase
{
    private readonly IGioiThieuService _service;
    private readonly IResourceAccess _access;

    public GioiThieuController(IGioiThieuService service, IResourceAccess access)
    {
        _service = service;
        _access = access;
    }

    [HttpGet]
    [Authorize(Roles = $"{Roles.GiangVien},{Roles.Khoa}")]
    public async Task<IActionResult> GetAll()
    {
        var list = await _service.GetAllAsync();
        return Ok(new { success = true, data = list, message = "Lấy danh sách giới thiệu thành công" });
    }

    [HttpGet("giang-vien/{maGV}")]
    [Authorize(Roles = $"{Roles.GiangVien},{Roles.Khoa}")]
    public async Task<IActionResult> GetByGiangVien(string maGV)
    {
        if (!_access.IsLecturer(User, maGV)) return Forbid();
        var list = await _service.GetByGiangVienAsync(maGV);
        return Ok(new { success = true, data = list, message = "Lấy danh sách theo giảng viên thành công" });
    }

    [HttpGet("{id}")]
    [Authorize(Roles = $"{Roles.GiangVien},{Roles.Khoa}")]
    public async Task<IActionResult> GetById(string id)
    {
        var item = await _service.GetByIdAsync(id);
        if (item is null)
            return NotFound(new { success = false, data = (object?)null, message = $"Không tìm thấy mã giới thiệu {id}" });

        return Ok(new { success = true, data = item, message = "Tìm thấy thông tin giới thiệu" });
    }

    [HttpPost]
    [Authorize(Roles = Roles.GiangVien)]
    public async Task<IActionResult> Create([FromBody] CreateGioiThieuDto dto)
    {
        dto.MaGV = User.MaGV() ?? throw new UnauthorizedAccessException();
        var created = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.MaSo },
            new { success = true, data = created, message = "Tạo giới thiệu công ty thành công" });
    }

    [HttpPost("de-xuat")]
    [Authorize(Roles = Roles.GiangVien)]
    public async Task<IActionResult> DeXuatMoi([FromBody] CreateDeXuatCongTyDto dto)
    {
        dto.MaGV = User.MaGV() ?? throw new UnauthorizedAccessException();
        var created = await _service.DeXuatMoiAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.MaSo },
            new { success = true, data = created, message = "Đề xuất công ty mới thành công! Đang chờ Khoa xét duyệt." });
    }

    [HttpPut("{id}/trang-thai")]
    [Authorize(Roles = Roles.Khoa)]
    public async Task<IActionResult> UpdateTrangThai(string id, [FromBody] UpdateTrangThaiGioiThieuDto dto)
    {
        await _service.UpdateTrangThaiAsync(id, dto);
        return Ok(new { success = true, message = "Cập nhật trạng thái kết nối thành công" });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = $"{Roles.GiangVien},{Roles.Khoa}")]
    public async Task<IActionResult> Delete(string id)
    {
        var item = await _service.GetByIdAsync(id);
        if (item is null)
            return NotFound(new { success = false, data = (object?)null, message = $"Không tìm thấy mã giới thiệu {id}" });

        // Giảng viên chỉ được hủy đề xuất của chính mình khi Khoa chưa xét duyệt.
        if (User.IsInRole(Roles.GiangVien))
        {
            if (!_access.IsLecturer(User, item.MaGV))
                return Forbid();

            if (item.TrangThaiKetNoi != "DangXem")
                return BadRequest(new { success = false, message = "Chỉ có thể hủy đề xuất đang chờ duyệt." });
        }

        await _service.DeleteAsync(id);
        return Ok(new { success = true, message = "Xóa thông tin giới thiệu thành công" });
    }
}
