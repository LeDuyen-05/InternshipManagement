using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.DoanhNghiep;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/khoa/phong-van"), Authorize(Roles = Roles.Khoa)]
public class KhoaPhongVanController(DoanhNghiepService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string maDot) => Ok(await service.GetPhongVanForFacultyAsync(maDot));
}
