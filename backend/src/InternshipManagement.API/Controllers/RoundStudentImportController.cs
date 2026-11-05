using System.Text;
using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/nhap-sinh-vien"), Authorize(Roles = Roles.QuanTriVien + "," + Roles.Khoa)]
public class RoundStudentImportController(RoundStudentImportService service, AdminService admin) : ControllerBase
{
    private string Actor => User.MaTaiKhoan() ?? throw new UnauthorizedAccessException();
    [HttpGet("dot-thuc-tap")] public async Task<IActionResult> Rounds() => Ok(await admin.RoundsAsync());
    [HttpGet("lich-su")] public async Task<IActionResult> History([FromQuery] string maDot, [FromQuery] int page = 1) => Ok(await service.HistoryAsync(maDot, Actor, page));
    [HttpGet("mau-csv")] public IActionResult Template() => File(Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes("maSV,hoTen,lop,khoaHoc,gpa,chuyenNganh,kyNang,congNghe,duAnDaThucHien,dungHoSoHienCo\r\n")).ToArray(), "text/csv; charset=utf-8", "mau-sinh-vien-theo-dot.csv");
    [HttpPost("xem-truoc"), RequestSizeLimit(5_242_880)]
    public async Task<IActionResult> Preview(RoundImportRequest request) => Ok(await service.PreviewAsync(request, Actor));
    [HttpPost("xem-truoc-csv"), Consumes("multipart/form-data"), RequestSizeLimit(5_242_880)]
    public async Task<IActionResult> Csv([FromForm] string maDot, [FromForm] string cheDo, IFormFile file)
    {
        if (file == null || file.Length is < 1 or > 5_000_000 || !Path.GetExtension(file.FileName).Equals(".csv", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Chọn CSV UTF-8 tối đa 5 MB; XLSX ánh xạ thành rows JSON ở FE." });
        using var reader = new StreamReader(file.OpenReadStream(), new UTF8Encoding(false, true), true);
        string csv; try { csv = await reader.ReadToEndAsync(); } catch (DecoderFallbackException) { return BadRequest(new { message = "CSV phải có mã hóa UTF-8." }); }
        return Ok(await service.PreviewAsync(RoundStudentImportService.FromCsv(maDot, cheDo, csv, Path.GetFileName(file.FileName)), Actor));
    }
    [HttpGet("{id}")] public async Task<IActionResult> Get(string id) => Ok(await service.GetAsync(id, Actor));
    [HttpPost("{id}/xac-nhan")] public async Task<IActionResult> Commit(string id, RoundImportCommitRequest request)
    { var result = await service.CommitAsync(id, request, Actor); return result.ThanhCong ? Ok(result) : UnprocessableEntity(result); }
}
