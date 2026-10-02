using InternshipManagement.BLL.DTOs.SinhVien;

namespace InternshipManagement.BLL.Services.SinhVien;

public interface ISinhVienService
{
    Task<IReadOnlyList<SinhVienDto>> GetAllAsync();
    Task<SinhVienDto?> GetByIdAsync(string maSV);
    Task<SinhVienDto> CreateAsync(CreateSinhVienDto dto);
    Task UpdateAsync(string maSV, UpdateSinhVienDto dto);
}
