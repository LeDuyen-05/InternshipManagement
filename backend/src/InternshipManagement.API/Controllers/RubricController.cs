using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.DAL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/khoa/bo-tieu-chi"), Authorize(Roles = Roles.Khoa)]
public class RubricController(RubricService service) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> List([FromQuery] string? maLoaiThucTap) => Ok(await service.ListAsync(maLoaiThucTap));
    [HttpGet("{id}")] public async Task<IActionResult> Detail(string id) => Ok(await service.DetailAsync(id));
    [HttpPost] public async Task<IActionResult> Create(CreateRubricRequest request)
    { await service.CreateAsync(request, User.MaTaiKhoan() ?? throw new UnauthorizedAccessException()); return Ok(new { request.MaRubric }); }
    [HttpPost("{id}/phat-hanh")] public async Task<IActionResult> Publish(string id, RubricVersionRequest request)
    { await service.SetStatusAsync(id, request, "PhatHanh", User.MaTaiKhoan() ?? throw new UnauthorizedAccessException()); return NoContent(); }
    [HttpPost("{id}/ngung-ap-dung")] public async Task<IActionResult> Retire(string id, RubricVersionRequest request)
    { await service.SetStatusAsync(id, request, "NgungApDung", User.MaTaiKhoan() ?? throw new UnauthorizedAccessException()); return NoContent(); }
}

[ApiController, Route("api/loai-thuc-tap"), Authorize]
public class LoaiThucTapController(LoaiThucTapService service) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> List(CancellationToken ct) => Ok(await service.ListAsync(ct));

    // Danh mục dùng chung toàn trường nên chỉ Quản trị viên thêm/sửa.
    [HttpPost, Authorize(Roles = Roles.QuanTriVien)]
    public async Task<IActionResult> Create(SaveLoaiThucTapRequest request, CancellationToken ct) => Ok(await service.CreateAsync(request, ct));

    [HttpPut("{maLoai}"), Authorize(Roles = Roles.QuanTriVien)]
    public async Task<IActionResult> Update(string maLoai, SaveLoaiThucTapRequest request, CancellationToken ct) => Ok(await service.UpdateAsync(maLoai, request, ct));
}
