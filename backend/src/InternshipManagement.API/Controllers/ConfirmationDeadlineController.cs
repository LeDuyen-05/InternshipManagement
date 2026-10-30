using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.PhanBo;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/khoa/xac-nhan-tiep-nhan"), Authorize(Roles = Roles.Khoa)]
public class ConfirmationDeadlineController(ConfirmationDeadlineService service) : ControllerBase
{
    [HttpGet("{maDot}")]
    public async Task<IActionResult> Get(string maDot) => Ok(await service.GetAsync(maDot));
    [HttpPut("{maDot}")]
    public async Task<IActionResult> Save(string maDot, SaveConfirmationDeadlineRequest request)
    {
        await service.SaveAsync(maDot, request, User.MaTaiKhoan() ?? "");
        return Ok(await service.GetAsync(maDot));
    }
    [HttpGet("{maDot}/qua-han")]
    public async Task<IActionResult> Overdue(string maDot) => Ok(await service.OverdueAsync(maDot));
    [HttpGet("{maDot}/lich-su")]
    public async Task<IActionResult> History(string maDot) => Ok(await service.HistoryAsync(maDot));
    [HttpPost("ho-so/{id}/ra-soat")]
    public async Task<IActionResult> Review(string id, ReviewConfirmationRequest request)
    {
        await service.ReviewAsync(id, request, User.MaTaiKhoan() ?? "");
        return Ok(new { message = "Đã lưu căn cứ rà soát. Hồ sơ vẫn giữ chỗ; thay hạn hoặc xử lý nơi thực tập cần thao tác riêng." });
    }
}
