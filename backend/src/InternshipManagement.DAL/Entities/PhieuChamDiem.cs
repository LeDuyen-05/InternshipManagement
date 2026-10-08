namespace InternshipManagement.DAL.Entities;

public class PhieuChamDiem
{
    public string MaPhieu { get; set; } = default!;
    public decimal? TongDiem { get; set; }
    public DateTime? NgayCham { get; set; }
    public string MaDot { get; set; } = default!;
    public string MaSV { get; set; } = default!;
    public string? MaDaiDien { get; set; }
    public string? MaGVHuongDan { get; set; }

    public DotThucTap? DotThucTap { get; set; }
    public SinhVien? SinhVien { get; set; }
    public DaiDienDoanhNghiep? DaiDienDoanhNghiep { get; set; }
    public GVHuongDan? GVHuongDan { get; set; }
    public ICollection<ChiTietChamDiem> ChiTietChamDiems { get; set; } = new List<ChiTietChamDiem>();
}
