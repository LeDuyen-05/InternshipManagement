﻿using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.DTOs.Admin;
using InternshipManagement.BLL.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/admin"), Authorize(Roles = "QuanTriVien")]
public class AdminController(AdminService service, EnterpriseRepresentativeService representatives) : ControllerBase
{
    [HttpGet("enterprise-onboarding")]
    public async Task<IActionResult> EnterpriseOnboarding() => Ok(await representatives.GetAsync());

    [HttpPost("enterprise-representatives")]
    public async Task<IActionResult> CreateRepresentative(CreateRepresentativeRequest request) => Ok(await representatives.CreateAsync(request));

    [HttpPut("enterprise-representatives/{id}")]
    public async Task<IActionResult> UpdateRepresentative(string id, UpdateRepresentativeRequest request) => Ok(await representatives.UpdateAsync(id, request));

    [HttpGet("accounts")]
    public async Task<IActionResult> Accounts() => Ok(await service.AccountsAsync());

    [HttpPost("accounts")]
    public async Task<IActionResult> CreateAccount(CreateAccountRequest r)
    {
        await service.CreateAccountAsync(r, User.IsInRole(Infrastructure.Roles.QuanTriVien), User.MaTaiKhoan());
        return Ok();
    }

    [HttpPut("accounts/{id}")]
    public async Task<IActionResult> UpdateAccount(string id, UpdateAccountRequest r)
    {
        await service.UpdateAccountAsync(id, r, User.IsInRole(Infrastructure.Roles.QuanTriVien), User.MaTaiKhoan());
        return Ok();
    }

    [HttpPost("accounts/{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(string id, [FromBody] ResetPasswordRequest? r)
    {
        var newPass = await service.ResetPasswordAsync(id, r, User.IsInRole(Infrastructure.Roles.QuanTriVien), User.MaTaiKhoan());
        return Ok(new { message = "Đã đặt lại mật khẩu cho tài khoản thành công.", matKhauMoi = newPass });
    }

    [HttpGet("roles")]
    public async Task<IActionResult> Roles() => Ok(await service.RolesAsync());
}

[ApiController, Route("api/khoa"), Authorize(Roles = "Khoa")]
public class KhoaController(AdminService service, CatalogImportService imports) : ControllerBase
{
    [HttpGet("danh-muc/{loai}/mau-csv")]
    public IActionResult CatalogTemplate(string loai)
    {
        if (!CatalogImportService.Templates.TryGetValue(loai, out var header)) return NotFound(new { message = "Danh mục chỉ nhận sv, gv hoặc cong-ty." });
        var bytes = new System.Text.UTF8Encoding(true).GetBytes(header + "\r\n");
        return File(bytes, "text/csv; charset=utf-8", $"mau-{loai}.csv");
    }

    [HttpGet("danh-muc/{loai}/export-csv")]
    public async Task<IActionResult> ExportCatalog(string loai)
    {
        try
        {
            var csv = await imports.ExportAsync(loai);
            return File(new System.Text.UTF8Encoding(true).GetBytes(csv), "text/csv; charset=utf-8", $"danh-sach-{loai}.csv");
        }
        catch (ArgumentException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPost("danh-muc/{loai}/import"), RequestSizeLimit(5_242_880)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> ImportCatalog(string loai, IFormFile? file)
    {
        if (file is null || file.Length == 0) return BadRequest(new { message = "Chọn file CSV không rỗng." });
        if (file.Length > 5_242_880) return BadRequest(new { message = "File CSV tối đa 5 MB." });
        if (!string.Equals(Path.GetExtension(file.FileName), ".csv", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Chỉ nhận file CSV; hãy dùng mẫu tải từ màn hình." });
        try
        {
            await using var stream = file.OpenReadStream();
            using var reader = new StreamReader(stream, new System.Text.UTF8Encoding(false, true), detectEncodingFromByteOrderMarks: true);
            var csv = await reader.ReadToEndAsync();
            var result = await imports.ImportAsync(loai, csv);
            if (result.Loi.Count > 0) return UnprocessableEntity(new { soLuongNhap = 0, loi = result.Loi });
            return Ok(new { soLuongNhap = result.SoLuongNhap, loi = Array.Empty<CatalogImportError>() });
        }
        catch (System.Text.DecoderFallbackException) { return BadRequest(new { message = "File phải được mã hóa UTF-8." }); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("tong-quan")]
    public async Task<IActionResult> Overview([FromQuery] string? maDot) => Ok(await service.KhoaOverviewAsync(maDot));

    [HttpGet("dang-ky")]
    public async Task<IActionResult> Registrations([FromQuery] string? maDot) => Ok(await service.RegistrationsAsync(maDot));

    [HttpPut("dang-ky/{id}/duyet")]
    public async Task<IActionResult> ApproveRegistration(string id, RegistrationApprovalRequest r)
    {
        try
        {
            await service.ApproveRegistrationAsync(id, r);
            return Ok(new { success = true });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("theo-doi/{id}/duyet")]
    public async Task<IActionResult> ApproveProgress(string id, ReportApprovalRequest r)
    {
        await service.ApproveProgressAsync(id, r);
        return Ok();
    }

    [HttpPost("bao-cao/tao-moc")]
    public async Task<IActionResult> GenerateReportSlots(GenerateReportSlotsRequest r)
    {
        var count = await service.GenerateReportSlotsAsync(r);
        return Ok(new { success = true, createdCount = count, message = $"Đã tạo {count} mốc báo cáo tiến độ." });
    }

    [HttpGet("phan-cong")]
    public async Task<IActionResult> Assignments([FromQuery] string? maDot) => Ok(await service.AssignmentsAsync(maDot));

    [HttpPut("phan-cong/{maSV}")]
    public async Task<IActionResult> AssignSupervisor(string maSV, SupervisorAssignmentRequest r)
    {
        await service.AssignSupervisorAsync(maSV, r);
        return Ok();
    }

    [HttpGet("theo-doi")]
    public async Task<IActionResult> Progress([FromQuery] string? maDot) => Ok(await service.ProgressAsync(maDot));

    [HttpGet("han-bao-cao")]
    public async Task<IActionResult> Deadlines([FromQuery] string? maDot) => Ok(await service.DeadlinesAsync(maDot));

    [HttpPut("han-bao-cao/{maDot}")]
    public async Task<IActionResult> UpdateDeadline(string maDot, DeadlineUpdateRequest r)
    {
        await service.UpdateDeadlineAsync(maDot, r, User.MaTaiKhoan());
        return Ok();
    }

    [HttpGet("sinh-vien")]
    public async Task<IActionResult> Students() => Ok(await service.StudentsAsync());

    [HttpPost("sinh-vien")]
    public async Task<IActionResult> CreateStudent(CreateStudentRequest r)
    {
        await service.CreateStudentAsync(r);
        return Ok();
    }

    [HttpPut("sinh-vien/{id}")]
    public async Task<IActionResult> UpdateStudent(string id, CreateStudentRequest r)
    {
        await service.UpdateStudentAsync(id, r);
        return Ok();
    }

    [HttpGet("giang-vien")]
    public async Task<IActionResult> Lecturers() => Ok(await service.LecturersAsync());

    [HttpPost("giang-vien")]
    public async Task<IActionResult> CreateLecturer(CreateLecturerRequest r)
    {
        await service.CreateLecturerAsync(r);
        return Ok();
    }

    [HttpPut("giang-vien/{id}")]
    public async Task<IActionResult> UpdateLecturer(string id, CreateLecturerRequest r)
    {
        await service.UpdateLecturerAsync(id, r);
        return Ok();
    }

    [HttpGet("cong-ty")]
    public async Task<IActionResult> Companies() => Ok(await service.CompaniesAsync());

    [HttpPost("cong-ty")]
    public async Task<IActionResult> CreateCompany(CreateCompanyRequest r)
    {
        await service.CreateCompanyAsync(r);
        return Ok();
    }

    [HttpPut("cong-ty/{id}")]
    public async Task<IActionResult> UpdateCompany(string id, CreateCompanyRequest r)
    {
        await service.UpdateCompanyAsync(id, r);
        return Ok();
    }

    [HttpPut("cong-ty/{id}/duyet")]
    public async Task<IActionResult> ApproveCompany(string id, ApprovalRequest r)
    {
        await service.ApproveCompanyAsync(id, r);
        return Ok();
    }

    [HttpGet("dot-thuc-tap")]
    public async Task<IActionResult> Rounds() => Ok(await service.RoundsAsync());

    [HttpPost("dot-thuc-tap")]
    public async Task<IActionResult> CreateRound(CreateInternshipRoundRequest r)
    {
        await service.CreateRoundAsync(r);
        return Ok();
    }

    [HttpPut("dot-thuc-tap/{id}")]
    public async Task<IActionResult> UpdateRound(string id, UpdateRoundRequest r)
    {
        await service.UpdateRoundAsync(id, r);
        return Ok();
    }

    [HttpGet("clo")]
    public async Task<IActionResult> Clo([FromQuery] string? maDot) => Ok(await service.CloAnalyticsAsync(maDot));

    [HttpPut("clo/{id}")]
    public async Task<IActionResult> SaveCloAssessment(string id, SaveAssessmentRequest r)
    {
        await service.SaveAssessmentAsync(id, r);
        return Ok();
    }

    [HttpGet("tieu-chi")]
    public async Task<IActionResult> Criteria() => Ok(await service.CriteriaAsync());

    [HttpPost("tieu-chi")]
    public async Task<IActionResult> CreateCriteria(SaveCriteriaRequest r)
    {
        await service.CreateCriteriaAsync(r);
        return Ok();
    }

    [HttpPut("tieu-chi/{id}")]
    public async Task<IActionResult> UpdateCriteria(string id, SaveCriteriaRequest r)
    {
        await service.UpdateCriteriaAsync(id, r);
        return Ok();
    }

    [HttpDelete("tieu-chi/{id}")]
    public async Task<IActionResult> DeleteCriteria(string id)
    {
        await service.DeleteCriteriaAsync(id);
        return Ok();
    }

    [HttpGet("thong-bao")]
    public async Task<IActionResult> Notifications() => Ok(await service.NotificationsAsync());

    [HttpPost("thong-bao")]
    public async Task<IActionResult> SendNotification(SendNotificationRequest r)
    {
        await service.SendNotificationAsync(r, User.FindFirst("sub")?.Value);
        return Ok();
    }
}
