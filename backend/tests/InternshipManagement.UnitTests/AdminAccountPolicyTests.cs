using InternshipManagement.BLL.DTOs.Admin;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.Auth;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternshipManagement.UnitTests;

public class AdminAccountPolicyTests
{
    private static AppDbContext Db()
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.VaiTros.AddRange(
            new VaiTro { MaVaiTro = "VT01", TenVaiTro = "QuanTriVien" },
            new VaiTro { MaVaiTro = "VT02", TenVaiTro = "Khoa" },
            new VaiTro { MaVaiTro = "VT03", TenVaiTro = "GiangVien" },
            new VaiTro { MaVaiTro = "VT04", TenVaiTro = "SinhVien" },
            new VaiTro { MaVaiTro = "VT05", TenVaiTro = "DoanhNghiep" }
        );
        db.SinhViens.AddRange(
            new SinhVien { MaSV = "SV001", HoTen = "Sinh viên Một" },
            new SinhVien { MaSV = "SV002", HoTen = "Sinh viên Hai" }
        );
        db.GiangViens.AddRange(
            new GiangVien { MaGV = "GV001", HoTen = "Giảng viên Một" },
            new GiangVien { MaGV = "GV002", HoTen = "Giảng viên Hai" }
        );
        db.CongTys.Add(new CongTy { MaCongTy = "CT001", TenCongTy = "Công ty Chuẩn", TrangThai = "DaDuyet" });
        db.DaiDienDoanhNghieps.Add(new DaiDienDoanhNghiep { MaSo = "DD001", HoTen = "Đại diện Một", MaCongTy = "CT001" });
        db.SaveChanges();
        return db;
    }

    private static AdminService Admin(AppDbContext db) => new(db, null!, new PasswordService(), null!);

    [Fact]
    public async Task CreateAccount_PreventsDuplicateStudentOrLecturerBinding()
    {
        await using var db = Db();
        var admin = Admin(db);

        // 1. Tạo tài khoản SV001 thành công
        await admin.CreateAccountAsync(new CreateAccountRequest("TK_SV1", "sv001", "pass123456", "VT04", "SV001", null, null));
        var tk1 = await db.TaiKhoans.SingleAsync(a => a.MaTaiKhoan == "TK_SV1");
        Assert.Equal("SV001", tk1.MaSV);
        Assert.Equal("HoatDong", tk1.TrangThai);

        // Tạo tài khoản khác nhưng gắn lại SV001 -> Phải ném ngoại lệ
        var exSv = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            admin.CreateAccountAsync(new CreateAccountRequest("TK_SV2", "sv001_dup", "pass123456", "VT04", "SV001", null, null)));
        Assert.Contains("Sinh viên đã có tài khoản", exSv.Message);

        // 2. Tạo tài khoản GV001 thành công
        await admin.CreateAccountAsync(new CreateAccountRequest("TK_GV1", "gv001", "pass123456", "VT03", null, "GV001", null));
        var tkGv = await db.TaiKhoans.SingleAsync(a => a.MaTaiKhoan == "TK_GV1");
        Assert.Equal("GV001", tkGv.MaGV);

        // Tạo tài khoản khác nhưng gắn lại GV001 -> Phải ném ngoại lệ
        var exGv = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            admin.CreateAccountAsync(new CreateAccountRequest("TK_GV2", "gv001_dup", "pass123456", "VT03", null, "GV001", null)));
        Assert.Contains("Giảng viên đã có tài khoản", exGv.Message);
    }

    [Fact]
    public async Task CreateAccount_SupportsPendingActivationStatus()
    {
        await using var db = Db();
        var admin = Admin(db);

        // Tạo tài khoản ở trạng thái ChuaKichHoat
        await admin.CreateAccountAsync(new CreateAccountRequest("TK_SV2", "sv002", "pass123456", "VT04", "SV002", null, null, "ChuaKichHoat"));
        var tk = await db.TaiKhoans.SingleAsync(a => a.MaTaiKhoan == "TK_SV2");
        Assert.Equal("ChuaKichHoat", tk.TrangThai);

        // Đổi trạng thái sang HoatDong (Kích hoạt)
        await admin.UpdateAccountAsync("TK_SV2", new UpdateAccountRequest("HoatDong", "VT04", MaSV: "SV002"));
        tk = await db.TaiKhoans.SingleAsync(a => a.MaTaiKhoan == "TK_SV2");
        Assert.Equal("HoatDong", tk.TrangThai);

        // Khóa tài khoản
        await admin.UpdateAccountAsync("TK_SV2", new UpdateAccountRequest("BiKhoa", "VT04", MaSV: "SV002"));
        tk = await db.TaiKhoans.SingleAsync(a => a.MaTaiKhoan == "TK_SV2");
        Assert.Equal("BiKhoa", tk.TrangThai);
    }

    [Fact]
    public async Task UpdateAccount_PreventsReassigningToExistingStudentOrLecturer()
    {
        await using var db = Db();
        var admin = Admin(db);

        await admin.CreateAccountAsync(new CreateAccountRequest("TK_SV1", "sv001", "pass123456", "VT04", "SV001", null, null));
        await admin.CreateAccountAsync(new CreateAccountRequest("TK_SV2", "sv002", "pass123456", "VT04", "SV002", null, null));

        // Sửa TK_SV2 để trỏ vào SV001 đã có tài khoản -> Chặn
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            admin.UpdateAccountAsync("TK_SV2", new UpdateAccountRequest("HoatDong", "VT04", MaSV: "SV001")));
        Assert.Contains("Sinh viên đã được gắn với tài khoản khác", ex.Message);
    }

    [Fact]
    public async Task AdminAndKhoaAccounts_CannotBindPersonalProfile()
    {
        await using var db = Db();
        var admin = Admin(db);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            admin.CreateAccountAsync(new CreateAccountRequest("TK_ADM", "admin_test", "pass123456", "VT01", "SV001", null, null)));
        Assert.Contains("không gắn với sinh viên", ex.Message);
    }
}
