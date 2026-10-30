namespace InternshipManagement.DAL.Entities;

public class NhatKyThoiHan
{
    public string MaNhatKy { get; set; } = default!;
    public string MaDot { get; set; } = default!;
    public string Loai { get; set; } = default!;
    public string Truoc { get; set; } = default!;
    public string Sau { get; set; } = default!;
    public string LyDo { get; set; } = default!;
    public string NguoiThucHien { get; set; } = default!;
    public DateTimeOffset ThoiDiem { get; set; }
}
