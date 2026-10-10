namespace InternshipManagement.DAL.Entities;

public class TaiKhoan
{
    public string MaTaiKhoan { get; set; } = default!;
    public string TenDangNhap { get; set; } = default!;
    public string MatKhau { get; set; } = default!;
    public string TrangThai { get; set; } = "HoatDong";
    public string MaVaiTro { get; set; } = default!;
    public string? MaSV { get; set; }
    public string? MaGV { get; set; }
    public string? MaDaiDien { get; set; }
    public VaiTro VaiTro { get; set; } = default!;
}
