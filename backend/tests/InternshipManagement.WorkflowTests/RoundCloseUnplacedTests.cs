using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.SinhVienTheoDot;
using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternshipManagement.WorkflowTests;

// Hồi quy bế tắc chốt đợt: SV chưa từng có nơi mà Khoa không rà trước ngày bắt đầu thì trước đây không cách nào ghi nhận,
// khiến đợt không bao giờ chốt được.
public class RoundCloseUnplacedTests
{
    private sealed class Clock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(2027, 6, 10, 3, 0, 0, TimeSpan.Zero);
    }

    [Fact]
    public async Task UnplacedStudentMissedBeforeStartCanStillBeRecordedSoTheRoundCanClose()
    {
        var clock = new Clock();
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options) { RoundClock = clock };
        db.DotThucTaps.Add(new() { MaSo = "R", TenDot = "Đợt đã kết thúc", NamHoc = "2026-2027", TrangThai = "DangDienRa", MaRubric = "RB",
            ThoiGianBD = new(2027, 2, 1), ThoiGianKT = new(2027, 5, 1) });
        db.SinhViens.Add(new() { MaSV = "SV", HoTen = "Chưa có nơi" });
        db.SinhVienThamGiaDots.Add(new() { MaDot = "R", MaSV = "SV", NgayThem = clock.GetUtcNow(), NguoiThem = "K", NgayCapNhat = clock.GetUtcNow(), NguoiCapNhat = "K" });
        // Đã dùng lượt đăng ký nhưng đều kết thúc, chưa bao giờ được tiếp nhận.
        db.DangKyThucTaps.Add(new() { MaDK = "DK", MaSV = "SV", MaCongTy = "CT", MaDot = "R", NgayDangKy = new(2027, 1, 10), TrangThai = "TuChoi" });
        await db.SaveChangesAsync();

        var service = new ChotDotService(db, new SinhVienTheoDotService(db, clock), clock);
        var preview = await service.PreviewAsync("R");
        var row = Assert.Single(preview.SinhViens);
        Assert.True(row.ChuaTungCoNoi);
        Assert.True(row.CoTheXacNhanKhongHoanTat);
        Assert.Contains(row.Loi, x => x.Contains("Chưa từng có nơi"));
        Assert.False(preview.CoTheChot);

        await service.ConfirmNonCompletionAsync("R", "SV", new(preview.Khoa.PhienBan, "Không tìm được nơi thực tập", "Biên bản làm việc Khoa", false, true), "K");

        var record = await db.KhongHoanTatDots.SingleAsync();
        Assert.Equal("ChuaCoNoi", record.MaLyDo);
        Assert.False(record.TruocChotDanhSach);
        var after = await service.PreviewAsync("R");
        Assert.Empty(Assert.Single(after.SinhViens).Loi);
        Assert.True(after.CoTheChot, string.Join("; ", after.Loi));
    }

    [Fact]
    public async Task UnplacedStudentStillNeedsTheRoundToEndBeforeRecording()
    {
        var clock = new Clock();
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options) { RoundClock = clock };
        db.DotThucTaps.Add(new() { MaSo = "R", TenDot = "Đợt đang diễn ra", NamHoc = "2026-2027", TrangThai = "DangDienRa", MaRubric = "RB",
            ThoiGianBD = new(2027, 5, 1), ThoiGianKT = new(2027, 8, 1) });
        db.SinhViens.Add(new() { MaSV = "SV", HoTen = "Chưa có nơi" });
        db.SinhVienThamGiaDots.Add(new() { MaDot = "R", MaSV = "SV", NgayThem = clock.GetUtcNow(), NguoiThem = "K", NgayCapNhat = clock.GetUtcNow(), NguoiCapNhat = "K" });
        await db.SaveChangesAsync();

        var service = new ChotDotService(db, new SinhVienTheoDotService(db, clock), clock);
        var preview = await service.PreviewAsync("R");
        Assert.False(Assert.Single(preview.SinhViens).CoTheXacNhanKhongHoanTat);
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ConfirmNonCompletionAsync("R", "SV", new(preview.Khoa.PhienBan, "Sớm", "Chưa đủ căn cứ", false, true), "K"));
    }
}
