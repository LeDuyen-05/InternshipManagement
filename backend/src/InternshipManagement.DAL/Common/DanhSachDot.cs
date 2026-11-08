using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Common;

// TrongDanhSach = 0 để mặc định (kể cả mock) là được phép.
public enum ThamGiaDot { TrongDanhSach = 0, CoHoSoTrongDot, KhongCoTen, DaRutKhoiDanhSach }

// Chỉ SV thuộc đợt mới tự đăng ký nguyện vọng/nộp hồ sơ tự tìm trong đợt. Thuộc đợt giống danh sách đợt của Khoa:
// có tên do Khoa lập, hoặc đã có hồ sơ trong đợt (đợt lập trước khi có danh sách, Khoa bố trí trực tiếp) mà chưa bị Khoa đưa ra.
public static class DanhSachDot
{
    public static async Task<ThamGiaDot> ThamGiaAsync(AppDbContext db, string maSV, string maDot)
    {
        var member = await db.SinhVienThamGiaDots.AsNoTracking().Where(x => x.MaDot == maDot && x.MaSV == maSV)
            .Select(x => (bool?)x.DangThamGia).FirstOrDefaultAsync();
        if (member == true) return ThamGiaDot.TrongDanhSach;
        if (member == false) return ThamGiaDot.DaRutKhoiDanhSach;
        var coHoSo = await db.DangKyThucTaps.AnyAsync(x => x.MaSV == maSV && x.MaDot == maDot)
            || await db.PhanBoThucTaps.AnyAsync(x => x.MaSinhVien == maSV && x.MaDot == maDot)
            || await db.DeXuatThucTapTuTims.AnyAsync(x => x.MaSV == maSV && x.MaDot == maDot);
        return coHoSo ? ThamGiaDot.CoHoSoTrongDot : ThamGiaDot.KhongCoTen;
    }

    public static string? LyDo(ThamGiaDot thamGia, string tenDot, string hanhDong) => thamGia switch
    {
        ThamGiaDot.KhongCoTen => $"Bạn chưa có tên trong danh sách sinh viên của đợt {tenDot} nên không thể {hanhDong}. Liên hệ Khoa nếu bạn thuộc đợt này.",
        ThamGiaDot.DaRutKhoiDanhSach => $"Bạn đã được Khoa đưa ra khỏi danh sách sinh viên của đợt {tenDot} nên không thể {hanhDong}. Liên hệ Khoa nếu có sai sót.",
        _ => null
    };
}
