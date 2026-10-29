namespace InternshipManagement.BLL.DTOs.PhieuChamDiem;

/// <summary>Một dòng trong file chấm điểm Thực tập theo mẫu của Khoa.</summary>
public record BangDiemRowDto(
    int Stt,
    string MaSV,
    string HoLot,
    string Ten,
    string? Lop,
    Dictionary<string, decimal?> Diem,
    decimal? TongDiem,
    string? DiemChu,
    string KetQua,
    string? TenGVHD,
    string? TenCongTy
);

public record BangDiemResponse(
    string MaDot,
    string? TenDot,
    List<TieuChiDto> TieuChis,
    List<BangDiemRowDto> Rows
);
