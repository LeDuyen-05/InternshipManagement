namespace InternshipManagement.DAL.Entities;

/// <summary>
/// Lớp kết hợp giữa SinhVien và CongTy, có thuộc tính nghiệp vụ riêng
/// nên dùng khóa chính riêng (MaDangKy) thay vì khóa phức hợp — theo xác nhận của nhóm.
/// </summary>
public class DangKyThucTap
{
    public string MaDangKy { get; set; } = default!;
    public string MaSinhVien { get; set; } = default!;
    public string MaCongTy { get; set; } = default!;
    public string MaDot { get; set; } = default!;
    public DateTime NgayDangKy { get; set; }
    public int ThuTuUuTien { get; set; }
    public string TrangThai { get; set; }

    public SinhVien SinhVien { get; set; } = default!;
    public CongTy CongTy { get; set; } = default!;
    public DotThucTap DotThucTap { get; set; } = default!;
    public ICollection<HuongDanDoanhNghiep> HuongDanDoanhNghieps { get; set; } = new List<HuongDanDoanhNghiep>();
}
