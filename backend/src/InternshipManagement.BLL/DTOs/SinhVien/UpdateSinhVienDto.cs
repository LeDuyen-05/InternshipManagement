namespace InternshipManagement.BLL.DTOs.SinhVien;

/// <summary>Tương ứng hành vi CapNhatThongTin() trong sơ đồ lớp phân tích.</summary>
public class UpdateSinhVienDto
{
    public string HoTen { get; set; } = default!;
    public string Lop { get; set; } = default!;
    public string KhoaHoc { get; set; } = default!;
    public double Gpa { get; set; }
    public string KyNang { get; set; } = default!;
    public string ChuyenNganh { get; set; } = default!;
    public string CongNghe { get; set; } = default!;
    public string DuAnDaThucHien { get; set; } = default!;
}
