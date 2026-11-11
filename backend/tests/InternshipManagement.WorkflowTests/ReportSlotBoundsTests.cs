using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.Auth;
using InternshipManagement.BLL.Services.GVHuongDan;
using InternshipManagement.BLL.Validators.SinhVien;
using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InternshipManagement.WorkflowTests;

// 04/11/2026: tham số tạo mốc phải hữu hạn và ngày bắt đầu thuộc khung đợt.
public class ReportSlotBoundsTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(105)]
    [InlineData(int.MaxValue)]
    public async Task InvalidWeekCountsAreRejectedBeforeCreatingRows(int weeks)
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var service = new AdminService(db, Mock.Of<IGVHuongDanService>(), new PasswordService(), new SinhVienValidator());
        await Assert.ThrowsAsync<ArgumentException>(() => service.GenerateReportSlotsAsync(new("D", weeks)));
        Assert.Empty(db.TienDoThucTaps);
    }

    [Theory]
    [InlineData("2028-12-31")]
    [InlineData("2029-02-01")]
    public async Task StartOutsideTheRoundIsRejected(string date)
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.DotThucTaps.Add(new() { MaSo = "D", TenDot = "Đợt mẫu", NamHoc = "2028-2029", ThoiGianBD = new(2029, 1, 1), ThoiGianKT = new(2029, 1, 31) });
        await db.SaveChangesAsync();
        var service = new AdminService(db, Mock.Of<IGVHuongDanService>(), new PasswordService(), new SinhVienValidator());
        await Assert.ThrowsAsync<ArgumentException>(() => service.GenerateReportSlotsAsync(new("D", 12, DateTime.Parse(date))));
        Assert.Empty(db.TienDoThucTaps);
    }
}
