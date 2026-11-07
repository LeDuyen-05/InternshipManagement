using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/admin/khoa"), Authorize(Roles = Roles.QuanTriVien)]
public sealed class DanhMucKhoaController(KhoaService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await service.ListAsync(ct));

    [HttpPost]
    public async Task<IActionResult> Create(SaveKhoaRequest request, CancellationToken ct) => Ok(await service.CreateAsync(request, ct));

    [HttpPut("{maKhoa}")]
    public async Task<IActionResult> Update(string maKhoa, SaveKhoaRequest request, CancellationToken ct) => Ok(await service.UpdateAsync(maKhoa, request, ct));
}
