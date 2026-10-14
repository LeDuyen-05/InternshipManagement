namespace InternshipManagement.BLL.DTOs.GVHuongDan;

public class GiangVienTaiDto
{
    public string MaGV { get; set; } = default!;
    public string HoTen { get; set; } = default!;
    public string? ChuyenMon { get; set; }
    public int SoLuongHienTai { get; set; }
    public int ChiTieu { get; set; }
    public int SoLuongSVHD => ChiTieu; // Backwards compatibility
    public double TyLeTai => ChiTieu > 0 ? Math.Round((double)SoLuongHienTai / ChiTieu * 100, 1) : 0;
    public bool ConNhanDuoc => SoLuongHienTai < ChiTieu;
}
