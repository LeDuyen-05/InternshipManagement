namespace InternshipManagement.BLL.DTOs.PhieuChamDiem;

public record ChiTietChamDiemDto(
    string MaSo,
    string MaTieuChi,
    string TenTieuChi,
    decimal DiemCham,
    decimal DiemToiDa
);
