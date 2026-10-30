using InternshipManagement.BLL.DTOs.PhieuChamDiem;

namespace InternshipManagement.BLL.DTOs.DoanhNghiep;

/// <summary>
/// Tình trạng chỉ tiêu tiếp nhận của doanh nghiệp trong đợt đang diễn ra.
/// TrangThaiTuyen: DangTuyen | DaDuChiTieu (tự động đóng tuyển) | ChuaDuocDuyet | KhongCoDot.
/// </summary>
public record ChiTieuTiepNhanDto(
    string? MaDot,
    string? TenDot,
    int SoLuongNhan,
    int DaTiepNhan,
    int ConLai,
    bool DaDuChiTieu,
    string TrangThaiTuyen);

public class CapNhatTinTuyenDungRequest
{
    public string MaCongTy { get; set; } = default!;
    public string? ViTriTuyen { get; set; }
    public string? ThoiGian { get; set; }
    public int? SoLuongNhan { get; set; }
    public string? YeuCau { get; set; }
}

public class CapNhatTrangThaiUngVienRequest
{
    public string TrangThai { get; set; } = "DaDuyet";
}

public class TaoPhongVanRequest
{
    public string? MaDK { get; set; }
    public string MaSinhVien { get; set; } = default!;
    public string MaDaiDien { get; set; } = default!;
    public string? HinhThuc { get; set; }
    public DateTime? NgayPV { get; set; }
}

/// <summary>Dời lịch buổi phỏng vấn chưa có kết quả (người phỏng vấn, hình thức có thể giữ nguyên).</summary>
public class DoiLichPhongVanRequest
{
    public DateTime? NgayPV { get; set; }
    public string? MaDaiDien { get; set; }
    public string? HinhThuc { get; set; }
}

public class CapNhatKetQuaPhongVanRequest
{
    public string KetQua { get; set; } = "";
    public string? MaDK { get; set; }
    public string? LyDo { get; set; }
    public string? Nguon { get; set; }
}

public class DieuChinhPhongVanRequest
{
    public string MaDot { get; set; } = "";
    public string? MaDK { get; set; }
    public int? PhienBan { get; set; }
    public string LyDo { get; set; } = "";
    public string? Nguon { get; set; }
    public string? KetQua { get; set; }
    public DateTime? NgayPV { get; set; }
    public string? MaDaiDien { get; set; }
    public string? HinhThuc { get; set; }
}

/// <summary>Đơn vị thực tập chấm Phiếu nhận xét: CLO4.1 (tối đa 2đ) và CLO4.2 (tối đa 3đ).</summary>
public class DanhGiaThucTapSinhRequest
{
    public string MaPhanBo { get; set; } = default!;
    public List<ChiTietDiemInput> ChiTiets { get; set; } = new();
    public string NhanXet { get; set; } = "";
    public bool KhoaChinhThuc { get; set; } = false;
}

public record KetQuaPhongVanResult(
    string MaPV,
    string KetQua,
    string? MaPhanBo,
    bool DaDongTuyen,
    int SoNguyenVongTuDongTuChoi,
    string Message,
    bool ThanhCong = true);

public class ThemViTriRequest
{
    public string MaCongTy { get; set; } = default!;
    public string? MaDot { get; set; }
    public string TenViTri { get; set; } = default!;
    public string? YeuCau { get; set; }
    public int SoLuongNhan { get; set; } = 1;
}

public class CapNhatViTriRequest
{
    public string MaViTri { get; set; } = default!;
    public string TenViTri { get; set; } = default!;
    public string? YeuCau { get; set; }
    public int SoLuongNhan { get; set; } = 1;
    public bool HoatDong { get; set; } = true;
}
