namespace InternshipManagement.DAL.Entities;

/// <summary>
/// Lớp nghiệp vụ SinhVien — ánh xạ trực tiếp từ sơ đồ lớp mức phân tích.
/// Chỉ chứa thuộc tính dữ liệu; các hành vi nghiệp vụ (CapNhatThongTin...)
/// được cài đặt ở tầng Application (Features/SinhVien/SinhVienService.cs).
/// </summary>
public class SinhVien
{
    public string MaSV { get; set; } = default!;
    public string HoTen { get; set; } = default!;
    public string Lop { get; set; } = default!;
    public string KhoaHoc { get; set; } = default!;
    public double Gpa { get; set; }
    public string KyNang { get; set; } = default!;
    public string ChuyenNganh { get; set; } = default!;
    public string CongNghe { get; set; } = default!;
    public string DuAnDaThucHien { get; set; } = default!;

    // Navigation properties (điều hướng quan hệ, không phải thuộc tính nghiệp vụ)
    public HoSoNangLuc? HoSoNangLuc { get; set; }
    public ICollection<DangKyThucTap> DangKyThucTaps { get; set; } = new List<DangKyThucTap>();
    public ICollection<PhanBoThucTap> PhanBoThucTaps { get; set; } = new List<PhanBoThucTap>();
    public ICollection<PhongVan> PhongVans { get; set; } = new List<PhongVan>();
    public ICollection<GVHuongDan> GVHuongDans { get; set; } = new List<GVHuongDan>();
}
