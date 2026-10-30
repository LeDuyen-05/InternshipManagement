using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Common;

public static class ConfirmationDeadlinePolicy
{
    public static bool Applies(PhanBoThucTap p) => !p.DaDuocKhoaDuyet && p.TrangThai == "ChuaNhanViec" && p.NgaySVXacNhan == null;
    public static bool Overdue(PhanBoThucTap p, DateTimeOffset now) => Applies(p)
        && p.DotThucTap.HanXacNhanSV.HasValue && now >= p.DotThucTap.HanXacNhanSV.Value;

    public static void RequireConfirmation(PhanBoThucTap p, string student, DateTimeOffset now)
    {
        if (!string.Equals(p.MaSinhVien, student, StringComparison.OrdinalIgnoreCase)) throw new UnauthorizedAccessException();
        if (p.TrangThai != "ChuaNhanViec") throw new InvalidOperationException("Hồ sơ không còn chờ sinh viên xác nhận.");
        if (p.DotThucTap.TrangThai is not ("ChuaBatDau" or "DangDienRa")) throw new InvalidOperationException("Đợt không còn cho phép xác nhận.");
        if (Overdue(p, now)) throw new InvalidOperationException("Đã quá hạn xác nhận. Liên hệ Khoa để rà soát; hồ sơ chưa bị hủy và vẫn giữ chỗ.");
    }
}
