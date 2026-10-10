namespace InternshipManagement.BLL.DTOs.Auth;

public record LoginRequest(string TenDangNhap, string MatKhau);
public record ChangePasswordRequest(string MatKhauCu, string MatKhauMoi);
public record RegisterRequest(string MaTaiKhoan, string TenDangNhap, string MatKhau, string MaVaiTro, string? MaSV, string? MaGV, string? MaDaiDien);
public record LoginResponse(string Token, string MaTaiKhoan, string TenDangNhap, string MaVaiTro, string TenVaiTro, string? MaSV, string? MaGV, string? MaDaiDien);
