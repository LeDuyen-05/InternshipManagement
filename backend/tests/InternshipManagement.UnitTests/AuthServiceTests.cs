using System.Security.Cryptography;
using System.Text;
using InternshipManagement.BLL.DTOs.Auth;
using InternshipManagement.BLL.Services.Auth;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternshipManagement.UnitTests;

public class AuthServiceTests
{
    private readonly IPasswordService _passwordService = new PasswordService();

    private AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var db = new AppDbContext(options);

        var vtAdmin = new VaiTro { MaVaiTro = "VT01", TenVaiTro = "Admin" };
        var vtStudent = new VaiTro { MaVaiTro = "VT04", TenVaiTro = "SinhVien" };
        db.VaiTros.AddRange(vtAdmin, vtStudent);

        db.SinhViens.Add(new SinhVien
        {
            MaSV = "SV001",
            HoTen = "Nguyen Van A",
            Lop = "CNTT1"
        });

        db.SinhViens.Add(new SinhVien
        {
            MaSV = "SV002",
            HoTen = "Tran Thi B",
            Lop = "CNTT2"
        });

        // Tài khoản admin hợp lệ
        db.TaiKhoans.Add(new TaiKhoan
        {
            MaTaiKhoan = "TK001",
            TenDangNhap = "admin",
            MatKhau = _passwordService.Hash("123456"),
            TrangThai = "HoatDong",
            MaVaiTro = "VT01",
            VaiTro = vtAdmin
        });

        // Tài khoản có mật khẩu có khoảng trắng
        db.TaiKhoans.Add(new TaiKhoan
        {
            MaTaiKhoan = "TK002",
            TenDangNhap = "user_space",
            MatKhau = _passwordService.Hash(" pass with spaces "),
            TrangThai = "HoatDong",
            MaVaiTro = "VT01",
            VaiTro = vtAdmin
        });

        // Tài khoản cũ dùng SHA-256
        var sha256Hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes("legacypass")));
        db.TaiKhoans.Add(new TaiKhoan
        {
            MaTaiKhoan = "TK003",
            TenDangNhap = "legacy_user",
            MatKhau = sha256Hash,
            TrangThai = "HoatDong",
            MaVaiTro = "VT01",
            VaiTro = vtAdmin
        });

        // Tài khoản lưu mật khẩu plaintext
        db.TaiKhoans.Add(new TaiKhoan
        {
            MaTaiKhoan = "TK004",
            TenDangNhap = "plaintext_user",
            MatKhau = "plaintext123",
            TrangThai = "HoatDong",
            MaVaiTro = "VT01",
            VaiTro = vtAdmin
        });

        // Tài khoản bị khóa
        db.TaiKhoans.Add(new TaiKhoan
        {
            MaTaiKhoan = "TK005",
            TenDangNhap = "locked_user",
            MatKhau = _passwordService.Hash("123456"),
            TrangThai = "BiKhoa",
            MaVaiTro = "VT01",
            VaiTro = vtAdmin
        });

        // Tài khoản sinh viên đã liên kết SV001
        db.TaiKhoans.Add(new TaiKhoan
        {
            MaTaiKhoan = "TK006",
            TenDangNhap = "sv001",
            MatKhau = _passwordService.Hash("123456"),
            TrangThai = "HoatDong",
            MaVaiTro = "VT04",
            MaSV = "SV001",
            VaiTro = vtStudent
        });

        db.SaveChanges();
        return db;
    }

    [Fact]
    public async Task AuthenticateAsync_WithValidCredentials_ReturnsAccount()
    {
        using var db = CreateDbContext();
        var service = new AuthService(db, _passwordService);

        var account = await service.AuthenticateAsync("admin", "123456");

        Assert.NotNull(account);
        Assert.Equal("admin", account.TenDangNhap);
        Assert.Equal("VT01", account.MaVaiTro);
    }

    [Fact]
    public async Task AuthenticateAsync_WithSpacesAndUppercaseUsername_ReturnsAccount()
    {
        using var db = CreateDbContext();
        var service = new AuthService(db, _passwordService);

        var account = await service.AuthenticateAsync(" ADMIN ", "123456");

        Assert.NotNull(account);
        Assert.Equal("admin", account.TenDangNhap);
    }

    [Fact]
    public async Task AuthenticateAsync_WithWrongPassword_ReturnsNull()
    {
        using var db = CreateDbContext();
        var service = new AuthService(db, _passwordService);

        var account = await service.AuthenticateAsync("admin", "wrongpass");

        Assert.Null(account);
    }

    [Fact]
    public async Task AuthenticateAsync_WithPasswordLeadingTrailingSpaces_DoesNotTrimPassword()
    {
        using var db = CreateDbContext();
        var service = new AuthService(db, _passwordService);

        // Mật khẩu đúng có khoảng trắng
        var account = await service.AuthenticateAsync("user_space", " pass with spaces ");
        Assert.NotNull(account);

        // Mật khẩu bị trim sẽ không khớp
        var trimmedCheck = await service.AuthenticateAsync("user_space", "pass with spaces");
        Assert.Null(trimmedCheck);
    }

    [Fact]
    public async Task AuthenticateAsync_WithLegacySha256_LogsInAndRehashesToIdentityV3()
    {
        using var db = CreateDbContext();
        var service = new AuthService(db, _passwordService);

        var account = await service.AuthenticateAsync("legacy_user", "legacypass");
        Assert.NotNull(account);

        // Kiểm tra sau khi đăng nhập thành công, mật khẩu đã được tự động nâng cấp thành Identity V3 (AQAAAA...)
        var updatedAccount = await db.TaiKhoans.FirstAsync(x => x.TenDangNhap == "legacy_user");
        Assert.StartsWith("AQAAAA", updatedAccount.MatKhau);
    }

    [Fact]
    public async Task AuthenticateAsync_WithPlaintext_ReturnsNull()
    {
        using var db = CreateDbContext();
        var service = new AuthService(db, _passwordService);

        var account = await service.AuthenticateAsync("plaintext_user", "plaintext123");
        Assert.Null(account);
    }

    [Fact]
    public async Task AuthenticateAsync_WhenAccountLockedOrInactive_ReturnsNull()
    {
        using var db = CreateDbContext();
        var service = new AuthService(db, _passwordService);

        var account = await service.AuthenticateAsync("locked_user", "123456");
        Assert.Null(account);
    }

    [Fact]
    public async Task RegisterAsync_WithValidStudent_CreatesAccountWithChuaKichHoat()
    {
        using var db = CreateDbContext();
        var service = new AuthService(db, _passwordService);

        var request = new RegisterRequest
        {
            TenDangNhap = "sv002_user",
            MatKhau = "secret123",
            MaSV = "SV002"
        };

        var created = await service.RegisterAsync(request);

        Assert.NotNull(created);
        Assert.Equal("sv002_user", created.TenDangNhap);
        Assert.Equal("SV002", created.MaSV);
        Assert.Equal("ChuaKichHoat", created.TrangThai);
        Assert.Equal("VT04", created.MaVaiTro);
        Assert.StartsWith("AQAAAA", created.MatKhau);
    }

    [Fact]
    public async Task RegisterAsync_WithNonExistentStudent_ThrowsArgumentException()
    {
        using var db = CreateDbContext();
        var service = new AuthService(db, _passwordService);

        var request = new RegisterRequest
        {
            TenDangNhap = "unknown_user",
            MatKhau = "secret123",
            MaSV = "SV999"
        };

        await Assert.ThrowsAsync<ArgumentException>(() => service.RegisterAsync(request));
    }

    [Fact]
    public async Task RegisterAsync_WhenStudentAlreadyHasAccount_ThrowsInvalidOperationException()
    {
        using var db = CreateDbContext();
        var service = new AuthService(db, _passwordService);

        var request = new RegisterRequest
        {
            TenDangNhap = "new_sv001_acc",
            MatKhau = "secret123",
            MaSV = "SV001"
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.RegisterAsync(request));
    }

    [Fact]
    public async Task RegisterAsync_WhenUsernameAlreadyExists_ThrowsInvalidOperationException()
    {
        using var db = CreateDbContext();
        var service = new AuthService(db, _passwordService);

        var request = new RegisterRequest
        {
            TenDangNhap = "admin",
            MatKhau = "secret123",
            MaSV = "SV002"
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.RegisterAsync(request));
    }
}
