using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.DTOs.DangKyThucTap;
using InternshipManagement.BLL.Services.DangKyThucTap;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CongTyController : ControllerBase
{
    private readonly IDangKyThucTapService _service;

    public CongTyController(IDangKyThucTapService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetDanhSachTuyenDung()
    {
        var list = await _service.GetDanhSachCongTyTuyenDungAsync();
        return Ok(list);
    }

    /// <summary>Các doanh nghiệp sinh viên đang đăng nhập đã tự đề xuất, kèm trạng thái Khoa duyệt.</summary>
    [HttpGet("de-xuat/cua-toi")]
    [Authorize(Roles = Roles.SinhVien)]
    public async Task<IActionResult> GetDeXuatCuaToi()
    {
        var maSV = User.MaSV() ?? throw new UnauthorizedAccessException();
        return Ok(await _service.GetDeXuatCuaSinhVienAsync(maSV));
    }

    [HttpPost("de-xuat")]
    [Authorize(Roles = Roles.SinhVien)]
    public async Task<IActionResult> DeXuatCongTy([FromBody] DeXuatCongTyRequest request)
    {
        request.MaSV = User.MaSV() ?? throw new UnauthorizedAccessException();
        var result = await _service.DeXuatCongTyMoiAsync(request);
        return Ok(new { success = true, data = result, message = "Đề xuất doanh nghiệp thành công, đang chờ Khoa thẩm định." });
    }
}
