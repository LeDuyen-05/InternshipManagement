namespace InternshipManagement.DAL.Entities;

public class DangKyThucTap
{
    public string MaDK { get; set; } = default!;
    public string MaSV { get; set; } = default!;
    public string MaCongTy { get; set; } = default!;
    public string MaDot { get; set; } = default!;
    public DateTime NgayDangKy { get; set; }
    public int ThuTuUuTien { get; set; } = 1;
    public string TrangThai { get; set; } = "ChoDuyet";

    public SinhVien SinhVien { get; set; } = default!;
    public CongTy CongTy { get; set; } = default!;
    public DotThucTap DotThucTap { get; set; } = default!;
}
