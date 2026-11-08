using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Common;

/// <summary>
/// Công ty dùng chung toàn trường; "khoa của công ty" là các khoa có đợt mà công ty được đưa vào,
/// có sinh viên đăng ký hoặc có sinh viên thực tập. Xét trên toàn bộ dữ liệu (bỏ bộ lọc khoa).
/// </summary>
public static class CongTyTheoKhoa
{
    private static IQueryable<string> KhoaCuaDot(AppDbContext db, IQueryable<string> rounds) =>
        db.DotThucTaps.IgnoreQueryFilters().Where(d => rounds.Contains(d.MaSo) && d.MaKhoa != null).Select(d => d.MaKhoa!).Distinct();

    /// <summary>Các khoa mà công ty của người đại diện đang hợp tác.</summary>
    public static IQueryable<string> KhoaCuaDaiDien(AppDbContext db, string? maDaiDien)
    {
        var congTy = db.DaiDienDoanhNghieps.Where(d => d.MaSo == maDaiDien).Select(d => d.MaCongTy);
        return KhoaCuaDot(db, db.CongTyTheoDots.IgnoreQueryFilters().Where(c => congTy.Contains(c.MaCongTy)).Select(c => c.MaDot)
            .Union(db.DangKyThucTaps.IgnoreQueryFilters().Where(x => congTy.Contains(x.MaCongTy)).Select(x => x.MaDot))
            .Union(db.PhanBoThucTaps.IgnoreQueryFilters().Where(x => congTy.Contains(x.MaCongTy)).Select(x => x.MaDot)));
    }

    /// <summary>Các khoa đang hợp tác với một công ty.</summary>
    public static IQueryable<string> KhoaCuaCongTy(AppDbContext db, string maCongTy) =>
        KhoaCuaDot(db, db.CongTyTheoDots.IgnoreQueryFilters().Where(c => c.MaCongTy == maCongTy).Select(c => c.MaDot)
            .Union(db.DangKyThucTaps.IgnoreQueryFilters().Where(x => x.MaCongTy == maCongTy).Select(x => x.MaDot))
            .Union(db.PhanBoThucTaps.IgnoreQueryFilters().Where(x => x.MaCongTy == maCongTy).Select(x => x.MaDot)));

    /// <summary>
    /// Cán bộ Khoa chỉ sửa thông tin/trạng thái công ty khi công ty không hợp tác với khoa khác,
    /// để một khoa không đóng băng, từ chối hay đổi tên đối tác mà khoa khác đang dùng.
    /// </summary>
    public static async Task ChanSuaCongTyDungChungAsync(AppDbContext db, string maCongTy, CancellationToken ct = default)
    {
        var scope = db.PhamViKhoaHienTai;
        if (scope == null) return;
        if (await KhoaCuaCongTy(db, maCongTy).AnyAsync(k => k != scope, ct))
            throw new InvalidOperationException("Công ty đang hợp tác với khoa khác nên một khoa không tự đổi thông tin hoặc trạng thái chung. "
                + "Muốn ngừng hợp tác trong đợt của khoa mình, hãy tắt kế hoạch của công ty trong đợt đó; thay đổi chung cần thống nhất với các khoa liên quan.");
    }
}
