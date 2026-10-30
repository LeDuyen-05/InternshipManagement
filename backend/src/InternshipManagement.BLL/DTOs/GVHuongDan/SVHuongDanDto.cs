namespace InternshipManagement.BLL.DTOs.GVHuongDan;

public class SVHuongDanDto
{
    public string MaSo { get; set; } = default!;
    public string MaSV { get; set; } = default!;
    public string? MaDot { get; set; }
    public string HoTen { get; set; } = default!;
    public string? Lop { get; set; }
    public string? ChuyenNganh { get; set; }
    public decimal? Gpa { get; set; }
    public string? TenCongTy { get; set; }
    public DateTime NgayPC { get; set; }
    public string TrangThai { get; set; } = "DangHuongDan";
}
