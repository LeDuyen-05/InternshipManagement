using InternshipManagement.BLL.DTOs.DoanhNghiep;
using InternshipManagement.BLL.Services.DoanhNghiep;
using InternshipManagement.BLL.Services.PhieuChamDiem;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InternshipManagement.UnitTests;

// Vị trí tuyển dụng chỉ thêm vào kế hoạch công ty theo đợt do Khoa lập, không tự tạo kế hoạch.
public class PositionPlanTests
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

    private static DoanhNghiepService Enterprise(AppDbContext db) => new(db, new Mock<IPhieuChamDiemService>().Object);

    [Fact]
    public async Task PositionNeedsAPlanMadeByTheFaculty()
    {
        await using var db = Db();

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Enterprise(db).ThemViTriAsync(new ThemViTriRequest { MaCongTy = "CT", MaDot = "NOPLAN", TenViTri = "Tự thêm", SoLuongNhan = 2 }, "CT"));

        Assert.Contains("Khoa chưa đưa công ty vào kế hoạch", error.Message);
        Assert.False(await db.CongTyTheoDots.AnyAsync(x => x.MaDot == "NOPLAN"));
        Assert.Empty(db.ViTriTheoDots);

        await Enterprise(db).ThemViTriAsync(new ThemViTriRequest { MaCongTy = "CT", MaDot = "OPEN", TenViTri = "Backend", SoLuongNhan = 2 }, "CT");
        Assert.Equal("Backend", Assert.Single(db.ViTriTheoDots).TenViTri);
    }
}
