using InternshipManagement.BLL.Services.PhanBo;
using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternshipManagement.UnitTests;

// Hủy nơi thực tập không được giữ chỗ trong chỉ tiêu GVHD; khi phân bổ lại, GV cũ hướng dẫn tiếp nếu còn chỉ tiêu.
public class PlacementLecturerQuotaTests
{
    private sealed class Clock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(2027, 3, 10, 3, 0, 0, TimeSpan.Zero);
    }

    private static readonly Clock Now = new();

    private static async Task<AppDbContext> SeedAsync(int lecturerQuota)
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options) { RoundClock = Now };
        db.DotThucTaps.Add(new() { MaSo = "R", TenDot = "Đợt đang diễn ra", NamHoc = "2026-2027", TrangThai = "DangDienRa", MaRubric = "RB",
            ThoiGianBD = new(2027, 2, 1), ThoiGianKT = new(2027, 5, 1), HanDieuChinhNoiThucTap = new DateTimeOffset(2027, 4, 1, 0, 0, 0, TimeSpan.Zero) });
        db.CongTys.AddRange(new() { MaCongTy = "CT1", TenCongTy = "Công ty cũ", TrangThai = "DaDuyet", SoLuongNhan = 5 },
            new() { MaCongTy = "CT2", TenCongTy = "Công ty mới", TrangThai = "DaDuyet", SoLuongNhan = 5 });
        db.GiangViens.Add(new() { MaGV = "GV", HoTen = "Giảng viên", ChiTieuHD = lecturerQuota });
        db.SinhViens.AddRange(new() { MaSV = "SV", HoTen = "Bị hủy nơi" }, new() { MaSV = "SV2", HoTen = "Sinh viên khác" });
        db.PhanBoThucTaps.AddRange(
            new() { MaPhanBo = "PB1", MaSinhVien = "SV", MaCongTy = "CT1", MaDot = "R", NgayPhanBo = new(2027, 1, 20), TrangThai = "DangThucTap", DaDuocKhoaDuyet = true },
            new() { MaPhanBo = "PB2", MaSinhVien = "SV2", MaCongTy = "CT1", MaDot = "R", NgayPhanBo = new(2027, 1, 20), TrangThai = "DangThucTap", DaDuocKhoaDuyet = true });
        db.GVHuongDans.Add(new() { MaSo = "HD1", MaGiangVien = "GV", MaSinhVien = "SV", MaDot = "R", NgayPC = new(2027, 2, 1), TrangThai = "DangHuongDan" });
        await db.SaveChangesAsync();
        return db;
    }

    private static Task<int> AssignedAsync(AppDbContext db) => db.GVHuongDans.CountAsync(x => x.MaGiangVien == "GV" && x.MaDot == "R" && x.TrangThai == "DangHuongDan");

    [Fact]
    public async Task CancellingAPlacementFreesTheLecturerSlotAndReallocationResumesTheLecturer()
    {
        await using var db = await SeedAsync(lecturerQuota: 1);
        var service = new DieuChinhNoiThucTapService(db, Now);

        var paused = await service.CancelAsync("PB1", new("R", "DangThucTap", "SV xin đổi nơi", "Đơn của SV", true), "K");

        Assert.Equal(["GV"], paused);
        Assert.Equal("TamDung", (await db.GVHuongDans.FindAsync("HD1"))!.TrangThai);
        Assert.Equal(0, await AssignedAsync(db));

        var result = await service.ReallocateAsync("PB1", new("R", "CT2", "Chuyển nơi", "Thư tiếp nhận của DN", true, true), "K");

        Assert.True(result.GVTiepTuc);
        Assert.Equal("GV", result.MaGVHuongDan);
        Assert.Equal("DangHuongDan", (await db.GVHuongDans.FindAsync("HD1"))!.TrangThai);
        Assert.Equal(1, await AssignedAsync(db));
    }

    [Fact]
    public async Task ReallocationLeavesTheStudentForReassignmentWhenTheLecturerIsFull()
    {
        await using var db = await SeedAsync(lecturerQuota: 1);
        var service = new DieuChinhNoiThucTapService(db, Now);
        await service.CancelAsync("PB1", new("R", "DangThucTap", "SV xin đổi nơi", "Đơn của SV", true), "K");
        // Chỗ được giải phóng đã dùng cho sinh viên khác.
        db.GVHuongDans.Add(new() { MaSo = "HD2", MaGiangVien = "GV", MaSinhVien = "SV2", MaDot = "R", NgayPC = new(2027, 3, 1), TrangThai = "DangHuongDan" });
        await db.SaveChangesAsync();

        var result = await service.ReallocateAsync("PB1", new("R", "CT2", "Chuyển nơi", "Thư tiếp nhận của DN", true, true), "K");

        Assert.False(result.GVTiepTuc);
        Assert.Contains("đủ chỉ tiêu", result.GhiChuGVHD);
        Assert.Equal("HuyBo", (await db.GVHuongDans.FindAsync("HD1"))!.TrangThai);
        Assert.Equal(1, await AssignedAsync(db));
    }
}
