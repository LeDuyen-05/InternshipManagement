using InternshipManagement.BLL.DTOs.Auth;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Common;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.Auth;

public class AuthService
{
    private readonly AppDbContext _db;
    private readonly IPasswordService _passwords;

    public AuthService(AppDbContext db, IPasswordService passwords)
    {
        _db = db;
        _passwords = passwords;
    }

    public async Task<TaiKhoan?> AuthenticateAsync(string username, string password)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrEmpty(password)) return null;

        var name = username.Trim(); // Không trim mật khẩu
        var account = await _db.TaiKhoans
            .Include(x => x.VaiTro)
            .FirstOrDefaultAsync(x => x.TenDangNhap == name);

        // Hỗ trợ InMemory database trong Unit Test (không có SQL Server collation Vietnamese_CI_AS)
        if (account is null && _db.Database.ProviderName?.Contains("InMemory") == true)
        {
            account = await _db.TaiKhoans
                .Include(x => x.VaiTro)
                .FirstOrDefaultAsync(x => x.TenDangNhap.ToLower() == name.ToLower());
        }

        if (account is null || account.TrangThai != "HoatDong") return null;

        var check = _passwords.Verify(password, account.MatKhau);
        if (check == PasswordCheck.Failed) return null;
        if (account.MaVaiTro == "VT05"
            && await EnterpriseAccountPolicy.HasOtherActiveAccountAsync(_db, account.MaDaiDien, account.MaTaiKhoan))
            throw new InvalidOperationException("Doanh nghiệp có nhiều tài khoản đại diện hoạt động hoặc liên kết không hợp lệ. Liên hệ QTV xác minh tài khoản được giữ quyền.");
        if (check == PasswordCheck.SuccessNeedsRehash)
        {
            account.MatKhau = _passwords.Hash(password);
            account.SecurityStamp = Guid.NewGuid().ToString("N");
            await _db.SaveChangesAsync();
        }
        return account;
    }

    public async Task<TaiKhoan> RegisterAsync(RegisterRequest request)
    {
        var username = request.TenDangNhap?.Trim();
        if (string.IsNullOrWhiteSpace(username) || username.Length < 4)
            throw new ArgumentException("Tên đăng nhập tối thiểu 4 ký tự.");
        if (string.IsNullOrEmpty(request.MatKhau) || request.MatKhau.Length < 6)
            throw new ArgumentException("Mật khẩu tối thiểu 6 ký tự.");

        var maSV = request.MaSV?.Trim();
        if (string.IsNullOrWhiteSpace(maSV) || !await _db.SinhViens.AnyAsync(x => x.MaSV == maSV))
            throw new ArgumentException("Mã sinh viên không có trong danh sách của Khoa.");

        if (await _db.TaiKhoans.AnyAsync(x => x.MaSV == maSV))
            throw new InvalidOperationException("Sinh viên này đã có tài khoản.");
        if (await _db.TaiKhoans.AnyAsync(x => x.TenDangNhap == username))
            throw new InvalidOperationException("Tên đăng nhập đã tồn tại.");

        var account = new TaiKhoan
        {
            MaTaiKhoan = IdGenerator.New("TK"),
            TenDangNhap = username,
            TrangThai = "ChuaKichHoat", // Khoa kích hoạt (nút Mở khóa)
            MaVaiTro = "VT04",
            MaSV = maSV,
            MaGV = null,
            MaDaiDien = null
        };
        account.MatKhau = _passwords.Hash(request.MatKhau);

        _db.TaiKhoans.Add(account);
        await _db.SaveChangesAsync();
        return account;
    }

    public async Task ChangePasswordAsync(string maTaiKhoan, ChangePasswordRequest request)
    {
        if (string.IsNullOrEmpty(request.MatKhauMoi) || request.MatKhauMoi.Length < 6)
            throw new ArgumentException("Mật khẩu mới tối thiểu 6 ký tự.");
        if (request.MatKhauCu == request.MatKhauMoi)
            throw new ArgumentException("Mật khẩu mới phải khác mật khẩu cũ.");

        var account = await _db.TaiKhoans.FindAsync(maTaiKhoan)
            ?? throw new KeyNotFoundException("Không tìm thấy tài khoản.");

        var check = _passwords.Verify(request.MatKhauCu, account.MatKhau);
        if (check == PasswordCheck.Failed)
            throw new InvalidOperationException("Mật khẩu cũ không đúng.");

        account.MatKhau = _passwords.Hash(request.MatKhauMoi);
        account.SecurityStamp = Guid.NewGuid().ToString("N");
        await _db.SaveChangesAsync();
    }

    public async Task RevokeSessionsAsync(string maTaiKhoan)
    {
        var account = await _db.TaiKhoans.FindAsync(maTaiKhoan)
            ?? throw new KeyNotFoundException("Không tìm thấy tài khoản.");
        account.SecurityStamp = Guid.NewGuid().ToString("N");
        await _db.SaveChangesAsync();
    }

    public async Task<AccountProfileDto> GetProfileAsync(string maTaiKhoan)
    {
        var account = await _db.TaiKhoans.FindAsync(maTaiKhoan)
            ?? throw new KeyNotFoundException("Không tìm thấy tài khoản.");
        var hoTen = await ResolveHoTenAsync(account);
        return ToProfileDto(account, hoTen);
    }

    public async Task<AccountProfileDto> UpdateProfileAsync(string maTaiKhoan, UpdateOwnProfileRequest request)
    {
        var account = await _db.TaiKhoans.FindAsync(maTaiKhoan)
            ?? throw new KeyNotFoundException("Không tìm thấy tài khoản.");

        var email = request.Email?.Trim();
        if (!string.IsNullOrEmpty(email) && !System.Text.RegularExpressions.Regex.IsMatch(email, @"^[^\s@]+@[^\s@]+\.[^\s@]+$"))
            throw new ArgumentException("Email không đúng định dạng.");

        var phone = request.SoDienThoai?.Trim();
        if (!string.IsNullOrEmpty(phone) && !System.Text.RegularExpressions.Regex.IsMatch(phone, @"^[0-9+(). -]{8,30}$"))
            throw new ArgumentException("Số điện thoại không hợp lệ.");

        account.Email = string.IsNullOrEmpty(email) ? null : email;
        account.SoDienThoai = string.IsNullOrEmpty(phone) ? null : phone;
        await _db.SaveChangesAsync();
        var hoTen = await ResolveHoTenAsync(account);
        return ToProfileDto(account, hoTen);
    }

    private async Task<string?> ResolveHoTenAsync(TaiKhoan account)
    {
        if (!string.IsNullOrEmpty(account.MaGV))
            return (await _db.GiangViens.FindAsync(account.MaGV))?.HoTen;
        if (!string.IsNullOrEmpty(account.MaSV))
            return (await _db.SinhViens.FindAsync(account.MaSV))?.HoTen;
        if (!string.IsNullOrEmpty(account.MaDaiDien))
            return (await _db.DaiDienDoanhNghieps.FindAsync(account.MaDaiDien))?.HoTen;
        return null;
    }

    private static AccountProfileDto ToProfileDto(TaiKhoan account, string? hoTen) => new(
        account.MaTaiKhoan, account.TenDangNhap, account.MaVaiTro,
        account.MaSV, account.MaGV, account.MaDaiDien, account.Email, account.SoDienThoai, hoTen);
}
