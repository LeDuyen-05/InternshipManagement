using InternshipManagement.BLL.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DotThucTapController : ControllerBase
{
    private readonly AdminService _adminService;

    public DotThucTapController(AdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var rounds = await _adminService.RoundsAsync();
        var dtos = rounds.Select(r => new
        {
            maSo = r.MaSo,
            tenDot = r.TenDot,
            namHoc = r.NamHoc,
            thoiGianBD = r.ThoiGianBD,
            thoiGianKT = r.ThoiGianKT,
            trangThai = r.TrangThai
        });
        return Ok(dtos);
    }
}
