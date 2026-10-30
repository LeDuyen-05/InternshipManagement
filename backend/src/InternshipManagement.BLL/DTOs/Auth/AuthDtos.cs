namespace InternshipManagement.BLL.DTOs.Auth;

public record LoginRequest(string TenDangNhap, string MatKhau);
public record ChangePasswordRequest(string MatKhauCu, string MatKhauMoi);
public record RegisterRequest(
    string? MaTaiKhoan = null,
    string TenDangNhap = "",
    string MatKhau = "",
    string? MaVaiTro = null,
    string? MaSV = null,
    string? MaGV = null,
    string? MaDaiDien = null);
public record LoginResponse(string Token, string MaTaiKhoan, string TenDangNhap, string MaVaiTro, string TenVaiTro, string? MaSV, string? MaGV, string? MaDaiDien, string? Email, string? SoDienThoai, string? HoTen = null);
public record AccountProfileDto(string MaTaiKhoan, string TenDangNhap, string MaVaiTro, string? MaSV, string? MaGV, string? MaDaiDien, string? Email, string? SoDienThoai, string? HoTen);
public record UpdateOwnProfileRequest(string? Email, string? SoDienThoai);
