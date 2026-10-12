namespace InternshipManagement.BLL.DTOs.GVHuongDan;

public class GiangVienTaiDto
{
    public string MaGV { get; set; } = default!;
    public string HoTen { get; set; } = default!;
    public string? ChuyenMon { get; set; }
    public int SoLuongHienTai { get; set; }
    public int SoLuongSVHD { get; set; }
    public double TyLeTai => SoLuongSVHD > 0 ? Math.Round((double)SoLuongHienTai / SoLuongSVHD * 100, 1) : 0;
    public bool ConNhanDuoc => SoLuongHienTai < SoLuongSVHD;
}
