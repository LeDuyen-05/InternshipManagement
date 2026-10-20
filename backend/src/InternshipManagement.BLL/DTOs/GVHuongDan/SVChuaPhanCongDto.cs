namespace InternshipManagement.BLL.DTOs.GVHuongDan;

public class SVChuaPhanCongDto
{
    public string MaSV { get; set; } = default!;
    public string HoTen { get; set; } = default!;
    public string? Lop { get; set; }
    public string? ChuyenNganh { get; set; }
    public decimal? Gpa { get; set; }
    public string? TenCongTy { get; set; }
    /// <summary>Giảng viên đã giới thiệu công ty nơi SV thực tập (được ưu tiên làm GVHD).</summary>
    public List<string> GVGioiThieu { get; set; } = new();
}
