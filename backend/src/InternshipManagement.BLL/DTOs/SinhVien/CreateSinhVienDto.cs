namespace InternshipManagement.BLL.DTOs.SinhVien;

public class CreateSinhVienDto
{
    public string MaSV { get; set; } = default!;
    public string HoTen { get; set; } = default!;
    public string? Lop { get; set; }
    public string? KhoaHoc { get; set; }
    public decimal? Gpa { get; set; }
    public string? KyNang { get; set; }
    public string? ChuyenNganh { get; set; }
    public string? CongNghe { get; set; }
    public string? DuAnDaThucHien { get; set; }
}
