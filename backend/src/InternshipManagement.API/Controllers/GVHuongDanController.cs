using InternshipManagement.BLL.DTOs.GVHuongDan;
using InternshipManagement.BLL.Services.GVHuongDan;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GVHuongDanController : ControllerBase
{
    private readonly IGVHuongDanService _service;

    public GVHuongDanController(IGVHuongDanService service)
    {
        _service = service;
    }

    [HttpGet("giang-vien/{maGV}/sinh-vien")]
    public async Task<IActionResult> GetDanhSachSVTheoGiangVien(string maGV, [FromQuery] string? keyword)
    {
        var list = await _service.GetDanhSachSVTheoGiangVienAsync(maGV, keyword);
        return Ok(new { success = true, data = list, message = "Lấy danh sách sinh viên hướng dẫn thành công" });
    }

    [HttpGet("khoa/sinh-vien-chua-phan-cong")]
    public async Task<IActionResult> GetDanhSachSVChuaPhanCong([FromQuery] string? keyword)
    {
        var list = await _service.GetDanhSachSVChuaPhanCongAsync(keyword);
        return Ok(new { success = true, data = list, message = "Lấy danh sách sinh viên chưa phân công thành công" });
    }

    [HttpGet("khoa/giang-vien-tai")]
    public async Task<IActionResult> GetDanhSachGiangVienKemTai()
    {
        var list = await _service.GetDanhSachGiangVienKemTaiAsync();
        return Ok(new { success = true, data = list, message = "Lấy danh sách tải công việc giảng viên thành công" });
    }

    [HttpPost("khoa/phan-cong")]
    public async Task<IActionResult> PhanCongDonLe([FromBody] PhanCongDonLeRequest request)
    {
        try
        {
            var result = await _service.PhanCongDonLeAsync(request);
            return Ok(new { success = true, data = result, message = "Phân công giảng viên hướng dẫn thành công" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception)
        {
            return StatusCode(500, new { success = false, message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau." });
        }
    }

    [HttpPost("khoa/phan-cong-hang-loat")]
    public async Task<IActionResult> PhanCongHangLoat([FromBody] PhanCongHangLoatRequest request)
    {
        try
        {
            var result = await _service.PhanCongHangLoatAsync(request);
            return Ok(new
            {
                success = true,
                data = result,
                message = $"Đã phân công thành công {result.ThanhCong.Count} sinh viên; không thể phân công {result.KhongThanhCong.Count} sinh viên."
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception)
        {
            return StatusCode(500, new { success = false, message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau." });
        }
    }

    [HttpPut("khoa/doi-gv")]
    public async Task<IActionResult> DoiGiangVien([FromBody] DoiGiangVienRequest request)
    {
        try
        {
            var success = await _service.DoiGiangVienAsync(request);
            if (!success)
                return NotFound(new { success = false, message = "Không tìm thấy bản ghi phân công cần đổi" });

            return Ok(new { success = true, message = "Đổi giảng viên hướng dẫn thành công" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (Exception)
        {
            return StatusCode(500, new { success = false, message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau." });
        }
    }

    [HttpDelete("khoa/huy/{maSo}")]
    public async Task<IActionResult> HuyPhanCong(string maSo)
    {
        var success = await _service.HuyPhanCongAsync(maSo);
        if (!success)
            return NotFound(new { success = false, message = "Không tìm thấy bản ghi phân công" });

        return Ok(new { success = true, message = "Hủy phân công thành công" });
    }

    [HttpPut("khoa/giang-vien/{maGV}/chi-tieu")]
    public async Task<IActionResult> CapNhatChiTieu(string maGV, [FromBody] CapNhatChiTieuRequest request)
    {
        try
        {
            var success = await _service.CapNhatChiTieuAsync(maGV, request.SoLuongMoi);
            if (!success)
                return NotFound(new { success = false, message = "Không tìm thấy giảng viên" });

            return Ok(new { success = true, message = "Cập nhật chỉ tiêu giảng viên thành công" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception)
        {
            return StatusCode(500, new { success = false, message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau." });
        }
    }
}
