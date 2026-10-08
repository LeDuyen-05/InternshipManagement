namespace InternshipManagement.DAL.Entities;

public class CongTy
{
    public string MaCongTy { get; set; } = default!;
    public string TenCongTy { get; set; } = default!;
    public string? ViTriTuyen { get; set; }
    public string? ThoiGian { get; set; }
    public int? SoLuongNhan { get; set; }
    public string? YeuCau { get; set; }
    public string TrangThai { get; set; } = "ChoDuyet";
    public string? EmbeddingYeuCau { get; set; }

    public ICollection<DaiDienDoanhNghiep> DaiDienDoanhNghieps { get; set; } = new List<DaiDienDoanhNghiep>();
    public ICollection<DangKyThucTap> DangKyThucTaps { get; set; } = new List<DangKyThucTap>();
    public ICollection<PhanBoThucTap> PhanBoThucTaps { get; set; } = new List<PhanBoThucTap>();
    public ICollection<PhongVan> PhongVans { get; set; } = new List<PhongVan>();
    public ICollection<GoiYCongTy> GoiYCongTys { get; set; } = new List<GoiYCongTy>();
    public ICollection<GioiThieu> GioiThieus { get; set; } = new List<GioiThieu>();
    public ICollection<DeXuatCongTy> DeXuatCongTys { get; set; } = new List<DeXuatCongTy>();
}
