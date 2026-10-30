using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.DTOs.DoanhNghiep;
using InternshipManagement.BLL.Services.DoanhNghiep;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

/// <summary>
/// Cổng Doanh nghiệp. Đại diện DN chỉ thao tác trên công ty của mình; Khoa/Quản trị xem được mọi công ty.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = $"{Roles.DaiDienDN},{Roles.Khoa},{Roles.QuanTriVien}")]
public class DoanhNghiepController : ControllerBase
{
    private readonly DoanhNghiepService _service;

    public DoanhNghiepController(DoanhNghiepService service)
    {
        _service = service;
    }

    /// <summary>null = không giới hạn (Khoa/Quản trị); ngược lại là mã công ty của đại diện đăng nhập.</summary>
    private async Task<string?> PhamViCongTyAsync()
    {
        if (!User.IsInRole(Roles.DaiDienDN)) return null;
        return await _service.GetMaCongTyCuaDaiDienAsync(User.MaDaiDien())
               ?? throw new UnauthorizedAccessException("Tài khoản chưa được gắn với người đại diện doanh nghiệp.");
    }

    [HttpGet("danh-sach")]
    public async Task<IActionResult> GetDanhSachDoanhNghiep() =>
        Ok(await _service.GetDanhSachAsync(await PhamViCongTyAsync()));

    [HttpGet("theo-dai-dien/{maDaiDien}")]
    public async Task<IActionResult> GetByDaiDien(string maDaiDien)
    {
        if (User.IsInRole(Roles.DaiDienDN) && !string.Equals(User.MaDaiDien(), maDaiDien, StringComparison.OrdinalIgnoreCase))
            return Forbid();
        return Ok(await _service.GetByDaiDienAsync(maDaiDien));
    }

    [HttpGet("tong-quan/{maCongTy}")]
    public async Task<IActionResult> GetTongQuan(string maCongTy, [FromQuery] string? maDot) =>
        Ok(await _service.GetTongQuanAsync(maCongTy, await PhamViCongTyAsync(), maDot));

    [HttpGet("tin-tuyen-dung/{maCongTy}")]
    public async Task<IActionResult> GetTinTuyenDung(string maCongTy, [FromQuery] string? maDot) =>
        Ok(await _service.GetTinTuyenDungAsync(maCongTy, await PhamViCongTyAsync(), maDot));

    [HttpPost("tin-tuyen-dung")]
    [Authorize(Roles = $"{Roles.DaiDienDN},{Roles.Khoa}")]
    public async Task<IActionResult> LuuTinTuyenDung([FromBody] CapNhatTinTuyenDungRequest request) =>
        Ok(await _service.LuuTinTuyenDungAsync(request, await PhamViCongTyAsync()));

    [HttpPost("vi-tri")]
    [Authorize(Roles = $"{Roles.DaiDienDN},{Roles.Khoa}")]
    public async Task<IActionResult> ThemViTri([FromBody] ThemViTriRequest request) =>
        Ok(await _service.ThemViTriAsync(request, await PhamViCongTyAsync()));

    [HttpPut("vi-tri")]
    [Authorize(Roles = $"{Roles.DaiDienDN},{Roles.Khoa}")]
    public async Task<IActionResult> CapNhatViTri([FromBody] CapNhatViTriRequest request) =>
        Ok(await _service.CapNhatViTriAsync(request, await PhamViCongTyAsync()));

    [HttpPatch("vi-tri/{maViTri}/toggle")]
    [Authorize(Roles = $"{Roles.DaiDienDN},{Roles.Khoa}")]
    public async Task<IActionResult> ToggleViTri(string maViTri) =>
        Ok(await _service.ToggleViTriAsync(maViTri, await PhamViCongTyAsync()));

    [HttpDelete("vi-tri/{maViTri}")]
    [Authorize(Roles = $"{Roles.DaiDienDN},{Roles.Khoa}")]
    public async Task<IActionResult> XoaViTri(string maViTri) =>
        Ok(await _service.XoaViTriAsync(maViTri, await PhamViCongTyAsync()));

    [HttpGet("ung-vien/{maCongTy}")]
    public async Task<IActionResult> GetDanhSachUngVien(string maCongTy, [FromQuery] string? maDot) =>
        Ok(await _service.GetUngVienAsync(maCongTy, await PhamViCongTyAsync(), maDot));

    [HttpPut("ung-vien/{maDK}/trang-thai")]
    [Authorize(Roles = $"{Roles.DaiDienDN},{Roles.Khoa}")]
    public async Task<IActionResult> CapNhatTrangThaiUngVien(string maDK, [FromBody] CapNhatTrangThaiUngVienRequest request) =>
        Ok(await _service.CapNhatTrangThaiUngVienAsync(maDK, request.TrangThai, await PhamViCongTyAsync()));

    [HttpGet("phong-van/{maCongTy}")]
    public async Task<IActionResult> GetDanhSachPhongVan(string maCongTy, [FromQuery] string? maDot) =>
        Ok(await _service.GetPhongVanAsync(maCongTy, await PhamViCongTyAsync(), maDot));

    [HttpPost("phong-van")]
    [Authorize(Roles = $"{Roles.DaiDienDN},{Roles.Khoa}")]
    public async Task<IActionResult> TaoPhongVan([FromBody] TaoPhongVanRequest request) =>
        Ok(await _service.TaoPhongVanAsync(request, await PhamViCongTyAsync()));

    [HttpPut("phong-van/{maPV}")]
    [Authorize(Roles = $"{Roles.DaiDienDN},{Roles.Khoa}")]
    public async Task<IActionResult> DoiLichPhongVan(string maPV, [FromBody] DoiLichPhongVanRequest request) =>
        Ok(await _service.DoiLichPhongVanAsync(maPV, request, await PhamViCongTyAsync()));

    /// <summary>Cập nhật kết quả phỏng vấn; "Dat" tạo quyết định tiếp nhận và tự đóng tuyển khi đủ chỉ tiêu.</summary>
    [HttpPut("phong-van/{maPV}/ket-qua")]
    [Authorize(Roles = $"{Roles.DaiDienDN},{Roles.Khoa}")]
    public async Task<IActionResult> CapNhatKetQuaPhongVan(string maPV, [FromBody] CapNhatKetQuaPhongVanRequest request)
    {
        var source = User.IsInRole(Roles.DaiDienDN) ? "DoanhNghiep" : request.Nguon;
        if (source == null || (!User.IsInRole(Roles.DaiDienDN) && source == "DoanhNghiep"))
            return BadRequest(new { message = "Khoa cần ghi rõ nguồn DN thông báo hoặc SV trình bày." });
        var result = await _service.CapNhatKetQuaPhongVanAsync(maPV, request.KetQua, await PhamViCongTyAsync(),
            request.LyDo, User.MaTaiKhoan() ?? throw new UnauthorizedAccessException(), source, request.MaDK);
        return result.ThanhCong ? Ok(result) : BadRequest(new { success = false, message = result.Message });
    }

    [HttpGet("thuc-tap-sinh/{maCongTy}")]
    public async Task<IActionResult> GetDanhSachThucTapSinh(string maCongTy, [FromQuery] string? maDot) =>
        Ok(await _service.GetThucTapSinhAsync(maCongTy, await PhamViCongTyAsync(), maDot));

    [HttpGet("phong-van/{maPV}/lich-su")]
    public async Task<IActionResult> InterviewHistory(string maPV) =>
        Ok(await _service.GetLichSuPhongVanAsync(maPV, await PhamViCongTyAsync()));

    [HttpPut("phong-van/{maPV}/sua-ket-qua")]
    [Authorize(Roles = $"{Roles.DaiDienDN},{Roles.Khoa}")]
    public async Task<IActionResult> CorrectInterview(string maPV, DieuChinhPhongVanRequest request)
    {
        var source = User.IsInRole(Roles.DaiDienDN) ? "DoanhNghiep" : request.Nguon ?? "";
        return Ok(await _service.SuaKetQuaPhongVanAsync(maPV, request, await PhamViCongTyAsync(),
            User.MaTaiKhoan() ?? throw new UnauthorizedAccessException(), source));
    }

    [HttpPost("phong-van/{maPV}/xep-lai")]
    [Authorize(Roles = $"{Roles.DaiDienDN},{Roles.Khoa}")]
    public async Task<IActionResult> RetryInterview(string maPV, DieuChinhPhongVanRequest request)
    {
        var source = User.IsInRole(Roles.DaiDienDN) ? "DoanhNghiep" : request.Nguon ?? "";
        return Ok(await _service.XepLaiPhongVanAsync(maPV, request, await PhamViCongTyAsync(),
            User.MaTaiKhoan() ?? throw new UnauthorizedAccessException(), source));
    }

    [HttpPost("danh-gia")]
    [Authorize(Roles = Roles.DaiDienDN)]
    public async Task<IActionResult> DanhGiaThucTapSinh([FromBody] DanhGiaThucTapSinhRequest request) =>
        Ok(await _service.DanhGiaThucTapSinhAsync(request, User.MaDaiDien(), await PhamViCongTyAsync()));
}
