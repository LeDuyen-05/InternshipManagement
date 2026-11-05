using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.DTOs.Admin;
using InternshipManagement.BLL.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/admin/accounts"), Authorize(Roles = Roles.QuanTriVien)]
public sealed class AdminListsController(AdminListService service) : ControllerBase
{
    private static AdminListQuery Normalize(AdminListQuery query)
    {
        if (query.Page < 1) query.Page = 1;
        if (query.Page > 1_000_000) query.Page = 1_000_000;
        if (query.PageSize < 1) query.PageSize = 20;
        if (query.PageSize > 100) query.PageSize = 100;
        return query;
    }

    [HttpGet("paged")]
    public async Task<IActionResult> Accounts([FromQuery] AdminListQuery query, CancellationToken ct)
        => Ok(await service.AccountsAsync(Normalize(query), ct));

    [HttpGet("export-xlsx")]
    public async Task<IActionResult> Export([FromQuery] AdminListQuery query, CancellationToken ct)
        => File(await service.ExportAsync("accounts", Normalize(query), ct), ExcelMime, "DanhSach_TaiKhoan.xlsx");

    internal const string ExcelMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

[ApiController, Route("api/khoa"), Authorize(Roles = Roles.Khoa)]
public sealed class KhoaListsController(AdminListService service) : ControllerBase
{
    private static AdminListQuery Normalize(AdminListQuery query)
    {
        if (query.Page < 1) query.Page = 1;
        if (query.Page > 1_000_000) query.Page = 1_000_000;
        if (query.PageSize < 1) query.PageSize = 20;
        if (query.PageSize > 100) query.PageSize = 100;
        return query;
    }

    [HttpGet("sinh-vien/paged")]
    public async Task<IActionResult> Students([FromQuery] AdminListQuery query, CancellationToken ct)
        => Ok(await service.StudentsAsync(Normalize(query), ct));

    [HttpGet("dang-ky/paged")]
    public async Task<IActionResult> Registrations([FromQuery] AdminListQuery query, CancellationToken ct)
        => Ok(await service.RegistrationsAsync(Normalize(query), ct));

    [HttpGet("theo-doi/paged")]
    public async Task<IActionResult> Progress([FromQuery] AdminListQuery query, CancellationToken ct)
        => Ok(await service.ProgressAsync(Normalize(query), ct));

    [HttpGet("theo-doi/sinh-vien/paged")]
    public async Task<IActionResult> StudentProgressSummary([FromQuery] AdminListQuery query, CancellationToken ct)
        => Ok(await service.StudentProgressSummaryAsync(Normalize(query), ct));

    [HttpGet("sinh-vien/export-xlsx")]
    public async Task<IActionResult> ExportStudents([FromQuery] AdminListQuery query, CancellationToken ct)
        => await Export("students", "DanhSach_SinhVien", query, ct);

    [HttpGet("dang-ky/export-xlsx")]
    public async Task<IActionResult> ExportRegistrations([FromQuery] AdminListQuery query, CancellationToken ct)
        => await Export("registrations", "DanhSach_DangKy", query, ct);

    [HttpGet("theo-doi/export-xlsx")]
    public async Task<IActionResult> ExportProgress([FromQuery] AdminListQuery query, CancellationToken ct)
        => await Export("progress", "BaoCao_TienDo_ChiTiet", query, ct);

    [HttpGet("theo-doi/sinh-vien/export-xlsx")]
    public async Task<IActionResult> ExportStudentProgressSummary([FromQuery] AdminListQuery query, CancellationToken ct)
        => await Export("student-progress-summary", "TongHop_TienDo_SinhVien", query, ct);

    private async Task<IActionResult> Export(string kind, string name, AdminListQuery query, CancellationToken ct)
        => File(await service.ExportAsync(kind, Normalize(query), ct), AdminListsController.ExcelMime,
            $"{name}_{query.MaDot ?? "TatCa"}.xlsx");
}
