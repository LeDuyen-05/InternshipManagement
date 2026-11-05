using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/khoa/phan-cong"), Authorize(Roles = Roles.Khoa)]
public class AssignmentListsController(AssignmentListService service) : ControllerBase
{
    [HttpGet("paged")]
    public async Task<IActionResult> List([FromQuery] AssignmentListQuery query, CancellationToken ct) => Ok(await service.ListAsync(query, ct));
    [HttpGet("export-rows")]
    public async Task<IActionResult> Export([FromQuery] AssignmentListQuery query, CancellationToken ct) => Ok(await service.ExportRowsAsync(query, ct));
}
