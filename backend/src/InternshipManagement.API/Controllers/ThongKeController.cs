using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.ThongKe;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = Roles.Khoa)]
public class ThongKeController : ControllerBase
{
    private readonly IThongKeService _thongKeService;

    public ThongKeController(IThongKeService thongKeService)
    {
        _thongKeService = thongKeService;
    }

    [HttpGet("bao-cao")]
    public async Task<IActionResult> GetBaoCaoThongKe([FromQuery] string? maDot)
    {
        var result = await _thongKeService.GetBaoCaoThongKeAsync(maDot);
        return Ok(new
        {
            Success = true,
            Message = "Lấy báo cáo thống kê thành công",
            Data = result,
        });
    }

    [HttpGet("export-csv")]
    public async Task<IActionResult> ExportCsv([FromQuery] string? maDot)
    {
        var bytes = await _thongKeService.ExportCsvBangDiemAsync(maDot);
        var fileName = $"BaoCao_CLO_{maDot ?? "TongHop"}_{DateTime.Now:yyyyMMdd_HHmm}.csv";
        return File(bytes, "text/csv; charset=utf-8", fileName);
    }

    [HttpGet("dot-thuc-tap")]
    [AllowAnonymous] // Mọi vai trò đã đăng nhập đều cần chọn đợt; lớp này chỉ cho Khoa nên kiểm tra đăng nhập ngay trong hàm.
    public async Task<IActionResult> GetDanhSachDotThucTap([FromServices] InternshipManagement.DAL.AppDbContext db)
    {
        if (User.Identity?.IsAuthenticated != true) return Unauthorized(new { message = "Vui lòng đăng nhập để xem đợt thực tập." });
        try
        {
            // SV/GV/cán bộ Khoa chỉ nhận đợt của khoa mình nhờ bộ lọc khoa của CSDL.
            IEnumerable<InternshipManagement.BLL.DTOs.ThongKe.DotThucTapItemDto> result = await _thongKeService.GetDanhSachDotThucTapAsync();
            if (User.IsInRole(Roles.DaiDienDN))
            {
                // Doanh nghiệp hợp tác với nhiều khoa: chỉ hiện đợt mà công ty được đưa vào, có đăng ký hoặc có SV thực tập.
                var company = await db.DaiDienDoanhNghieps.Where(x => x.MaSo == User.MaDaiDien()).Select(x => x.MaCongTy).FirstOrDefaultAsync();
                var rounds = await db.CongTyTheoDots.Where(x => x.MaCongTy == company).Select(x => x.MaDot)
                    .Union(db.DangKyThucTaps.Where(x => x.MaCongTy == company).Select(x => x.MaDot))
                    .Union(db.PhanBoThucTaps.Where(x => x.MaCongTy == company).Select(x => x.MaDot)).ToListAsync();
                result = result.Where(x => rounds.Contains(x.MaDot));
            }
            var tenKhoa = await db.Khoas.AsNoTracking().ToDictionaryAsync(x => x.MaKhoa, x => x.TenKhoa);
            result = result.Select(x => { x.TenKhoa = x.MaKhoa == null ? null : tenKhoa.GetValueOrDefault(x.MaKhoa); return x; }).ToList();
            return Ok(new
            {
                Success = true,
                Message = "Lấy danh sách đợt thực tập thành công",
                Data = result,
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                Success = false,
                Message = "Lỗi khi lấy danh sách đợt thực tập: " + ex.Message,
            });
        }
    }
}
