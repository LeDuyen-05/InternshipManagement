using InternshipManagement.BLL.DTOs.Admin;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.Auth;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Common;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternshipManagement.UnitTests;

// Chỉ tiêu GV: 0–50 và không thấp hơn số SV đang hướng dẫn trong đợt còn mở.
public class LecturerQuotaTests
{
    private static AppDbContext Db()
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.DotThucTaps.AddRange(
            new DotThucTap { MaSo = "OPEN", TenDot = "Đang mở", NamHoc = "2026", TrangThai = "DangDienRa", MaRubric = "R" },
            new DotThucTap { MaSo = "DONE", TenDot = "Đã kết thúc", NamHoc = "2025", TrangThai = "DaKetThuc", MaRubric = "R" },
            new DotThucTap { MaSo = "NOPLAN", TenDot = "Chưa có kế hoạch", NamHoc = "2026", TrangThai = "DangDienRa", MaRubric = "R" });
        db.GiangViens.Add(new GiangVien { MaGV = "GV", HoTen = "Giảng viên", ChuyenMon = "CNTT", ChiTieuHD = 10 });
        db.CongTys.Add(new CongTy { MaCongTy = "CT", TenCongTy = "Công ty", TrangThai = "DaDuyet" });
        db.CongTyTheoDots.Add(new CongTyTheoDot { MaCongTy = "CT", MaDot = "OPEN", ViTriTuyen = "TTS", YeuCau = "JD", SoLuongNhan = 5,
            MoDangKy = DateTimeOffset.UtcNow.AddDays(-1), HanDangKy = DateTimeOffset.UtcNow.AddDays(10) });
        // Đợt đang mở: 2 SV; đợt đã kết thúc: 3 SV (không còn tính).
        foreach (var (id, round) in new[] { ("A1", "OPEN"), ("A2", "OPEN"), ("B1", "DONE"), ("B2", "DONE"), ("B3", "DONE") })
            db.GVHuongDans.Add(new GVHuongDan { MaSo = id, MaGiangVien = "GV", MaSinhVien = "SV" + id, MaDot = round, NgayPC = DateTime.Today, TrangThai = "DangHuongDan" });
        db.SaveChanges();
        return db;
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(51)]
    [InlineData(100000)]
    public async Task QuotaOutsideZeroToFiftyIsRejected(int quota)
    {
        await using var db = Db();
        await Assert.ThrowsAsync<ArgumentException>(() => ChiTieuHuongDan.KiemTraAsync(db, "GV", quota));
    }

    [Fact]
    public async Task QuotaCannotDropBelowStudentsSupervisedInAnOpenRound()
    {
        await using var db = Db();

        Assert.Equal(2, await ChiTieuHuongDan.DangHuongDanAsync(db, "GV"));
        var repository = new GVHuongDanRepository(db);
        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => repository.CapNhatChiTieuAsync("GV", 1));
        Assert.Contains("đang hướng dẫn 2 sinh viên", error.Message);
        Assert.Equal(10, (await db.GiangViens.FindAsync("GV"))!.ChiTieuHD);

        Assert.True(await repository.CapNhatChiTieuAsync("GV", 2));
        Assert.Equal(2, (await db.GiangViens.FindAsync("GV"))!.ChiTieuHD);
    }

    [Fact]
    public async Task CatalogEditOfALecturerFollowsTheSameRule()
    {
        await using var db = Db();
        var admin = new AdminService(db, null!, new PasswordService(), null!);

        await Assert.ThrowsAsync<InvalidOperationException>(() => admin.UpdateLecturerAsync("GV", new CreateLecturerRequest("GV", "Giảng viên", "CNTT", 1)));
        await Assert.ThrowsAsync<ArgumentException>(() => admin.CreateLecturerAsync(new CreateLecturerRequest("GV2", "GV mới", "CNTT", 60)));
        await admin.CreateLecturerAsync(new CreateLecturerRequest("GV3", "GV mới", "CNTT", 0));
        Assert.Equal(10, (await db.GiangViens.FindAsync("GV3"))!.ChiTieuHD);
    }
}
