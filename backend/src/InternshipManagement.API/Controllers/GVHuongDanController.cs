using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.DTOs.GiangVien;
using InternshipManagement.BLL.DTOs.GVHuongDan;
using InternshipManagement.BLL.Services.GVHuongDan;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GVHuongDanController : ControllerBase
{
    private readonly IGVHuongDanService _service;
    private readonly IResourceAccess _access;

    public GVHuongDanController(IGVHuongDanService service, IResourceAccess access)
    {
        _service = service;
        _access = access;
    }

    [HttpGet("giang-vien/{maGV}/sinh-vien")]
    [Authorize(Roles = $"{Roles.GiangVien},{Roles.Khoa}")]
    public async Task<IActionResult> GetDanhSachSVTheoGiangVien(string maGV, [FromQuery] string? keyword)
    {
        if (!_access.IsLecturer(User, maGV)) return Forbid();
        var list = await _service.GetDanhSachSVTheoGiangVienAsync(maGV, keyword);
        return Ok(new { success = true, data = list, message = "Lấy danh sách sinh viên hướng dẫn thành công" });
    }

    [HttpGet("khoa/sinh-vien-chua-phan-cong")]
    [Authorize(Roles = Roles.Khoa)]
    public async Task<IActionResult> GetDanhSachSVChuaPhanCong([FromQuery] string? keyword)
    {
        var list = await _service.GetDanhSachSVChuaPhanCongAsync(keyword);
        return Ok(new { success = true, data = list, message = "Lấy danh sách sinh viên chưa phân công thành công" });
    }

    [HttpGet("khoa/giang-vien-tai")]
    [Authorize(Roles = $"{Roles.GiangVien},{Roles.Khoa}")]
    public async Task<IActionResult> GetDanhSachGiangVienKemTai()
    {
        var list = await _service.GetDanhSachGiangVienKemTaiAsync();
        return Ok(new { success = true, data = list, message = "Lấy danh sách tải công việc giảng viên thành công" });
    }

    [HttpPost("khoa/phan-cong")]
    [Authorize(Roles = Roles.Khoa)]
    public async Task<IActionResult> PhanCongDonLe([FromBody] PhanCongDonLeRequest request)
    {
        var result = await _service.PhanCongDonLeAsync(request);
        return Ok(new { success = true, data = result, message = "Phân công giảng viên hướng dẫn thành công" });
    }

    [HttpPost("khoa/phan-cong-hang-loat")]
    [Authorize(Roles = Roles.Khoa)]
    public async Task<IActionResult> PhanCongHangLoat([FromBody] PhanCongHangLoatRequest request)
    {
        var result = await _service.PhanCongHangLoatAsync(request);
        return Ok(new
        {
            success = true,
            data = result,
            message = $"Đã phân công thành công {result.ThanhCong.Count} sinh viên; không thể phân công {result.KhongThanhCong.Count} sinh viên."
        });
    }

    [HttpPut("khoa/doi-gv")]
    [Authorize(Roles = Roles.Khoa)]
    public async Task<IActionResult> DoiGiangVien([FromBody] DoiGiangVienRequest request)
    {
        var success = await _service.DoiGiangVienAsync(request);
        if (!success)
            return NotFound(new { success = false, message = "Không tìm thấy bản ghi phân công cần đổi" });

        return Ok(new { success = true, message = "Đổi giảng viên hướng dẫn thành công" });
    }

    [HttpDelete("khoa/huy/{maSo}")]
    [Authorize(Roles = Roles.Khoa)]
    public async Task<IActionResult> HuyPhanCong(string maSo)
    {
        var success = await _service.HuyPhanCongAsync(maSo);
        if (!success)
            return NotFound(new { success = false, message = "Không tìm thấy bản ghi phân công" });

        return Ok(new { success = true, message = "Hủy phân công thành công" });
    }

    [HttpPut("khoa/giang-vien/{maGV}/chi-tieu")]
    [Authorize(Roles = Roles.Khoa)]
    public async Task<IActionResult> CapNhatChiTieu(string maGV, [FromBody] CapNhatChiTieuRequest request)
    {
        var success = await _service.CapNhatChiTieuAsync(maGV, request.SoLuongMoi);
        if (!success)
            return NotFound(new { success = false, message = "Không tìm thấy giảng viên" });

        return Ok(new { success = true, message = "Cập nhật chỉ tiêu giảng viên thành công" });
    }

    [HttpGet("giang-vien/{maGV}/profile")]
    [Authorize(Roles = $"{Roles.GiangVien},{Roles.Khoa}")]
    public async Task<IActionResult> GetProfile(string maGV)
    {
        if (!_access.IsLecturer(User, maGV)) return Forbid();
        var profile = await _service.GetProfileAsync(maGV);
        if (profile == null)
            return NotFound(new { success = false, message = "Không tìm thấy giảng viên" });

        return Ok(new { success = true, data = profile, message = "Lấy hồ sơ giảng viên thành công" });
    }

    [HttpPut("giang-vien/{maGV}/profile")]
    [Authorize(Roles = $"{Roles.GiangVien},{Roles.Khoa}")]
    public async Task<IActionResult> UpdateProfile(string maGV, [FromBody] UpdateGiangVienProfileRequest request)
    {
        if (!_access.IsLecturer(User, maGV)) return Forbid();
        var success = await _service.UpdateProfileAsync(maGV, request);
        if (!success)
            return NotFound(new { success = false, message = "Không tìm thấy giảng viên" });

        return Ok(new { success = true, message = "Cập nhật hồ sơ chuyên môn thành công" });
    }

    [HttpGet("khoa/phan-cong/tu-dong-de-xuat")]
    [Authorize(Roles = Roles.Khoa)]
    public async Task<IActionResult> DeXuatPhanCongTuDong()
    {
        var result = await _service.DeXuatPhanCongTuDongAsync();
        return Ok(new { success = true, data = result, message = "Đề xuất phân công tự động thành công" });
    }

    [HttpPost("khoa/phan-cong/tu-dong-xac-nhan")]
    [Authorize(Roles = Roles.Khoa)]
    public async Task<IActionResult> XacNhanPhanCongTuDong([FromBody] TuDongPhanCongConfirmRequest request)
    {
        var result = await _service.XacNhanPhanCongTuDongAsync(request);
        return Ok(new { success = true, data = result, message = "Đã lưu kết quả phân công tự động vào cơ sở dữ liệu!" });
    }
}
