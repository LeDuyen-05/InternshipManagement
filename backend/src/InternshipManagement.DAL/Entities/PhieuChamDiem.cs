namespace InternshipManagement.DAL.Entities;

public class PhieuChamDiem
{
    public string MaPhieu { get; set; } = default!;
    public string MaGV { get; set; } = default!;         // FK -> GVHuongDan
    public string MaDoanhNghiep { get; set; } = default!; // FK -> HuongDanDoanhNghiep
    public string MaDot { get; set; } = default!;
    public double TongDiem { get; set; }
    public DateTime NgayCham { get; set; }

    public GVHuongDan GVHuongDan { get; set; } = default!;
    public HuongDanDoanhNghiep HuongDanDoanhNghiep { get; set; } = default!;
    public DotThucTap DotThucTap { get; set; } = default!;
    public ICollection<ChiTietChamDiem> ChiTietChamDiems { get; set; } = new List<ChiTietChamDiem>();
}
