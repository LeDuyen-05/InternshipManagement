using InternshipManagement.BLL.DTOs.HoSoNangLuc;

namespace InternshipManagement.BLL.Services.HoSoNangLuc;

public interface IHoSoNangLucService
{
    Task<HoSoNangLucDto?> GetHoSoBySinhVienAsync(string maSV);
    /// <param name="laKhoa">true: Khoa được sửa cả dữ liệu học vụ (họ tên, lớp, khóa, chuyên ngành, GPA).
    /// false: sinh viên chỉ sửa hồ sơ năng lực (kỹ năng, công nghệ, dự án, tóm tắt, CV).</param>
    Task<HoSoNangLucDto> UpdateHoSoAsync(string maSV, UpdateHoSoNangLucRequest request, bool laKhoa = false);
}
