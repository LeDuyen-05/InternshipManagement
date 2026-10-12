using System.ComponentModel.DataAnnotations.Schema;

namespace InternshipManagement.DAL.Entities;

public class PhieuChamDiem
{
    public string MaPhieu { get; set; } = default!;
    public decimal? TongDiem { get; set; }
    public DateTime? NgayCham { get; set; }
    public string MaDot { get; set; } = default!;
    public string MaSV { get; set; } = default!;

    [NotMapped]
    public string MaSinhVien { get => MaSV; set => MaSV = value; }

    public string? MaDaiDien { get; set; }
    public string? MaGVHuongDan { get; set; }

    [NotMapped]
    public string? MaGV { get => MaGVHuongDan; set => MaGVHuongDan = value; } // Alias to MaGVHuongDan

    public string? MaDoanhNghiep { get; set; }           // FK -> HuongDanDoanhNghiep


    public DotThucTap? DotThucTap { get; set; }
    public SinhVien? SinhVien { get; set; }
    public DaiDienDoanhNghiep? DaiDienDoanhNghiep { get; set; }
    public GVHuongDan? GVHuongDan { get; set; }

    [NotMapped]
    public HuongDanDoanhNghiep? HuongDanDoanhNghiep { get; set; }
    public ICollection<ChiTietChamDiem> ChiTietChamDiems { get; set; } = new List<ChiTietChamDiem>();
}

