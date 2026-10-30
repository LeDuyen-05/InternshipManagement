namespace InternshipManagement.DAL.Entities;

public class CongTyTheoDot
{
    public ICollection<ViTriTheoDot> ViTris { get; set; } = new List<ViTriTheoDot>();
    public string MaCongTy { get; set; } = default!;
    public string MaDot { get; set; } = default!;
    public string ViTriTuyen { get; set; } = default!;
    public string YeuCau { get; set; } = default!;
    public int SoLuongNhan { get; set; }
    public DateTimeOffset MoDangKy { get; set; }
    public DateTimeOffset HanDangKy { get; set; }
    public bool HoatDong { get; set; } = true;
    public int PhienBan { get; set; }
    public string? MaGVGioiThieu { get; set; }
    public GiangVien? GiangVienGioiThieu { get; set; }
    public CongTy CongTy { get; set; } = default!;
    public DotThucTap DotThucTap { get; set; } = default!;
}
