using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.SinhVienTheoDot;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/khoa/lan-ho-tro"), Authorize(Roles = Roles.Khoa)]
public class LanHoTroController(LanHoTroService service) : ControllerBase
{
    private string Actor => User.MaTaiKhoan() ?? throw new UnauthorizedAccessException();
    [HttpGet] public async Task<IActionResult> Get([FromQuery] string maDot) => Ok(await service.GetAsync(maDot));
    [HttpPost] public async Task<IActionResult> Create([FromQuery] string maDot, LuuLanHoTroRequest request)
        => Ok(new { maLan = await service.SaveAsync(maDot, null, request, Actor) });
    [HttpPut("{id}")] public async Task<IActionResult> Update(string id, [FromQuery] string maDot, LuuLanHoTroRequest request)
        => Ok(new { maLan = await service.SaveAsync(maDot, id, request, Actor) });
    [HttpDelete("{id}")] public async Task<IActionResult> Delete(string id, [FromQuery] string maDot, [FromQuery] int phienBan)
    { await service.DeleteAsync(maDot, id, phienBan, Actor); return NoContent(); }
    [HttpPut("{id}/sinh-vien/{maSV}")] public async Task<IActionResult> Result(string id, string maSV, [FromQuery] string maDot, KetQuaHoTroRequest request)
    { await service.ResultAsync(maDot, id, maSV, request, Actor); return NoContent(); }
}
