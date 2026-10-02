using InternshipManagement.BLL.DTOs.SinhVien;

namespace InternshipManagement.BLL.Validators.SinhVien;

/// <summary>Validator thủ công đơn giản — không dùng thư viện ngoài, giữ đồ án gọn nhẹ.</summary>
public class CreateSinhVienValidator
{
    public List<string> Validate(CreateSinhVienDto dto)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(dto.MaSV))
            errors.Add("Mã sinh viên không được để trống.");

        if (string.IsNullOrWhiteSpace(dto.HoTen))
            errors.Add("Họ tên không được để trống.");

        if (dto.Gpa is < 0 or > 4)
            errors.Add("GPA phải nằm trong khoảng 0 - 4.");

        return errors;
    }
}
