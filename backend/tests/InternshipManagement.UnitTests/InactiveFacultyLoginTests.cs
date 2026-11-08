using InternshipManagement.BLL.Services.Auth;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Common;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternshipManagement.UnitTests;

// Khoa ngừng hoạt động: cán bộ Khoa của khoa đó không đăng nhập được nữa; GV/SV và cán bộ khoa khác không ảnh hưởng.
public class InactiveFacultyLoginTests
{
    private readonly IPasswordService _passwords = new PasswordService();

    private AppDbContext CreateDb()
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var khoa = new VaiTro { MaVaiTro = "VT02", TenVaiTro = "Khoa" };
        var gv = new VaiTro { MaVaiTro = "VT03", TenVaiTro = "GiangVien" };
        db.VaiTros.AddRange(khoa, gv);
        db.Khoas.AddRange(new Khoa { MaKhoa = "CNTT", TenKhoa = "Khoa Công nghệ thông tin" },
            new Khoa { MaKhoa = "QTKD", TenKhoa = "Khoa Quản trị kinh doanh", HoatDong = false });
        db.GiangViens.Add(new GiangVien { MaGV = "GVQT1", HoTen = "Giảng viên QTKD", MaKhoa = "QTKD" });
        db.TaiKhoans.AddRange(
            Account("TKK1", "khoa01", khoa, maKhoa: "CNTT"),
            Account("TKK2", "khoa02", khoa, maKhoa: "QTKD"),
            Account("TKGV", "gvqt1", gv, maGV: "GVQT1"));
        db.SaveChanges();
        return db;
    }

    private TaiKhoan Account(string id, string user, VaiTro role, string? maKhoa = null, string? maGV = null) => new()
    {
        MaTaiKhoan = id, TenDangNhap = user, MatKhau = _passwords.Hash("123456"), TrangThai = "HoatDong",
        MaVaiTro = role.MaVaiTro, VaiTro = role, MaKhoa = maKhoa, MaGV = maGV
    };

    [Fact]
    public async Task StaffOfInactiveFacultyCannotLogIn()
    {
        await using var db = CreateDb();
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => new AuthService(db, _passwords).AuthenticateAsync("khoa02", "123456"));
        Assert.Equal(KhoaCuaTaiKhoan.ThongBaoKhoaDaNgung, ex.Message);
    }

    [Fact]
    public async Task WrongPasswordDoesNotRevealThatTheFacultyIsInactive()
    {
        await using var db = CreateDb();
        Assert.Null(await new AuthService(db, _passwords).AuthenticateAsync("khoa02", "sai-mat-khau"));
    }

    [Fact]
    public async Task OtherFacultyStaffAndLecturersOfTheInactiveFacultyStillLogIn()
    {
        await using var db = CreateDb();
        var auth = new AuthService(db, _passwords);
        Assert.NotNull(await auth.AuthenticateAsync("khoa01", "123456"));
        Assert.NotNull(await auth.AuthenticateAsync("gvqt1", "123456"));
    }

    [Fact]
    public async Task OldTokenCheckFollowsTheFacultyStatus()
    {
        await using var db = CreateDb();
        var staff = await db.TaiKhoans.SingleAsync(x => x.MaTaiKhoan == "TKK2");
        Assert.True(await KhoaCuaTaiKhoan.KhoaDaNgungAsync(db, staff));
        Assert.False(await KhoaCuaTaiKhoan.KhoaDaNgungAsync(db, await db.TaiKhoans.SingleAsync(x => x.MaTaiKhoan == "TKK1")));
        Assert.False(await KhoaCuaTaiKhoan.KhoaDaNgungAsync(db, await db.TaiKhoans.SingleAsync(x => x.MaTaiKhoan == "TKGV")));

        (await db.Khoas.SingleAsync(x => x.MaKhoa == "QTKD")).HoatDong = true;
        await db.SaveChangesAsync();
        Assert.False(await KhoaCuaTaiKhoan.KhoaDaNgungAsync(db, staff)); // mở lại khoa thì dùng lại được
    }
}
