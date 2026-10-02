namespace InternshipManagement.DAL.Entities;

/// <summary>
/// Điều chỉnh theo xác nhận của nhóm: bổ sung MaSinhVien để xác định trực tiếp
/// sinh viên được phân bổ (thay vì chỉ có MaCongTy + MaDot).
/// LƯU Ý: cần đối chiếu lại multiplicity trong sơ đồ lớp phân tích trước khi
/// triển khai chính thức (theo đúng yêu cầu của nhóm).
/// </summary>
public class PhanBoThucTap
{
    public string MaPhanBo { get; set; } = default!;
    public string MaSinhVien { get; set; } = default!;
    public string MaCongTy { get; set; } = default!;
    public string MaDot { get; set; } = default!;
    public DateTime NgayPhanBo { get; set; }
    public bool TrangThai { get; set; }

    public SinhVien SinhVien { get; set; } = default!;
    public CongTy CongTy { get; set; } = default!;
    public DotThucTap DotThucTap { get; set; } = default!;
}
