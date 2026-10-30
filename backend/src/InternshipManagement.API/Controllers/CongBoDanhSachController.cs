using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.SinhVienTheoDot;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Authorize]
public class CongBoDanhSachController(CongBoDanhSachService service) : ControllerBase
{
    [HttpGet("api/khoa/danh-sach-du-kien"), Authorize(Roles = Roles.Khoa)]
    public async Task<IActionResult> FacultyGet([FromQuery] string maDot) => Ok(await service.FacultyGetAsync(maDot));
    [HttpPost("api/khoa/danh-sach-du-kien/cong-bo"), Authorize(Roles = Roles.Khoa)]
    public async Task<IActionResult> Publish([FromQuery] string maDot, CongBoDuKienRequest request)
        => Ok(new { maCongBo = await service.PublishAsync(maDot, request, User.MaTaiKhoan() ?? throw new UnauthorizedAccessException()) });
    [HttpPost("api/khoa/danh-sach-du-kien/yeu-cau/{maPhanHoi}/xu-ly"), Authorize(Roles = Roles.Khoa)]
    public async Task<IActionResult> Process([FromQuery] string maDot, string maPhanHoi, XuLyYeuCauDanhSachRequest request)
    { await service.ProcessAsync(maDot, maPhanHoi, request, User.MaTaiKhoan() ?? throw new UnauthorizedAccessException()); return Ok(new { message = "Đã xử lý yêu cầu chỉnh sửa." }); }
    [HttpPost("api/khoa/danh-sach-du-kien/chot-chinh-thuc"), Authorize(Roles = Roles.Khoa)]
    public async Task<IActionResult> FinalizeRoster([FromQuery] string maDot, ChotDanhSachChinhThucRequest request)
    { await service.FinalizeAsync(maDot, request, User.MaTaiKhoan() ?? throw new UnauthorizedAccessException()); return Ok(new { message = "Đã chốt và công bố danh sách chính thức. Danh sách đã khóa chỉnh sửa." }); }
    [HttpGet("api/sinh-vien/danh-sach-du-kien"), Authorize(Roles = Roles.SinhVien)]
    public async Task<IActionResult> StudentGet([FromQuery] string maDot)
        => Ok(await service.StudentGetAsync(maDot, User.MaSV() ?? throw new UnauthorizedAccessException()));
    [HttpPost("api/sinh-vien/danh-sach-du-kien/phan-hoi"), Authorize(Roles = Roles.SinhVien)]
    public async Task<IActionResult> Feedback([FromQuery] string maDot, GuiPhanHoiDanhSachRequest request)
    { await service.FeedbackAsync(maDot, User.MaSV() ?? throw new UnauthorizedAccessException(), request, User.MaTaiKhoan() ?? throw new UnauthorizedAccessException()); return Ok(new { message = "Đã gửi phản hồi cho Khoa." }); }
}
