namespace InternshipManagement.BLL.DTOs.GiangVien;

public class GiangVienProfileDto
{
    public string MaGV { get; set; } = default!;
    public string HoTen { get; set; } = default!;
    public string? ChuyenMon { get; set; }
    public int SoLuongSVHD { get; set; }
    public int SoLuongDangHuongDan { get; set; }
    public string BoMon { get; set; } = "Công nghệ phần mềm";
    public string HocVi { get; set; } = "Thạc sĩ";
}

public class UpdateGiangVienProfileRequest
{
    public string? ChuyenMon { get; set; }
}
