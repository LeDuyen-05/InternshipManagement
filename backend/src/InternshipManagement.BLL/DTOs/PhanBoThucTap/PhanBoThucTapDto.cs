namespace InternshipManagement.BLL.DTOs.PhanBoThucTap;

public class PhanBoThucTapDto
{
    public string MaPhanBo { get; set; } = default!;
    public string MaSinhVien { get; set; } = default!;
    public string MaCongTy { get; set; } = default!;
    public string TenCongTy { get; set; } = default!;
    public string ViTriTuyen { get; set; } = default!;
    public string ThoiGianThucTap { get; set; } = default!;
    public string MaDot { get; set; } = default!;
    public string TenDot { get; set; } = default!;
    public DateTime NgayPhanBo { get; set; }
    public string TrangThai { get; set; } = default!;

    // Thông tin GVHD
    public string? GiangVienHD { get; set; }
    public string? ChuyenMonGV { get; set; }

    // Thông tin Mentor DN
    public string? MentorDoanhNghiep { get; set; }
    public string? ChucVuMentor { get; set; }
    public string? DanhGiaMentor { get; set; }
}
