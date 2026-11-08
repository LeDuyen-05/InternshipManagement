using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Common;

// Phân công GVHD theo nơi thực tập: hủy nơi thì tạm dừng (không chiếm chỉ tiêu GV),
// có nơi chính thức trở lại thì GV cũ hướng dẫn tiếp nếu còn chỉ tiêu.
public static class PhanCongGVHD
{
    public const string DangHuongDan = "DangHuongDan";
    public const string TamDung = "TamDung";
    public const string HuyBo = "HuyBo";

    // Trả về mã GV bị tạm dừng; thay đổi được lưu cùng SaveChanges của luồng gọi.
    public static async Task<List<string>> TamDungAsync(AppDbContext db, string maSV, string maDot)
    {
        var active = await db.GVHuongDans.Where(x => x.MaSinhVien == maSV && x.MaDot == maDot && x.TrangThai == DangHuongDan).ToListAsync();
        active.ForEach(x => x.TrangThai = TamDung);
        return active.Select(x => x.MaGiangVien).ToList();
    }

    // MaGV = GV tạm dừng gần nhất (null nếu không có); TiepTuc = GV đó hướng dẫn tiếp.
    // Nếu GV đã đủ chỉ tiêu hoặc SV đã có GVHD khác, phân công cũ bị hủy để Khoa phân công lại.
    public static async Task<(string? MaGV, bool TiepTuc)> TiepTucAsync(AppDbContext db, string maSV, string maDot)
    {
        var paused = await db.GVHuongDans.Where(x => x.MaSinhVien == maSV && x.MaDot == maDot && x.TrangThai == TamDung)
            .OrderByDescending(x => x.NgayPC).ThenByDescending(x => x.MaSo).ToListAsync();
        if (paused.Count == 0) return (null, false);
        var latest = paused[0];
        foreach (var older in paused.Skip(1)) older.TrangThai = HuyBo;
        var hasActive = await db.GVHuongDans.AnyAsync(x => x.MaSinhVien == maSV && x.MaDot == maDot && x.TrangThai == DangHuongDan);
        var quota = await db.GiangViens.Where(x => x.MaGV == latest.MaGiangVien).Select(x => (int?)x.ChiTieuHD).FirstOrDefaultAsync();
        var assigned = await db.GVHuongDans.CountAsync(x => x.MaGiangVien == latest.MaGiangVien && x.MaDot == maDot && x.TrangThai == DangHuongDan);
        var resume = !hasActive && quota.HasValue && assigned < quota.Value;
        latest.TrangThai = resume ? DangHuongDan : HuyBo;
        return (latest.MaGiangVien, resume);
    }

    public static string MoTaTiepTuc((string? MaGV, bool TiepTuc) result) => result switch
    {
        { MaGV: null } => "Sinh viên chưa có GVHD; Khoa cần phân công GVHD.",
        { TiepTuc: true } => $"GVHD {result.MaGV} tiếp tục hướng dẫn.",
        _ => $"GVHD cũ {result.MaGV} đã đủ chỉ tiêu hoặc SV đã có GVHD khác; Khoa cần kiểm tra phân công GVHD."
    };
}
