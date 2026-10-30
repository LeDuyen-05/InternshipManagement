namespace InternshipManagement.DAL.Entities;

public class PhongVan
{
    public ICollection<PhongVan> CacBuoiThayThe { get; set; } = new List<PhongVan>();
    public ICollection<NhatKyPhongVan> NhatKy { get; set; } = new List<NhatKyPhongVan>();
    public int PhienBan { get; set; }
    public string? MaPVTruoc { get; set; }
    public string MaPV { get; set; } = default!;
    public string MaSinhVien { get; set; } = default!;
    public string MaDaiDien { get; set; } = default!;
    public string? HinhThuc { get; set; }
    public DateTime NgayPV { get; set; }
    public string? KetQua { get; set; }
    public string? MaDK { get; set; }
    public DangKyThucTap? DangKyThucTap { get; set; }
    public string? LyDoKetQua { get; set; }
    public string? NguonKetQua { get; set; }
    public string? NguoiGhiKetQua { get; set; }
    public DateTimeOffset? ThoiDiemKetQua { get; set; }

    public SinhVien SinhVien { get; set; } = default!;
    public DaiDienDoanhNghiep DaiDienDoanhNghiep { get; set; } = default!;
}
