using System.Security.Cryptography;
using System.Text;
using InternshipManagement.BLL.DTOs.Auth;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.Auth;

public class AuthService
{
    private readonly AppDbContext _db;
    public AuthService(AppDbContext db) => _db = db;

    public async Task<TaiKhoan?> AuthenticateAsync(string username, string password)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password)) return null;

        var cleanUsername = username.Trim();
        var cleanPassword = password.Trim();

        var account = await _db.TaiKhoans
            .Include(x => x.VaiTro)
            .FirstOrDefaultAsync(x => x.TenDangNhap.ToLower() == cleanUsername.ToLower() || x.TenDangNhap == cleanUsername);

        if (account is null || account.TrangThai != "HoatDong") return null;
        if (!VerifyPassword(cleanPassword, account.MatKhau)) return null;
        return account;
    }

    public async Task<TaiKhoan> RegisterAsync(RegisterRequest request)
    {
        if (await _db.TaiKhoans.AnyAsync(x => x.TenDangNhap == request.TenDangNhap))
            throw new InvalidOperationException("Tên đăng nhập đã tồn tại.");
        if (await _db.TaiKhoans.AnyAsync(x => x.MaTaiKhoan == request.MaTaiKhoan))
            throw new InvalidOperationException("Mã tài khoản đã tồn tại.");

        if (request.MaVaiTro != "VT04") throw new InvalidOperationException("Đăng ký công khai chỉ dành cho vai trò SinhVien.");
        if (string.IsNullOrWhiteSpace(request.MaSV)) throw new InvalidOperationException("Sinh viên phải có mã SV.");
        var account = new TaiKhoan
        {
            MaTaiKhoan = request.MaTaiKhoan, TenDangNhap = request.TenDangNhap,
            MatKhau = HashPassword(request.MatKhau), TrangThai = "HoatDong", MaVaiTro = "VT04",
            MaSV = request.MaSV, MaGV = null, MaDaiDien = null
        };
        _db.TaiKhoans.Add(account);
        await _db.SaveChangesAsync();
        return account;
    }

    public async Task ChangePasswordAsync(string maTaiKhoan, ChangePasswordRequest request)
    {
        var account = await _db.TaiKhoans.FindAsync(maTaiKhoan) ?? throw new KeyNotFoundException("Không tìm thấy tài khoản.");
        if (!VerifyPassword(request.MatKhauCu, account.MatKhau)) throw new InvalidOperationException("Mật khẩu cũ không đúng.");
        account.MatKhau = HashPassword(request.MatKhauMoi);
        await _db.SaveChangesAsync();
    }

    public static string HashPassword(string password)
    {
        using var sha = SHA256.Create();
        return Convert.ToHexString(sha.ComputeHash(Encoding.UTF8.GetBytes(password)));
    }

    public static bool VerifyPassword(string password, string stored)
    {
        // Hỗ trợ dữ liệu seed hiện tại: mật khẩu mẫu là 123456 dạng thường.
        if (stored == password) return true;
        return string.Equals(HashPassword(password), stored, StringComparison.OrdinalIgnoreCase);
    }
}
