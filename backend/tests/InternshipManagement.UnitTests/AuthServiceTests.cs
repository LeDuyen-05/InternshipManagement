using InternshipManagement.BLL.Services.Auth;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternshipManagement.UnitTests;

public class AuthServiceTests
{
    private AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var db = new AppDbContext(options);

        var vt = new VaiTro { MaVaiTro = "VT01", TenVaiTro = "Admin" };
        db.VaiTros.Add(vt);
        db.TaiKhoans.Add(new TaiKhoan
        {
            MaTaiKhoan = "TK001",
            TenDangNhap = "admin",
            MatKhau = "123456",
            TrangThai = "HoatDong",
            MaVaiTro = "VT01",
            VaiTro = vt
        });
        db.SaveChanges();
        return db;
    }

    [Fact]
    public async Task AuthenticateAsync_WithValidCredentials_ReturnsAccount()
    {
        using var db = CreateDbContext();
        var service = new AuthService(db);

        var account = await service.AuthenticateAsync("admin", "123456");

        Assert.NotNull(account);
        Assert.Equal("admin", account.TenDangNhap);
        Assert.Equal("VT01", account.MaVaiTro);
    }

    [Fact]
    public async Task AuthenticateAsync_WithSpacesAndUppercase_ReturnsAccount()
    {
        using var db = CreateDbContext();
        var service = new AuthService(db);

        var account = await service.AuthenticateAsync(" ADMIN ", "123456 ");

        Assert.NotNull(account);
        Assert.Equal("admin", account.TenDangNhap);
    }

    [Fact]
    public async Task AuthenticateAsync_WithWrongPassword_ReturnsNull()
    {
        using var db = CreateDbContext();
        var service = new AuthService(db);

        var account = await service.AuthenticateAsync("admin", "wrongpass");

        Assert.Null(account);
    }
}
