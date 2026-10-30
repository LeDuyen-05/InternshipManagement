namespace InternshipManagement.DAL.Entities;

// Nhật ký bổ sung, không tạo audit hồi tố cho lịch sử cũ thiếu thông tin.
public class NhatKyDieuChinhThucTap
{
    public string MaNhatKy { get; set; } = default!;
    public string MaDot { get; set; } = default!;
    public string? MaSV { get; set; }
    public string? MaPhanBo { get; set; }
    public string Loai { get; set; } = default!;
    public string LyDo { get; set; } = default!;
    public string CanCu { get; set; } = default!;
    public string NoiDung { get; set; } = default!;
    public string NguoiThucHien { get; set; } = default!;
    public DateTimeOffset ThoiDiem { get; set; }
}
