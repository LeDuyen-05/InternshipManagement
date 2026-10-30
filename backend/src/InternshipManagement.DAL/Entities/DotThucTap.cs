namespace InternshipManagement.DAL.Entities;

public class DotThucTap
{
    public string MaSo { get; set; } = default!;
    public string TenDot { get; set; } = default!;
    public string NamHoc { get; set; } = default!;
    public DateTime ThoiGianBD { get; set; }
    public DateTime ThoiGianKT { get; set; }
    public string TrangThai { get; set; } = "ChuaBatDau";
    public string MaRubric { get; set; } = "CNTT_CLO_V1";
    public DateTimeOffset? HanDieuChinhNoiThucTap { get; set; }
    public DateTimeOffset? MoChamGV { get; set; }
    public DateTimeOffset? HanChamGV { get; set; }
    public DateTimeOffset? HanChamDN { get; set; }
    public int PhienBanThoiHan { get; set; }
    public DateTimeOffset? HanXacNhanSV { get; set; }
    public int PhienBanXacNhan { get; set; }
    // WEB-02 sẽ cập nhật qua luồng công bố/chốt, không nhận từ form sửa đợt chung.
    public string TrangThaiDanhSachNoi { get; set; } = "ChuaCongBo";

    public ICollection<DangKyThucTap> DangKyThucTaps { get; set; } = new List<DangKyThucTap>();
    public ICollection<PhanBoThucTap> PhanBoThucTaps { get; set; } = new List<PhanBoThucTap>();
    public ICollection<TienDoThucTap> TienDoThucTaps { get; set; } = new List<TienDoThucTap>();
    public ICollection<PhieuChamDiem> PhieuChamDiems { get; set; } = new List<PhieuChamDiem>();
}
