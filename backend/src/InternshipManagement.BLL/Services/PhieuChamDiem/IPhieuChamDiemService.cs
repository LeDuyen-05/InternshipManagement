using InternshipManagement.BLL.DTOs.PhieuChamDiem;

namespace InternshipManagement.BLL.Services.PhieuChamDiem;

public interface IPhieuChamDiemService
{
    Task<IReadOnlyList<TieuChiDto>> GetDanhSachTieuChiAsync(string? nhomDanhGia = null);
    Task<PhieuChamDiemDto?> GetPhieuChamBySinhVienAndDotAsync(string maSV, string maDot);
    Task<IReadOnlyList<PhieuChamDiemDto>> GetDanhSachPhieuChamByGiangVienAsync(string maGV, string maDot);
    Task<PhieuChamDiemDto> LuuPhieuChamDiemAsync(LuuPhieuChamRequest request, string? actorMaGV = null, bool isStaff = false);
    Task<PhieuChamDiemDto> LuuDiemDoanhNghiepAsync(string maSV, string maDot, string maDaiDien,
        IReadOnlyList<ChiTietDiemInput> chiTiets, string? nhanXet, bool isStaff = false);
    Task<BangDiemResponse> GetBangDiemAsync(string maDot, string? maGV = null);
}
