using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.SinhVienTheoDot;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/sinh-vien/ho-tro"), Authorize(Roles = Roles.SinhVien)]
public class StudentSupportController(SupportResponseService service) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> List([FromQuery] string maDot) => Ok(await service.StudentAsync(maDot, User.MaSV() ?? throw new UnauthorizedAccessException()));
    [HttpPut("{maLan}/phan-hoi")] public async Task<IActionResult> Respond(string maLan, [FromQuery] string maDot, SupportResponseRequest request)
    { await service.RecordAsync(maDot, maLan, User.MaSV() ?? throw new UnauthorizedAccessException(), request, User.MaTaiKhoan() ?? throw new UnauthorizedAccessException(), true); return NoContent(); }
}

[ApiController, Route("api/khoa/ung-tuyen-ho-tro"), Authorize(Roles = Roles.Khoa)]
public class FacultySupportResponseController(SupportResponseService service, RaSoatNoiService review) : ControllerBase
{
    private string Actor => User.MaTaiKhoan() ?? throw new UnauthorizedAccessException();
    [HttpPost("{maSV}/lan-ho-tro/{maLan}/gioi-thieu-cong-ty")]
    public async Task<IActionResult> Recommend(string maSV, string maLan, [FromQuery] string maDot, RecommendSupportCompanyRequest request)
        => Ok(await service.RecommendAsync(maDot, maLan, maSV, request, Actor));
    [HttpPut("{maSV}/lan-ho-tro/{maLan}/phan-hoi")]
    public async Task<IActionResult> Respond(string maSV, string maLan, [FromQuery] string maDot, SupportResponseRequest request)
    { await service.RecordAsync(maDot, maLan, maSV, request, Actor, false); return NoContent(); }
    [HttpPost("{maSV}/tu-choi-ho-tro/xac-nhan")]
    public async Task<IActionResult> Confirm(string maSV, [FromQuery] string maDot, GhiNhanChuaCoNoiRequest request)
    {
        if (request.ThuHoi || request.MaLyDo != "TuChoiHoTro") return BadRequest(new { message = "Dùng mã TuChoiHoTro; thu hồi qua luồng rà soát nơi hiện có." });
        await review.ConfirmAsync(maDot, maSV, request, Actor); return NoContent();
    }
}
