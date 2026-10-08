using InternshipManagement.BLL.DTOs.PhieuChamDiem;

namespace InternshipManagement.BLL.Services.PhieuChamDiem;

public interface IPhieuChamDiemService
{
    Task<IReadOnlyList<TieuChiDto>> GetDanhSachTieuChiAsync();
    Task<PhieuChamDiemDto?> GetPhieuChamBySinhVienAndDotAsync(string maSV, string maDot);
    Task<IReadOnlyList<PhieuChamDiemDto>> GetDanhSachPhieuChamByGiangVienAsync(string maGV, string maDot);
    Task<PhieuChamDiemDto> LuuPhieuChamDiemAsync(LuuPhieuChamRequest request);
}
