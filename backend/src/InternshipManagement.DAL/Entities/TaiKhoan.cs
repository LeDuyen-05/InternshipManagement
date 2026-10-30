namespace InternshipManagement.DAL.Entities;

public class TaiKhoan
{
    public string MaTaiKhoan { get; set; } = default!;
    public string TenDangNhap { get; set; } = default!;
    public string MatKhau { get; set; } = default!;
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString("N");
    public string TrangThai { get; set; } = "HoatDong";
    public string? Email { get; set; }
    public string? SoDienThoai { get; set; }
    public string MaVaiTro { get; set; } = default!;
    public string? MaSV { get; set; }
    public string? MaGV { get; set; }
    public string? MaDaiDien { get; set; }
    public VaiTro VaiTro { get; set; } = default!;
}
