using InternshipManagement.BLL.Services.PhanBo;
using InternshipManagement.BLL.Services.SinhVienTheoDot;
using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternshipManagement.UnitTests;

// Hủy nơi thực tập không được giữ chỗ trong chỉ tiêu GVHD; khi phân bổ lại, GV cũ hướng dẫn tiếp nếu còn chỉ tiêu.
// Thông báo chặn công bố/chốt danh sách phải nêu đích danh sinh viên cần xử lý.
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
        db.DangKyThucTaps.Add(new() { MaDK = "DK1", MaSV = "SV", MaCongTy = "CT1", MaDot = "R", NgayDangKy = new(2027, 1, 10), TrangThai = "DaDuyet" });
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
        // Nguyện vọng ở nơi bị hủy không còn là hồ sơ đang xử lý.
        var application = (await db.DangKyThucTaps.FindAsync("DK1"))!;
        Assert.Equal("TuChoi", application.TrangThai);
        Assert.StartsWith("Khoa hủy nơi thực tập", application.LyDoKetThuc);

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

    [Fact]
    public async Task PublicationBlockNamesTheStudentsStillInProgress()
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options) { RoundClock = Now };
        db.DotThucTaps.Add(new() { MaSo = "R", TenDot = "Đợt sắp bắt đầu", NamHoc = "2026-2027", TrangThai = "ChuaBatDau", MaRubric = "RB",
            ThoiGianBD = new(2027, 4, 1), ThoiGianKT = new(2027, 7, 1) });
        db.CongTys.Add(new() { MaCongTy = "CT1", TenCongTy = "Công ty", TrangThai = "DaDuyet", SoLuongNhan = 5 });
        foreach (var (id, name) in new[] { ("SV1", "Đã có nơi"), ("SV2", "Đang ứng tuyển") })
        {
            db.SinhViens.Add(new() { MaSV = id, HoTen = name });
            db.SinhVienThamGiaDots.Add(new() { MaDot = "R", MaSV = id, NgayThem = Now.GetUtcNow(), NguoiThem = "K", NgayCapNhat = Now.GetUtcNow(), NguoiCapNhat = "K" });
        }
        db.PhanBoThucTaps.Add(new() { MaPhanBo = "PB1", MaSinhVien = "SV1", MaCongTy = "CT1", MaDot = "R", NgayPhanBo = new(2027, 3, 1), TrangThai = "DangThucTap", DaDuocKhoaDuyet = true });
        db.DangKyThucTaps.Add(new() { MaDK = "DK2", MaSV = "SV2", MaCongTy = "CT1", MaDot = "R", NgayDangKy = new(2027, 3, 1), TrangThai = "ChoDuyet" });
        await db.SaveChangesAsync();
        var roster = new SinhVienTheoDotService(db, Now);

        var review = await new RaSoatNoiService(db, roster, Now).GetAsync("R");
        Assert.Equal(1, review.ChoXuLy);
        Assert.StartsWith("SV2 Đang ứng tuyển (", review.MoTa("ChoXuLy"));

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => new CongBoDanhSachService(db, roster, Now)
            .PublishAsync("R", new("Danh sách dự kiến", "Kiểm tra thông tin", new DateTimeOffset(2027, 3, 20, 0, 0, 0, TimeSpan.Zero)), "K"));
        Assert.Contains("SV2 Đang ứng tuyển", error.Message);
        Assert.DoesNotContain("SV1", error.Message);
    }

    [Fact]
    public void LongListsAreShortenedWithACount()
    {
        var text = LietKeSV.MoTa(Enumerable.Range(1, 8).Select(i => $"SV{i}"));

        Assert.Equal("SV1; SV2; SV3; SV4; SV5; và 3 SV khác", text);
    }
}
