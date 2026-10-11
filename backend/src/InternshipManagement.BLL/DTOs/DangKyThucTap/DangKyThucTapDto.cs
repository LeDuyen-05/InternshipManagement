namespace InternshipManagement.BLL.DTOs.DangKyThucTap;

public class DangKyThucTapDto
{
    public string MaDK { get; set; } = default!;
    public string MaSV { get; set; } = default!;
    public string MaCongTy { get; set; } = default!;
    public string TenCongTy { get; set; } = default!;
    public string? ViTriTuyen { get; set; }
    public string MaDot { get; set; } = default!;
    public string? TenDot { get; set; }
    public DateTime NgayDangKy { get; set; }
    public int ThuTuUuTien { get; set; }
    public string TrangThai { get; set; } = default!;
}

public class CreateDangKyThucTapRequest
{
    public string MaSV { get; set; } = default!;
    public string MaCongTy { get; set; } = default!;
    public string MaDot { get; set; } = "DOT02";
    public int ThuTuUuTien { get; set; } = 1;
}
