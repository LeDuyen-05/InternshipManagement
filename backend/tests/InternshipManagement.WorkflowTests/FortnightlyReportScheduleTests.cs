using InternshipManagement.BLL.Common;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.Auth;
using InternshipManagement.BLL.Services.GVHuongDan;
using InternshipManagement.BLL.Validators.SinhVien;
using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InternshipManagement.WorkflowTests;

public class FortnightlyReportScheduleTests
{
    [Fact]
    public void LongPlacementIsCappedAtTwelveWeeksWithSixFortnightlyDeadlines()
    {
        var dates = ReportSchedule.Deadlines(new(2026,10,1),new(2027,1,15));
        Assert.Equal(6,dates.Count);
        Assert.Equal(new DateTime(2026,10,15),dates[0]);
        Assert.Equal(new DateTime(2026,12,23),dates[^1]);
        Assert.Equal(2,ReportSchedule.Period(new(2026,10,16),new(2026,10,1)));
    }

    [Fact]
    public async Task GenerateCreatesSixSlotsAndDoesNotDuplicateThemOnRetry()
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.DotThucTaps.Add(new() { MaSo="D",TenDot="Đợt",NamHoc="2026",ThoiGianBD=new(2026,9,28),ThoiGianKT=new(2026,12,20) });
        db.SinhViens.Add(new() { MaSV="S",HoTen="Sinh viên" });
        db.CongTys.Add(new() { MaCongTy="C",TenCongTy="Công ty" });
        db.PhanBoThucTaps.Add(new() { MaPhanBo="PB",MaSinhVien="S",MaDot="D",MaCongTy="C",DaDuocKhoaDuyet=true,
            NgayBatDauThucTap=new(2026,10,1),NgayKetThucThucTap=new(2027,1,15) });
        await db.SaveChangesAsync();
        var service = new AdminService(db,Mock.Of<IGVHuongDanService>(),new PasswordService(),new SinhVienValidator());
        Assert.Equal(6,await service.GenerateReportSlotsAsync(new("D",12)));
        Assert.Equal(0,await service.GenerateReportSlotsAsync(new("D",12)));
        Assert.Equal(6,await db.TienDoThucTaps.CountAsync());
        Assert.All(await db.TienDoThucTaps.ToListAsync(),report => { Assert.Equal("ChuaNop",report.TrangThaiDuyet); Assert.Null(report.NgayNop); Assert.Null(report.NoiDungBaoCao); });
        await Assert.ThrowsAsync<ArgumentException>(() => service.GenerateReportSlotsAsync(new("D",16)));
    }
}
