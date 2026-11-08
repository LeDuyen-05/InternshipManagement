using InternshipManagement.BLL.DTOs.Admin;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.Auth;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternshipManagement.UnitTests;

// QTV tạo tài khoản: mã và tên đăng nhập được cắt khoảng trắng rồi kiểm tra, không lưu tài khoản không dùng/không quản lý được.
public class AccountIdentityTests
{
    private static async Task<AppDbContext> DbAsync()
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.VaiTros.Add(new VaiTro { MaVaiTro = "VT01", TenVaiTro = "QuanTriVien" });
        await db.SaveChangesAsync();
        return db;
    }

    private static Task Create(AppDbContext db, string ma, string ten) =>
        new AdminService(db, null!, new PasswordService(), null!).CreateAccountAsync(new CreateAccountRequest(ma, ten, "123456", "VT01", null, null, null));

    [Theory]
    [InlineData("", "hople01")]
    [InlineData("   ", "hople02")]
    [InlineData("TK X", "hople03")]
    [InlineData("TK_DD0123456789abcdefg", "hople04")] // 22 ký tự
    [InlineData("TKA1", "")]
    [InlineData("TKA2", "   ")]
    [InlineData("TKA3", "ab")]
    [InlineData("TKA4", "a b c")]
    public async Task InvalidIdOrUsernameIsRejectedWithAClearMessage(string ma, string ten)
    {
        await using var db = await DbAsync();
        await Assert.ThrowsAsync<ArgumentException>(() => Create(db, ma, ten));
        Assert.Empty(await db.TaiKhoans.ToListAsync());
    }

    [Fact]
    public async Task SurroundingSpacesAreTrimmedAndTheTrimmedNameMustBeUnique()
    {
        await using var db = await DbAsync();
        await Create(db, " TK001 ", " gv001 ");
        var saved = await db.TaiKhoans.SingleAsync();
        Assert.Equal(("TK001", "gv001"), (saved.MaTaiKhoan, saved.TenDangNhap));

        await Assert.ThrowsAsync<InvalidOperationException>(() => Create(db, "TK002", "  gv001"));
        Assert.Equal(1, await db.TaiKhoans.CountAsync());
    }
}
