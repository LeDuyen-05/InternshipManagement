namespace InternshipManagement.DAL.Entities;

public class DotThucTap
{
    public string MaSo { get; set; } = default!;
    public string TenDot { get; set; } = default!;
    public string NamHoc { get; set; }
    public DateTime ThoiGianBD { get; set; }
    public DateTime ThoiGianKT { get; set; }
    public string TrangThai { get; set; }

    public ICollection<DangKyThucTap> DangKyThucTaps { get; set; } = new List<DangKyThucTap>();
    public ICollection<PhanBoThucTap> PhanBoThucTaps { get; set; } = new List<PhanBoThucTap>();
    public ICollection<TienDoThucTap> TienDoThucTaps { get; set; } = new List<TienDoThucTap>();
    public ICollection<PhieuChamDiem> PhieuChamDiems { get; set; } = new List<PhieuChamDiem>();
}
