namespace InternshipManagement.DAL.Entities;

public class PhanBoThucTap
{
    public string MaPhanBo { get; set; } = default!;
    public string MaSinhVien { get; set; } = default!;
    public string MaCongTy { get; set; } = default!;
    public string MaDot { get; set; } = default!;
    public DateTime NgayPhanBo { get; set; }
    public string TrangThai { get; set; } = default!;

    public SinhVien SinhVien { get; set; } = default!;
    public CongTy CongTy { get; set; } = default!;
    public DotThucTap DotThucTap { get; set; } = default!;
    public ICollection<HuongDanDoanhNghiep> HuongDanDoanhNghieps { get; set; } = new List<HuongDanDoanhNghiep>();
}
