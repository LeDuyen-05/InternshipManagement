using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Common;

/// <summary>
/// Tên hiển thị của loại thực tập theo danh mục LOAITHUCTAP (QTV có thể thêm loại mới cho các khoa).
/// Danh mục rất nhỏ và ít đổi nên giữ bản sao trong bộ nhớ; nạp khi khởi động và cập nhật ngay khi QTV sửa.
/// </summary>
public static class TenLoaiThucTap
{
    private static readonly ConcurrentDictionary<string, string> Ten = new(StringComparer.OrdinalIgnoreCase)
    {
        ["TTNN"] = "Thực tập nghề nghiệp",
        ["TTKS"] = "Thực tập kỹ sư"
    };

    public static string? Lay(string? maLoai) =>
        string.IsNullOrWhiteSpace(maLoai) ? null : Ten.TryGetValue(maLoai, out var ten) ? ten : maLoai;

    public static void CapNhat(string maLoai, string tenLoai) => Ten[maLoai] = tenLoai;

    public static async Task NapAsync(AppDbContext db, CancellationToken ct = default)
    {
        foreach (var loai in await db.LoaiThucTaps.AsNoTracking().ToListAsync(ct)) CapNhat(loai.MaLoai, loai.TenLoai);
    }
}
