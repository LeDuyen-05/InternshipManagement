using InternshipManagement.BLL.Common;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternshipManagement.WorkflowTests;

public class ReportProgressSummaryTests
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task SummaryCountsFortnightlyPeriodsInsteadOfRawReports(bool confirmedSchedule)
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var start = new DateTime(2026, 10, 1);
        db.DotThucTaps.Add(new() { MaSo = "D", TenDot = "Đợt", NamHoc = "2026",
            ThoiGianBD = confirmedSchedule ? start.AddDays(-3) : start, ThoiGianKT = start.AddDays(100) });
        db.SinhViens.Add(new() { MaSV = "S", HoTen = "Sinh viên" });
        db.CongTys.Add(new() { MaCongTy = "C", TenCongTy = "Công ty" });
        if (confirmedSchedule)
            db.PhanBoThucTaps.Add(new() { MaPhanBo = "P", MaSinhVien = "S", MaCongTy = "C", MaDot = "D",
                NgayBatDauThucTap = start, NgayKetThucThucTap = start.AddDays(100) });
        var dates = ReportSchedule.Deadlines(start, start.AddDays(100));
        for (var i = 0; i < dates.Count; i++)
            db.TienDoThucTaps.Add(new() { MaTienDo = $"T{i}", MaSV = "S", MaDot = "D",
                MocThoiGian = dates[i], TrangThaiDuyet = i == 0 ? "DaDuyet" : "ChuaNop",
                NgayNop = i == 0 ? dates[0] : null });
        // Trùng kỳ, trước ngày bắt đầu và sau tuần 12 không được tăng tổng kỳ hay số kỳ đã nộp.
        db.TienDoThucTaps.AddRange(
            new() { MaTienDo = "DUP", MaSV = "S", MaDot = "D", MocThoiGian = dates[0].AddDays(-1), TrangThaiDuyet = "DaNop", NgayNop = dates[0].AddDays(-1) },
            new() { MaTienDo = "OLD", MaSV = "S", MaDot = "D", MocThoiGian = start.AddDays(-16), TrangThaiDuyet = "DaDuyet" },
            new() { MaTienDo = "LATE", MaSV = "S", MaDot = "D", MocThoiGian = start.AddDays(90), TrangThaiDuyet = "DaNop" },
            new() { MaTienDo = "ARCH", MaSV = "S", MaDot = "D", MocThoiGian = dates[1], TrangThaiDuyet = "DaDuyet", MaPhanBoLuuTru = "OLD_P" });
        await db.SaveChangesAsync();
        var service = new AdminListService(db);
        var row = Assert.Single(await service.GetStudentProgressRowsAsync("D", "HienHanh", default));
        Assert.Equal(6, row.TongSoTuan);
        Assert.Equal(1, row.SoTuanDaNop);
        Assert.Equal(1, row.SoTuanDaDuyet);
        Assert.Equal(0, row.SoTuanChoDuyet);
        Assert.Equal(5, row.SoTuanChuaNop);
        Assert.Equal(16.7m, row.PhanTramHoanThanh);
        Assert.Equal(10, await db.TienDoThucTaps.CountAsync());

        // Thiếu mốc trong DB vẫn là kỳ phải nộp, không làm tiến độ tăng thành 1/5.
        db.TienDoThucTaps.Remove(await db.TienDoThucTaps.SingleAsync(x => x.MaTienDo == "T5"));
        await db.SaveChangesAsync();
        row = Assert.Single(await service.GetStudentProgressRowsAsync("D", "HienHanh", default));
        Assert.Equal(6, row.TongSoTuan);
        Assert.Equal(5, row.SoTuanChuaNop);
    }
}
