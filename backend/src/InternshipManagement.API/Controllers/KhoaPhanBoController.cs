using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.PhanBo;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/khoa/phan-bo"), Authorize(Roles = Roles.Khoa)]
public class KhoaPhanBoController(KhoaChotPhanBoService service, DieuChinhNoiThucTapService dieuChinh, PlacementPeriodService periods) : ControllerBase
{
    [HttpPut("{id}/thoi-gian")]
    public async Task<IActionResult> Period(string id, SavePlacementPeriodRequest request)
    {
        await periods.SaveAsync(id, request, User.MaTaiKhoan() ?? throw new UnauthorizedAccessException());
        return Ok(new { message = "Đã ghi nhận thời gian tại DN và lịch sử xác minh." });
    }
    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] string maDot) => Ok(await service.GetListAsync(maDot));

    [HttpPost("{id}/chot")]
    public async Task<IActionResult> Chot(string id, ChotPhanBoRequest request)
    {
        await service.ChotAsync(id, request.MaDot, User.MaTaiKhoan() ?? throw new UnauthorizedAccessException());
        return Ok(new { message = "Đã chốt phân bổ. Sinh viên được đưa vào danh sách phân công GVHD; tình trạng thực tập còn phụ thuộc thời gian tại DN đã xác minh." });
    }

    [HttpGet("dieu-chinh")]
    public async Task<IActionResult> Policy([FromQuery] string maDot) => Ok(await dieuChinh.GetPolicyAsync(maDot));

    [HttpPost("dieu-chinh/han")]
    public async Task<IActionResult> Deadline(DatHanDieuChinhRequest request)
    {
        await dieuChinh.SetDeadlineAsync(request, User.MaTaiKhoan() ?? throw new UnauthorizedAccessException());
        return Ok(new { message = "Đã lưu hạn điều chỉnh và nhật ký căn cứ." });
    }

    [HttpGet("lich-su")]
    public async Task<IActionResult> History([FromQuery] string maDot, [FromQuery] string maSV) => Ok(await dieuChinh.GetHistoryAsync(maDot, maSV));

    [HttpGet("cong-ty-phan-bo-lai")]
    public async Task<IActionResult> Companies([FromQuery] string maDot) => Ok(await dieuChinh.GetCompaniesAsync(maDot));

    [HttpPost("{id}/huy")]
    public async Task<IActionResult> Cancel(string id, HuyNoiThucTapRequest request)
    {
        await dieuChinh.CancelAsync(id, request, User.MaTaiKhoan() ?? throw new UnauthorizedAccessException());
        return Ok(new { message = "Đã hủy nơi thực tập, giữ lịch sử và đưa vào danh sách cần phân bổ lại." });
    }

    [HttpPost("{id}/phan-bo-lai")]
    public async Task<IActionResult> Reallocate(string id, PhanBoLaiRequest request) => Ok(new
    {
        maPhanBo = await dieuChinh.ReallocateAsync(id, request, User.MaTaiKhoan() ?? throw new UnauthorizedAccessException())
    });

    [HttpPost("{id}/xu-ly-rieng")]
    public async Task<IActionResult> Separate(string id, GhiNhanXuLyRiengRequest request)
    {
        await dieuChinh.RecordSeparateReviewAsync(id, request, User.MaTaiKhoan() ?? throw new UnauthorizedAccessException());
        return Ok(new { message = "Đã ghi nhận hồ sơ cần xử lý riêng; chưa thay đổi nơi thực tập hoặc điểm." });
    }
}
