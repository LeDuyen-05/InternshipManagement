namespace InternshipManagement.BLL.DTOs.PhieuChamDiem;

public record PhieuChamDiemDto(
    string MaPhieu,
    string MaSV,
    string? HoTenSV,
    string? Lop,
    string MaDot,
    string? TenDot,
    string? MaGVHuongDan,
    decimal? TongDiem,
    DateTime? NgayCham,
    string? XepLoai,
    List<ChiTietChamDiemDto> ChiTiets,
    decimal DiemGV = 0,
    decimal DiemDN = 0,
    bool DaChamGV = false,
    bool DaChamDN = false,
    bool DoanhNghiepChamTrenHeThong = false,
    bool DaDuDiem = false,
    string? DiemChu = null,
    string? KetQua = null,
    string? NhanXetGV = null,
    string? NhanXetDN = null,
    bool DaDoiChieuPhieuDN = false,
    string? GhiChuPhieuDN = null,
    decimal DiemTamTinh = 0
);
