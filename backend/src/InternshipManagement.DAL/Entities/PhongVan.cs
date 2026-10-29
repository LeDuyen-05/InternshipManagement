namespace InternshipManagement.DAL.Entities;

public class PhongVan
{
    public string MaPV { get; set; } = default!;
    public string MaSinhVien { get; set; } = default!;
    public string MaDaiDien { get; set; } = default!;
    public string? HinhThuc { get; set; }
    public DateTime NgayPV { get; set; }
    public string? KetQua { get; set; }

    public SinhVien SinhVien { get; set; } = default!;
    public DaiDienDoanhNghiep DaiDienDoanhNghiep { get; set; } = default!;
}
