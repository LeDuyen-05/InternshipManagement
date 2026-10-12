using InternshipManagement.BLL.DTOs.GioiThieu;

namespace InternshipManagement.BLL.Services.GioiThieu;

public interface IGioiThieuService
{
    Task<IReadOnlyList<GioiThieuDto>> GetAllAsync();
    Task<IReadOnlyList<GioiThieuDto>> GetByGiangVienAsync(string maGV);
    Task<GioiThieuDto?> GetByIdAsync(string maSo);
    Task<GioiThieuDto> CreateAsync(CreateGioiThieuDto dto);
    Task<GioiThieuDto> DeXuatMoiAsync(CreateDeXuatCongTyDto dto);
    Task UpdateTrangThaiAsync(string maSo, UpdateTrangThaiGioiThieuDto dto);
    Task DeleteAsync(string maSo);
}
