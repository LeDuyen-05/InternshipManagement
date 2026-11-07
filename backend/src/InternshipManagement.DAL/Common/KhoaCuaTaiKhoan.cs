using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Common;

public static class KhoaCuaTaiKhoan
{
    // Giá trị claim nghĩa là "không giới hạn": CSDL chưa có danh mục khoa (cài đặt một khoa kiểu cũ).
    public const string KhongGioiHan = "*";

    /// <summary>Khoa quản lý của tài khoản: cán bộ Khoa lấy từ tài khoản, GV/SV lấy từ hồ sơ. QTV và DN trả null.</summary>
    public static async Task<string?> TimAsync(AppDbContext db, TaiKhoan account, CancellationToken ct = default) => account.MaVaiTro switch
    {
        "VT02" => account.MaKhoa,
        "VT03" => await db.GiangViens.IgnoreQueryFilters().AsNoTracking().Where(x => x.MaGV == account.MaGV).Select(x => x.MaKhoa).FirstOrDefaultAsync(ct),
        "VT04" => await db.SinhViens.IgnoreQueryFilters().AsNoTracking().Where(x => x.MaSV == account.MaSV).Select(x => x.MaKhoa).FirstOrDefaultAsync(ct),
        _ => null
    };

    /// <summary>Giá trị phạm vi đưa vào phiên đăng nhập; null = vai trò không bị giới hạn theo khoa.</summary>
    public static async Task<string?> PhamViAsync(AppDbContext db, TaiKhoan account, CancellationToken ct = default)
    {
        if (account.MaVaiTro is not ("VT02" or "VT03" or "VT04")) return null;
        var maKhoa = await TimAsync(db, account, ct);
        if (!string.IsNullOrWhiteSpace(maKhoa)) return maKhoa;
        return await db.Khoas.AnyAsync(ct) ? PhamViKhoa.KhongCoKhoa : KhongGioiHan;
    }
}
