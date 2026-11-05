using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Common;
using InternshipManagement.BLL.Services.ThongKe;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/khoa/ket-qua-thuc-tap/rot"), Authorize(Roles = Roles.Khoa)]
public class FailedInternshipController(FailedInternshipService service) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> List([FromQuery] FailedInternshipQuery query) => Ok(await service.ListAsync(query));
    [HttpGet("{maSV}/ho-so")] public async Task<IActionResult> Detail(string maSV, [FromQuery] string maDot, [FromQuery] string nguon = "TuDong") => Ok(await service.DetailAsync(maDot, maSV, nguon));
    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] FailedInternshipQuery query, [FromQuery] string format = "xlsx")
    {
        if (format is not ("csv" or "xlsx")) return BadRequest(new { message = "Chọn csv hoặc xlsx." });
        var data = await service.ExportAsync(query);
        string[] headers = ["MSSV", "Họ tên", "Lớp", "Năm học", "Mã đợt", "Tên đợt", "Loại thực tập", "Bộ điểm", "Kết quả", "Tổng điểm", "Lý do", "Căn cứ", "Người xác nhận", "Ngày xác nhận (UTC+7)", "Công ty", "Nguồn", "Trạng thái chốt", "Phiên bản chốt"];
        var rows = data.Select(x => new object?[] { x.MaSV, x.HoTen, x.Lop, x.NamHoc, x.MaDot, x.TenDot, x.MaLoaiThucTap, x.MaRubric, x.KetQua, x.TongDiem, x.LyDo, x.CanCu,
            x.NguoiXacNhan, x.NgayXacNhan?.ToOffset(TimeSpan.FromHours(7)).ToString("yyyy-MM-dd HH:mm:ss"), x.TenCongTy, x.NguonDuLieu, x.TrangThaiChot, x.PhienBanChot }).ToList();
        return format == "csv" ? File(TabularExport.Csv(headers, rows), "text/csv; charset=utf-8", "sinh-vien-rot-thuc-tap.csv")
            : File(TabularExport.Xlsx(headers, rows), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "sinh-vien-rot-thuc-tap.xlsx");
    }
}
