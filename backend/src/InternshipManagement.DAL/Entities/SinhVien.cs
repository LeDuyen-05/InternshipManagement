namespace InternshipManagement.DAL.Entities;

public class SinhVien
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

    public HoSoNangLuc? HoSoNangLuc { get; set; }
    public ICollection<DangKyThucTap> DangKyThucTaps { get; set; } = new List<DangKyThucTap>();
    public ICollection<PhanBoThucTap> PhanBoThucTaps { get; set; } = new List<PhanBoThucTap>();
    public ICollection<PhongVan> PhongVans { get; set; } = new List<PhongVan>();
    public ICollection<GVHuongDan> GVHuongDans { get; set; } = new List<GVHuongDan>();
    public ICollection<DeXuatCongTy> DeXuatCongTys { get; set; } = new List<DeXuatCongTy>();
    public ICollection<TienDoThucTap> TienDoThucTaps { get; set; } = new List<TienDoThucTap>();
}
