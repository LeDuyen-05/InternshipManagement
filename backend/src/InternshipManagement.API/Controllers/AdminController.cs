using InternshipManagement.BLL.DTOs.Admin;
using InternshipManagement.BLL.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/admin"), Authorize(Roles="QuanTriVien")]
public class AdminController(AdminService service) : ControllerBase
{
    [HttpGet("accounts")] public async Task<IActionResult> Accounts()=>Ok(await service.AccountsAsync());
    [HttpPost("accounts")] public async Task<IActionResult> CreateAccount(CreateAccountRequest r){try{await service.CreateAccountAsync(r);return Ok();}catch(Exception e){return BadRequest(new{message=e.Message});}}
    [HttpPut("accounts/{id}")] public async Task<IActionResult> UpdateAccount(string id, UpdateAccountRequest r){try{await service.UpdateAccountAsync(id,r);return Ok();}catch(Exception e){return BadRequest(new{message=e.Message});}}
    [HttpGet("roles")] public async Task<IActionResult> Roles()=>Ok(await service.RolesAsync());
}

[ApiController, Route("api/khoa"), Authorize(Roles="Khoa,QuanTriVien")]
public class KhoaController(AdminService service) : ControllerBase
{
    [HttpGet("tong-quan")] public async Task<IActionResult> Overview() => Ok(await service.KhoaOverviewAsync());
    [HttpGet("dang-ky")] public async Task<IActionResult> Registrations([FromQuery] string? maDot) => Ok(await service.RegistrationsAsync(maDot));
    [HttpPut("dang-ky/{id}/duyet")] public async Task<IActionResult> ApproveRegistration(string id, RegistrationApprovalRequest r) { try { await service.ApproveRegistrationAsync(id,r); return Ok(); } catch(Exception e) { return BadRequest(new{message=e.Message}); } }
    [HttpPut("theo-doi/{id}/duyet")] public async Task<IActionResult> ApproveProgress(string id, ReportApprovalRequest r) { try { await service.ApproveProgressAsync(id,r); return Ok(); } catch(Exception e) { return BadRequest(new{message=e.Message}); } }
    [HttpGet("phan-cong")] public async Task<IActionResult> Assignments([FromQuery] string? maDot) => Ok(await service.AssignmentsAsync(maDot));
    [HttpPut("phan-cong/{maSV}")] public async Task<IActionResult> AssignSupervisor(string maSV, SupervisorAssignmentRequest r) { try { await service.AssignSupervisorAsync(maSV,r); return Ok(); } catch(Exception e) { return BadRequest(new{message=e.Message}); } }
    [HttpGet("theo-doi")] public async Task<IActionResult> Progress([FromQuery] string? maDot) => Ok(await service.ProgressAsync(maDot));
    [HttpGet("han-bao-cao")] public async Task<IActionResult> Deadlines([FromQuery] string? maDot) => Ok(await service.DeadlinesAsync(maDot));
    [HttpPut("han-bao-cao/{maDot}")] public async Task<IActionResult> UpdateDeadline(string maDot, DeadlineUpdateRequest r) { try { await service.UpdateDeadlineAsync(maDot,r); return Ok(); } catch(Exception e) { return BadRequest(new{message=e.Message}); } }
    [HttpGet("sinh-vien")] public async Task<IActionResult> Students()=>Ok(await service.StudentsAsync());
    [HttpPost("sinh-vien")] public async Task<IActionResult> CreateStudent(CreateStudentRequest r){try{await service.CreateStudentAsync(r);return Ok();}catch(Exception e){return BadRequest(new{message=e.Message});}}
    [HttpPut("sinh-vien/{id}")] public async Task<IActionResult> UpdateStudent(string id, CreateStudentRequest r){try{await service.UpdateStudentAsync(id,r);return Ok();}catch(Exception e){return BadRequest(new{message=e.Message});}}
    [HttpGet("giang-vien")] public async Task<IActionResult> Lecturers()=>Ok(await service.LecturersAsync());
    [HttpPost("giang-vien")] public async Task<IActionResult> CreateLecturer(CreateLecturerRequest r){try{await service.CreateLecturerAsync(r);return Ok();}catch(Exception e){return BadRequest(new{message=e.Message});}}
    [HttpPut("giang-vien/{id}")] public async Task<IActionResult> UpdateLecturer(string id, CreateLecturerRequest r){try{await service.UpdateLecturerAsync(id,r);return Ok();}catch(Exception e){return BadRequest(new{message=e.Message});}}
    [HttpGet("cong-ty")] public async Task<IActionResult> Companies()=>Ok(await service.CompaniesAsync());
    [HttpPost("cong-ty")] public async Task<IActionResult> CreateCompany(CreateCompanyRequest r){try{await service.CreateCompanyAsync(r);return Ok();}catch(Exception e){return BadRequest(new{message=e.Message});}}
    [HttpPut("cong-ty/{id}")] public async Task<IActionResult> UpdateCompany(string id, CreateCompanyRequest r){try{await service.UpdateCompanyAsync(id,r);return Ok();}catch(Exception e){return BadRequest(new{message=e.Message});}}
    [HttpPut("cong-ty/{id}/duyet")] public async Task<IActionResult> ApproveCompany(string id, ApprovalRequest r){try{await service.ApproveCompanyAsync(id,r);return Ok();}catch(Exception e){return BadRequest(new{message=e.Message});}}
    [HttpGet("dot-thuc-tap")] public async Task<IActionResult> Rounds()=>Ok(await service.RoundsAsync());
    [HttpPost("dot-thuc-tap")] public async Task<IActionResult> CreateRound(CreateInternshipRoundRequest r){try{await service.CreateRoundAsync(r);return Ok();}catch(Exception e){return BadRequest(new{message=e.Message});}}
    [HttpPut("dot-thuc-tap/{id}")] public async Task<IActionResult> UpdateRound(string id, UpdateRoundRequest r){try{await service.UpdateRoundAsync(id,r);return Ok();}catch(Exception e){return BadRequest(new{message=e.Message});}}
    [HttpGet("tai-khoan")] public async Task<IActionResult> Accounts()=>Ok(await service.AccountsAsync());
    [HttpPost("tai-khoan")] public async Task<IActionResult> CreateAccount(CreateAccountRequest r){try{await service.CreateAccountAsync(r);return Ok();}catch(Exception e){return BadRequest(new{message=e.Message});}}
    [HttpPut("tai-khoan/{id}")] public async Task<IActionResult> UpdateAccount(string id, UpdateAccountRequest r){try{await service.UpdateAccountAsync(id,r);return Ok();}catch(Exception e){return BadRequest(new{message=e.Message});}}
    [HttpGet("vai-tro")] public async Task<IActionResult> Roles()=>Ok(await service.RolesAsync());
    [HttpGet("clo")] public async Task<IActionResult> Clo([FromQuery] string? maDot)=>Ok(await service.CloAnalyticsAsync(maDot));
    [HttpPut("clo/{id}")] public async Task<IActionResult> SaveCloAssessment(string id, SaveAssessmentRequest r){try{await service.SaveAssessmentAsync(id,r);return Ok();}catch(Exception e){return BadRequest(new{message=e.Message});}}
    [HttpGet("tieu-chi")] public async Task<IActionResult> Criteria()=>Ok(await service.CriteriaAsync());
    [HttpPost("tieu-chi")] public async Task<IActionResult> CreateCriteria(SaveCriteriaRequest r){try{await service.CreateCriteriaAsync(r);return Ok();}catch(Exception e){return BadRequest(new{message=e.Message});}}
    [HttpPut("tieu-chi/{id}")] public async Task<IActionResult> UpdateCriteria(string id, SaveCriteriaRequest r){try{await service.UpdateCriteriaAsync(id,r);return Ok();}catch(Exception e){return BadRequest(new{message=e.Message});}}
    [HttpDelete("tieu-chi/{id}")] public async Task<IActionResult> DeleteCriteria(string id){try{await service.DeleteCriteriaAsync(id);return Ok();}catch(Exception e){return BadRequest(new{message=e.Message});}}
    [HttpGet("thong-bao")] public async Task<IActionResult> Notifications()=>Ok(await service.NotificationsAsync());
    [HttpPost("thong-bao")] public async Task<IActionResult> SendNotification(SendNotificationRequest r){try{await service.SendNotificationAsync(r,User.FindFirst("sub")?.Value);return Ok();}catch(Exception e){return BadRequest(new{message=e.Message});}}
}
