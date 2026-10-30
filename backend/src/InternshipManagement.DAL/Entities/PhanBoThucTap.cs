namespace InternshipManagement.DAL.Entities;

public class PhanBoThucTap
{
    public string MaPhanBo { get; set; } = default!;
    public string MaSinhVien { get; set; } = default!;
    public string? MaViTri { get; set; }
    public ViTriTheoDot? ViTri { get; set; }
    public string MaCongTy { get; set; } = default!;
    public string MaDot { get; set; } = default!;
    public DateTime NgayPhanBo { get; set; }
    public string TrangThai { get; set; } = "ChuaNhanViec";
    // Dữ liệu cũ và nơi tự tìm đã được Khoa công nhận giữ hiệu lực.
    // Luồng DN báo đạt mới phải đặt false cho đến khi Khoa chốt.
    public bool DaDuocKhoaDuyet { get; set; } = true;
    public DateTime? NgaySVXacNhan { get; set; }
    public DateTime? NgayKhoaDuyet { get; set; }
    public string? NguoiKhoaDuyet { get; set; }
    public string? LyDoHuy { get; set; }
    public string? CanCuHuy { get; set; }
    public string? NguoiHuy { get; set; }
    public DateTimeOffset? NgayHuy { get; set; }
    public string? TrangThaiXuLyLai { get; set; }
    public string? MaPhanBoTruoc { get; set; }
    public string? NguonPhanBo { get; set; }
    public DateTime? NgayBatDauThucTap { get; set; }
    public DateTime? NgayKetThucThucTap { get; set; }
    public int PhienBanThoiGian { get; set; }
    public string? TenCongTyXacNhan { get; set; }
    public string? DiaChiCongTyXacNhan { get; set; }
    public string? MaSoThueCongTyXacNhan { get; set; }

    public SinhVien SinhVien { get; set; } = default!;

    public CongTy CongTy { get; set; } = default!;
    public DotThucTap DotThucTap { get; set; } = default!;
    public DeXuatThucTapTuTim? HoSoTuTim { get; set; }
    public ICollection<HuongDanDoanhNghiep> HuongDanDoanhNghieps { get; set; } = new List<HuongDanDoanhNghiep>();
}
