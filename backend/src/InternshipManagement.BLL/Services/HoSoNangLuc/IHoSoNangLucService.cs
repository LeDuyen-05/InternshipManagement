using InternshipManagement.BLL.DTOs.HoSoNangLuc;

namespace InternshipManagement.BLL.Services.HoSoNangLuc;

public interface IHoSoNangLucService
{
    Task<HoSoNangLucDto?> GetHoSoBySinhVienAsync(string maSV);
    Task<HoSoNangLucDto> UpdateHoSoAsync(string maSV, UpdateHoSoNangLucRequest request);
}
