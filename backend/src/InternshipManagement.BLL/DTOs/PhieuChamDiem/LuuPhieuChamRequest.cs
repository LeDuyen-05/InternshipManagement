namespace InternshipManagement.BLL.DTOs.PhieuChamDiem;

public record ChiTietDiemInput(
    string MaTieuChi,
    decimal DiemCham
);

public record LuuPhieuChamRequest(
    string MaSV,
    string MaDot,
    [property: Obsolete("Server tự xác định từ phân công hiện tại.")]
    string? MaGVHuongDan,
    [property: Obsolete("Server tự tính từ tổng điểm chi tiết.")]
    decimal? TongDiem,
    List<ChiTietDiemInput> ChiTiets,
    string? NhanXet = null,
    string? NhanXetGV = null,
    bool DaDoiChieuPhieuDN = false,
    string? GhiChuPhieuDN = null
);
