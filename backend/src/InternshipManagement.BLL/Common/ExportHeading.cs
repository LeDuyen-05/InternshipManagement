using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Common;

// Nội dung tiêu đề tệp Excel xuất từ hệ thống: đơn vị ban hành và dòng thông tin đợt thực tập.
public static class ExportHeading
{
    // Khoa của người xuất; Quản trị viên (không thuộc khoa) dùng tên hệ thống.
    public static async Task<string> UnitAsync(AppDbContext db, CancellationToken ct = default)
    {
        var khoa = db.PhamViKhoaHienTai;
        if (string.IsNullOrWhiteSpace(khoa) || khoa == PhamViKhoa.KhongCoKhoa) return TabularExport.DonViMacDinh;
        return await db.Khoas.AsNoTracking().Where(x => x.MaKhoa == khoa).Select(x => x.TenKhoa).FirstOrDefaultAsync(ct)
            ?? TabularExport.DonViMacDinh;
    }

    // "Đợt thực tập: <tên> (<mã>) — Năm học: <năm>", hoặc "Tất cả đợt thực tập" khi không lọc theo đợt.
    public static async Task<string> RoundAsync(AppDbContext db, string? maDot, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(maDot)) return "Tất cả đợt thực tập";
        var round = await db.DotThucTaps.AsNoTracking().Where(x => x.MaSo == maDot).Select(x => new { x.TenDot, x.NamHoc }).FirstOrDefaultAsync(ct);
        return round == null ? $"Đợt thực tập: {maDot}"
            : $"Đợt thực tập: {round.TenDot} ({maDot})" + (string.IsNullOrWhiteSpace(round.NamHoc) ? "" : $" — Năm học: {round.NamHoc}");
    }
}
