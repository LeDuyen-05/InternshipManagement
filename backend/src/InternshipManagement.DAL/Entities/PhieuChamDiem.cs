namespace InternshipManagement.DAL.Entities;

public class PhieuChamDiem
{
    public string MaPhieu { get; set; } = default!;
    public string? MaGV { get; set; }                    // FK -> GVHuongDan
    public string? MaDoanhNghiep { get; set; }           // FK -> HuongDanDoanhNghiep
    public string MaSinhVien { get; set; } = default!;
    public string MaDot { get; set; } = default!;
    public decimal? TongDiem { get; set; }
    public DateTime? NgayCham { get; set; }

    public GVHuongDan? GVHuongDan { get; set; }
    public HuongDanDoanhNghiep? HuongDanDoanhNghiep { get; set; }
    public DotThucTap DotThucTap { get; set; } = default!;
    public ICollection<ChiTietChamDiem> ChiTietChamDiems { get; set; } = new List<ChiTietChamDiem>();
}
