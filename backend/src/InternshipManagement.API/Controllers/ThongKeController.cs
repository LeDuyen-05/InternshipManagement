using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.ThongKe;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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
    [AllowAnonymous]
    public async Task<IActionResult> GetDanhSachDotThucTap()
    {
        try
        {
            var result = await _thongKeService.GetDanhSachDotThucTapAsync();
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
