using InternshipManagement.BLL.DTOs.SinhVien;

namespace InternshipManagement.BLL.Validators.SinhVien;

public class SinhVienValidator
{
    public List<string> Validate(string maSV, string hoTen, decimal? gpa, string? lop = null, string? khoaHoc = null, string? congNghe = null, string? kyNang = null, string? duAn = null)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(maSV))
            errors.Add("Mã sinh viên không được để trống.");
        else if (maSV.Trim().Length > 20)
            errors.Add("Mã sinh viên không được vượt quá 20 ký tự.");

        if (string.IsNullOrWhiteSpace(hoTen))
            errors.Add("Họ tên không được để trống.");
        else if (hoTen.Trim().Length > 100)
            errors.Add("Họ tên không được vượt quá 100 ký tự.");

        if (gpa.HasValue && (gpa.Value < 0m || gpa.Value > 4.0m))
            errors.Add("GPA phải nằm trong khoảng 0.0 - 4.0.");

        if (lop?.Trim().Length > 50)
            errors.Add("Lớp không được vượt quá 50 ký tự.");

        if (khoaHoc?.Trim().Length > 20)
            errors.Add("Khóa học không được vượt quá 20 ký tự.");

        if (congNghe?.Trim().Length > 500)
            errors.Add("Công nghệ không được vượt quá 500 ký tự.");

        if (kyNang?.Trim().Length > 500)
            errors.Add("Kỹ năng không được vượt quá 500 ký tự.");

        if (duAn?.Trim().Length > 1000)
            errors.Add("Dự án đã thực hiện không được vượt quá 1000 ký tự.");

        return errors;
    }

    public List<string> Validate(CreateSinhVienDto dto) =>
        Validate(dto.MaSV, dto.HoTen, dto.Gpa, dto.Lop, dto.KhoaHoc, dto.CongNghe, dto.KyNang, dto.DuAnDaThucHien);
}
