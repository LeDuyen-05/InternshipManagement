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
    List<ChiTietChamDiemDto> ChiTiets
);
