using InternshipManagement.BLL.Common;
using InternshipManagement.BLL.DTOs.ThucTapTuTim;
using InternshipManagement.BLL.Services.PhanBo;
using InternshipManagement.BLL.Services.ThucTapTuTim;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternshipManagement.UnitTests;

// Thời gian thực tập tại DN (Khoa xác minh hoặc khai trong hồ sơ tự tìm) phải nằm trong khung ngày của đợt.
public class PlacementPeriodRoundTests
{
    private sealed class Clock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(2027, 1, 10, 3, 0, 0, TimeSpan.Zero);
    }

    private static readonly Clock Now = new();

    private static AppDbContext Db()
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options) { RoundClock = Now };
        db.DotThucTaps.Add(new DotThucTap { MaSo = "DOT", TenDot = "Đợt", NamHoc = "2026", TrangThai = "DangDienRa", MaRubric = "R",
            ThoiGianBD = new(2027, 2, 1), ThoiGianKT = new(2027, 5, 1) });
        db.CongTys.Add(new CongTy { MaCongTy = "CT", TenCongTy = "Công ty", TrangThai = "DaDuyet" });
        foreach (var id in new[] { "SV", "SV2" })
        {
            db.SinhViens.Add(new SinhVien { MaSV = id, HoTen = id });
            db.SinhVienThamGiaDots.Add(new SinhVienThamGiaDot { MaDot = "DOT", MaSV = id, NgayThem = Now.GetUtcNow(), NguoiThem = "K", NgayCapNhat = Now.GetUtcNow(), NguoiCapNhat = "K" });
        }
        db.PhanBoThucTaps.Add(new PhanBoThucTap { MaPhanBo = "PB", MaSinhVien = "SV", MaCongTy = "CT", MaDot = "DOT", NgayPhanBo = new(2027, 1, 5),
            TrangThai = "ChuaNhanViec", DaDuocKhoaDuyet = true });
        db.SaveChanges();
        return db;
    }

    private static SavePlacementPeriodRequest Period(DateTime start, DateTime end) => new("DOT", start, end, "DN xác nhận", "Công văn DN", 0);

    [Theory]
    [InlineData("2027-01-20", "2027-04-01")]
    [InlineData("2027-02-05", "2027-05-10")]
    public async Task FacultyCannotRecordAPeriodOutsideTheRound(string start, string end)
    {
        await using var db = Db();

        var error = await Assert.ThrowsAsync<ArgumentException>(() =>
            new PlacementPeriodService(db, Now).SaveAsync("PB", Period(DateTime.Parse(start), DateTime.Parse(end)), "K"));

        Assert.Contains("khung của đợt (01/02/2027 – 01/05/2027)", error.Message);
        Assert.Null(db.PhanBoThucTaps.Single().NgayBatDauThucTap);
    }

    [Fact]
    public async Task FacultyRecordsAPeriodInsideTheRound()
    {
        await using var db = Db();

        await new PlacementPeriodService(db, Now).SaveAsync("PB", Period(new(2027, 2, 1), new(2027, 5, 1)), "K");

        var placement = db.PhanBoThucTaps.Single();
        Assert.Equal((new DateTime(2027, 2, 1), new DateTime(2027, 5, 1)), (placement.NgayBatDauThucTap, placement.NgayKetThucThucTap));
    }

    private static GuiHoSoTuTimRequest SelfFound(DateTime start, DateTime end)
        => new("DOT", null, "Công ty ngoài", "Địa chỉ", "Thực tập sinh", "Nhân sự", "hr@example.test", start, end, true);

    [Fact]
    public async Task SelfFoundPlacementMustFitTheRound()
    {
        await using var db = Db();
        var service = new ThucTapTuTimService(db);

        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.SubmitAsync("SV2", SelfFound(new(2027, 2, 1), new(2027, 6, 30))));
        Assert.Contains("khung của đợt", error.Message);
        Assert.NotNull(await service.SubmitAsync("SV2", SelfFound(new(2027, 2, 1), new(2027, 5, 1))));
    }

    [Fact]
    public async Task OlderSelfFoundDossierOutsideTheRoundCannotBeApproved()
    {
        await using var db = Db();
        db.DeXuatThucTapTuTims.Add(new DeXuatThucTapTuTim { MaHoSo = "HS", MaSV = "SV2", MaDot = "DOT", TenCongTy = "Công ty ngoài", DiaChi = "Địa chỉ",
            ViTri = "Thực tập sinh", NguoiLienHe = "Nhân sự", LienHe = "hr@example.test", NgayBatDau = new(2027, 1, 1), NgayKetThuc = new(2027, 4, 1),
            NgayGui = new(2027, 1, 2), TrangThai = "ChoDuyet" });
        await db.SaveChangesAsync();

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => new ThucTapTuTimService(db).ReviewAsync("HS", "K", new("DaDuyet")));

        Assert.Contains("khung của đợt", error.Message);
        Assert.Empty(db.PhanBoThucTaps.Where(x => x.MaSinhVien == "SV2"));
    }

    [Fact]
    public void RoundWithoutDatesDoesNotBlock()
    {
        Assert.Null(PlacementPeriod.OutsideRound(new(2020, 1, 1), new(2030, 1, 1), new DotThucTap()));
    }
}
