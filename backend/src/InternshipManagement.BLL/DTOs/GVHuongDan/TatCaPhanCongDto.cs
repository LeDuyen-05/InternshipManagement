namespace InternshipManagement.BLL.DTOs.GVHuongDan;

public class TatCaPhanCongDto
{
    public string MaSo { get; set; } = default!;
    public string MaSV { get; set; } = default!;
    public string? MaDot { get; set; }
    public string? TenDot { get; set; }
    public string? MaLoaiThucTap { get; set; }
    public string? TenLoaiThucTap { get; set; }
    public string? MaRubric { get; set; }
    public string HoTenSV { get; set; } = default!;
    public string? Lop { get; set; }
    public string? ChuyenNganh { get; set; }
    public decimal? Gpa { get; set; }
    public string? TenCongTy { get; set; }
    public string MaGV { get; set; } = default!;
    public string HoTenGV { get; set; } = default!;
    public string? ChuyenMonGV { get; set; }
    public DateTime NgayPC { get; set; }
    public string TrangThai { get; set; } = "DangHuongDan";
}
