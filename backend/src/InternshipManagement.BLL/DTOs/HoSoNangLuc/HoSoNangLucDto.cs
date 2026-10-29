namespace InternshipManagement.BLL.DTOs.HoSoNangLuc;

public class HoSoNangLucDto
{
    public string MaHoSo { get; set; } = default!;
    public string MaSinhVien { get; set; } = default!;
    public string HoTen { get; set; } = default!;
    public string? Lop { get; set; }
    public string? KhoaHoc { get; set; }
    public double? Gpa { get; set; }
    public string? KyNang { get; set; }
    public string? ChuyenNganh { get; set; }
    public string? CongNghe { get; set; }
    public string? DuAnDaThucHien { get; set; }
    public string? NDHoSo { get; set; }
    public string? FileCV { get; set; }
    public DateTime NgayCapNhat { get; set; }
}
