namespace InternshipManagement.DAL.Entities;

public class PhongVan
{
    public string MaPV { get; set; } = default!;
    public string MaSinhVien { get; set; } = default!;
    public string MaCongTy { get; set; } = default!;
    public string HinhThuc { get; set; } = default!;
    public DateTime NgayPV { get; set; }
    public bool KetQua { get; set; }

    public SinhVien SinhVien { get; set; } = default!;
    public CongTy CongTy { get; set; } = default!;
}
