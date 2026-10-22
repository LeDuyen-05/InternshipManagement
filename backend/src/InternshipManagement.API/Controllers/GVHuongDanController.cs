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

    
    [HttpGet("khoa/tat-ca-phan-cong")]
    public async Task<IActionResult> GetTatCaPhanCong()
    {
        var list = await _service.GetTatCaPhanCongAsync();
        return Ok(new { success = true, data = list, message = "Lấy danh sách tất cả phân công thành công" });
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
        try
        {
            var success = await _service.HuyPhanCongAsync(maSo);
            if (!success)
                return NotFound(new { success = false, message = "Không tìm thấy bản ghi phân công" });

            return Ok(new { success = true, message = "Hủy phân công thành công" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
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

    [HttpGet("giang-vien/{maGV}/profile")]
    public async Task<IActionResult> GetProfile(string maGV)
    {
        var profile = await _service.GetProfileAsync(maGV);
        if (profile == null)
            return NotFound(new { success = false, message = "Không tìm thấy giảng viên" });

        return Ok(new { success = true, data = profile, message = "Lấy hồ sơ giảng viên thành công" });
    }

    [HttpPut("giang-vien/{maGV}/profile")]
    public async Task<IActionResult> UpdateProfile(string maGV, [FromBody] InternshipManagement.BLL.DTOs.GiangVien.UpdateGiangVienProfileRequest request)
    {
        var success = await _service.UpdateProfileAsync(maGV, request);
        if (!success)
            return NotFound(new { success = false, message = "Không tìm thấy giảng viên" });

        return Ok(new { success = true, message = "Cập nhật hồ sơ chuyên môn thành công" });
    }

    [HttpGet("khoa/phan-cong/tu-dong-de-xuat")]
    public async Task<IActionResult> DeXuatPhanCongTuDong()
    {
        var result = await _service.DeXuatPhanCongTuDongAsync();
        return Ok(new { success = true, data = result, message = "Đề xuất phân công tự động thành công" });
    }

    [HttpPost("khoa/phan-cong/tu-dong-xac-nhan")]
    public async Task<IActionResult> XacNhanPhanCongTuDong([FromBody] TuDongPhanCongConfirmRequest request)
    {
        var result = await _service.XacNhanPhanCongTuDongAsync(request);
        return Ok(new { success = true, data = result, message = "Đã lưu kết quả phân công tự động vào cơ sở dữ liệu!" });
    }
}
