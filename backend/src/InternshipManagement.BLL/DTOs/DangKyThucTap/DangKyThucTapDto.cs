namespace InternshipManagement.BLL.DTOs.DangKyThucTap;

public class DangKyThucTapDto
{
    public string MaDK { get; set; } = default!;
    public string MaSV { get; set; } = default!;
    public string? MaViTri { get; set; }
    public string MaCongTy { get; set; } = default!;
    public string TenCongTy { get; set; } = default!;
    public string? ViTriTuyen { get; set; }
    public string MaDot { get; set; } = default!;
    public string? TenDot { get; set; }
    public DateTime NgayDangKy { get; set; }
    public int ThuTuUuTien { get; set; }
    public string TrangThai { get; set; } = default!;
    /// <summary>Đã có quyết định tiếp nhận (phân bổ còn hiệu lực) tại công ty này trong đợt — mới là "trúng tuyển".</summary>
    public bool DaTiepNhan { get; set; }
    /// <summary>Kết quả phỏng vấn gần nhất tại công ty: Dat | KhongDat | ChuaCoKetQua | null (chưa có lịch).</summary>
    public string? KetQuaPhongVan { get; set; }
    public string? LyDoKetThuc { get; set; }
}

public class CreateDangKyThucTapRequest
{
    // Controller luôn lấy mã SV từ token; client không cần gửi lại định danh này.
    public string MaSV { get; set; } = string.Empty;
    public string? MaViTri { get; set; }
    public string MaCongTy { get; set; } = default!;
    public string MaDot { get; set; } = default!;
    public int ThuTuUuTien { get; set; } = 1;
}
