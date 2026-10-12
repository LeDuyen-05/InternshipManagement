namespace InternshipManagement.BLL.DTOs.PhieuChamDiem;

public record ChiTietDiemInput(
    string MaTieuChi,
    decimal DiemCham
);

public record LuuPhieuChamRequest(
    string MaSV,
    string MaDot,
    string? MaGVHuongDan,
    decimal? TongDiem,
    List<ChiTietDiemInput> ChiTiets
);
