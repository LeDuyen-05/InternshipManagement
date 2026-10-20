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
    public async Task<IActionResult> GetTongQuan(string maCongTy) =>
        Ok(await _service.GetTongQuanAsync(maCongTy, await PhamViCongTyAsync()));

    [HttpGet("tin-tuyen-dung/{maCongTy}")]
    public async Task<IActionResult> GetTinTuyenDung(string maCongTy) =>
        Ok(await _service.GetTinTuyenDungAsync(maCongTy, await PhamViCongTyAsync()));

    [HttpPost("tin-tuyen-dung")]
    public async Task<IActionResult> LuuTinTuyenDung([FromBody] CapNhatTinTuyenDungRequest request) =>
        Ok(await _service.LuuTinTuyenDungAsync(request, await PhamViCongTyAsync()));

    [HttpGet("ung-vien/{maCongTy}")]
    public async Task<IActionResult> GetDanhSachUngVien(string maCongTy) =>
        Ok(await _service.GetUngVienAsync(maCongTy, await PhamViCongTyAsync()));

    [HttpPut("ung-vien/{maDK}/trang-thai")]
    public async Task<IActionResult> CapNhatTrangThaiUngVien(string maDK, [FromBody] CapNhatTrangThaiUngVienRequest request) =>
        Ok(await _service.CapNhatTrangThaiUngVienAsync(maDK, request.TrangThai, await PhamViCongTyAsync()));

    [HttpGet("phong-van/{maCongTy}")]
    public async Task<IActionResult> GetDanhSachPhongVan(string maCongTy) =>
        Ok(await _service.GetPhongVanAsync(maCongTy, await PhamViCongTyAsync()));

    [HttpPost("phong-van")]
    public async Task<IActionResult> TaoPhongVan([FromBody] TaoPhongVanRequest request) =>
        Ok(await _service.TaoPhongVanAsync(request, await PhamViCongTyAsync()));

    /// <summary>Cập nhật kết quả phỏng vấn; "Dat" tạo quyết định tiếp nhận và tự đóng tuyển khi đủ chỉ tiêu.</summary>
    [HttpPut("phong-van/{maPV}/ket-qua")]
    public async Task<IActionResult> CapNhatKetQuaPhongVan(string maPV, [FromBody] CapNhatKetQuaPhongVanRequest request)
    {
        var result = await _service.CapNhatKetQuaPhongVanAsync(maPV, request.KetQua, await PhamViCongTyAsync());
        return result.ThanhCong ? Ok(result) : BadRequest(new { success = false, message = result.Message });
    }

    [HttpGet("thuc-tap-sinh/{maCongTy}")]
    public async Task<IActionResult> GetDanhSachThucTapSinh(string maCongTy) =>
        Ok(await _service.GetThucTapSinhAsync(maCongTy, await PhamViCongTyAsync()));

    /// <summary>Đơn vị thực tập chấm Phiếu nhận xét (CLO4.1, CLO4.2).</summary>
    [HttpPost("danh-gia")]
    public async Task<IActionResult> DanhGiaThucTapSinh([FromBody] DanhGiaThucTapSinhRequest request) =>
        Ok(await _service.DanhGiaThucTapSinhAsync(request,
            User.IsInRole(Roles.DaiDienDN) ? User.MaDaiDien() : null,
            await PhamViCongTyAsync()));
}
