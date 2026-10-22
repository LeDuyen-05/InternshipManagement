namespace InternshipManagement.BLL.DTOs.PhieuChamDiem;

public record TieuChiDto(
    string MaTieuChi,
    string MaCLO,
    string TenTieuChi,
    decimal DiemToiDa,
    string? NhomDanhGia = null,
    int ThuTu = 0
);
