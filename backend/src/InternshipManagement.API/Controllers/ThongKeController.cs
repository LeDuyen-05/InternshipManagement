using InternshipManagement.BLL.Services.ThongKe;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[Route("api/[controller]")]
[ApiController]
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
        try
        {
            var result = await _thongKeService.GetBaoCaoThongKeAsync(maDot);
            return Ok(new
            {
                Success = true,
                Message = "Lấy báo cáo thống kê thành công",
                Data = result,
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                Success = false,
                Message = "Lỗi khi lấy dữ liệu thống kê: " + ex.Message,
            });
        }
    }

    [HttpGet("export-csv")]
    public async Task<IActionResult> ExportCsv([FromQuery] string? maDot)
    {
        try
        {
            var bytes = await _thongKeService.ExportCsvBangDiemAsync(maDot);
            var fileName = $"BaoCao_CLO_{maDot ?? "TongHop"}_{DateTime.Now:yyyyMMdd_HHmm}.csv";
            return File(bytes, "text/csv; charset=utf-8", fileName);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                Success = false,
                Message = "Lỗi khi xuất tệp dữ liệu: " + ex.Message,
            });
        }
    }
}
