namespace InternshipManagement.DAL.Entities;

public class DaiDienDoanhNghiep
{
    public string MaSo { get; set; } = default!;
    public string MaCongTy { get; set; } = default!;
    public string HoTen { get; set; } = default!;
    public string? ChucVu { get; set; }
    public string? Email { get; set; }

    public CongTy CongTy { get; set; } = default!;
    public ICollection<HuongDanDoanhNghiep> HuongDanDoanhNghieps { get; set; } = new List<HuongDanDoanhNghiep>();
    public ICollection<PhongVan> PhongVans { get; set; } = new List<PhongVan>();
}
