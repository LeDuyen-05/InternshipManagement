namespace InternshipManagement.BLL.DTOs.PhanBoThucTap;

public class PhanBoThucTapDto
{
    public string MaPhanBo { get; set; } = default!;
    public string MaSinhVien { get; set; } = default!;
    public string MaCongTy { get; set; } = default!;
    public string? TenCongTy { get; set; }
    public string? ViTriTuyen { get; set; }
    public string? ThoiGianThucTap { get; set; }
    public string MaDot { get; set; } = default!;
    public string? TenDot { get; set; }
    public DateTime NgayPhanBo { get; set; }
    public string TrangThai { get; set; } = default!;
    public bool DaDuocKhoaDuyet { get; set; }
    public DateTime? NgaySVXacNhan { get; set; }
    public DateTimeOffset? HanXacNhanSV { get; set; }
    public bool QuaHanXacNhan { get; set; }
    public DateTime? NgayKhoaDuyet { get; set; }

    // Thông tin GVHD
    public string? GiangVienHD { get; set; }
    public string? ChuyenMonGV { get; set; }

    // Thông tin Mentor DN
    public string? MentorDoanhNghiep { get; set; }
    public string? ChucVuMentor { get; set; }
    public string? DanhGiaMentor { get; set; }
}
