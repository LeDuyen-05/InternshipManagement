using InternshipManagement.BLL.DTOs.GioiThieu;

namespace InternshipManagement.BLL.Validators.GioiThieu;

public class CreateGioiThieuValidator
{
    public List<string> Validate(CreateGioiThieuDto dto)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(dto.MaGV))
            errors.Add("Mã giảng viên không được để trống.");

        if (string.IsNullOrWhiteSpace(dto.MaCongTy))
            errors.Add("Mã công ty không được để trống.");

        return errors;
    }
}
