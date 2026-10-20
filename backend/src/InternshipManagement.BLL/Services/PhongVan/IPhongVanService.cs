using InternshipManagement.BLL.DTOs.PhongVan;
using InternshipManagement.BLL.DTOs.PhanBoThucTap;

namespace InternshipManagement.BLL.Services.PhongVan;

public interface IPhongVanService
{
    Task<IReadOnlyList<PhongVanDto>> GetLichPhongVanBySinhVienAsync(string maSV);
    Task<PhanBoThucTapDto?> GetPhanBoBySinhVienAsync(string maSV);
    Task<PhanBoThucTapDto> XacNhanTiepNhanAsync(string maPhanBo, string maSV);
}
