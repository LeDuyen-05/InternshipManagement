using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.SinhVienTheoDot;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/khoa/ung-tuyen-ho-tro"), Authorize(Roles = Roles.Khoa)]
public class UngTuyenHoTroController(UngTuyenHoTroService service) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> List([FromQuery] UngTuyenHoTroQuery query) => Ok(await service.ListAsync(query));
    [HttpGet("{maSV}")] public async Task<IActionResult> Detail(string maSV, [FromQuery] string maDot) => Ok(await service.DetailAsync(maDot, maSV));
}
