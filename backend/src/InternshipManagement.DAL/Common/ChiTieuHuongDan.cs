using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Common;

// Chỉ tiêu hướng dẫn của GV (số SV tối đa mỗi đợt): từ 0 (tạm ngưng nhận mới) đến ToiDa,
// và không thấp hơn số SV GV đang hướng dẫn trong một đợt còn mở.
public static class ChiTieuHuongDan
{
    public const int ToiDa = 50;

    public static async Task<int> DangHuongDanAsync(AppDbContext db, string maGV, CancellationToken ct = default) =>
        await db.GVHuongDans.AsNoTracking()
            .Where(x => x.MaGiangVien == maGV && x.TrangThai == "DangHuongDan" && x.MaDot != null
                && db.DotThucTaps.Any(d => d.MaSo == x.MaDot && (d.TrangThai == "ChuaBatDau" || d.TrangThai == "DangDienRa")))
            .GroupBy(x => x.MaDot).Select(g => (int?)g.Count()).MaxAsync(ct) ?? 0;

    public static async Task KiemTraAsync(AppDbContext db, string maGV, int chiTieu, CancellationToken ct = default)
    {
        if (chiTieu is < 0 or > ToiDa)
            throw new ArgumentException($"Chỉ tiêu hướng dẫn từ 0 đến {ToiDa} sinh viên mỗi đợt (0 là tạm ngưng nhận sinh viên mới).");
        var current = await DangHuongDanAsync(db, maGV, ct);
        if (chiTieu < current)
            throw new InvalidOperationException($"Giảng viên đang hướng dẫn {current} sinh viên trong một đợt còn mở; chỉ tiêu không thể thấp hơn số này. "
                + "Chuyển bớt sinh viên sang giảng viên khác trước khi giảm chỉ tiêu.");
    }
}
