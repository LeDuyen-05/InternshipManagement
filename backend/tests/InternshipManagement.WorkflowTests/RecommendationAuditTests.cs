using InternshipManagement.BLL.Services.Recommendation;
using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InternshipManagement.WorkflowTests;

// 03/11/2026: phạm vi JD/đợt, baseline và dữ liệu đổi trong lúc đối sánh; không gọi mô hình thật.
public class RecommendationAuditTests
{
    private sealed class Clock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(2029, 1, 10, 0, 0, 0, TimeSpan.Zero);
    }
    private static readonly TimeProvider Time = new Clock();
    private static async Task<AppDbContext> Seed()
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options) { RoundClock = Time };
        db.DotThucTaps.AddRange(
            new() { MaSo = "A", TenDot = "Đợt A", NamHoc = "2028-2029", TrangThai = "DangDienRa", ThoiGianBD = new(2029, 2, 1), ThoiGianKT = new(2029, 5, 1) },
            new() { MaSo = "B", TenDot = "Đợt B", NamHoc = "2028-2029", TrangThai = "DangDienRa", ThoiGianBD = new(2029, 2, 1), ThoiGianKT = new(2029, 5, 1) });
        db.SinhViens.Add(new() { MaSV = "SV", HoTen = "Sinh viên", KyNang = "C# SQL backend" });
        foreach (var (company, round) in new[] { ("CT", "A"), ("OTHER", "B") })
        {
            db.CongTys.Add(new() { MaCongTy = company, TenCongTy = company, TrangThai = "DaDuyet" });
            db.CongTyTheoDots.Add(new() { MaCongTy = company, MaDot = round, ViTriTuyen = "Backend", YeuCau = "C# SQL backend", SoLuongNhan = 2,
                MoDangKy = Time.GetUtcNow().AddDays(-1), HanDangKy = Time.GetUtcNow().AddDays(1) });
        }
        await db.SaveChangesAsync();
        return db;
    }

    [Theory]
    [InlineData("Disabled")]
    [InlineData("Unavailable")]
    public async Task BaselineIsExplicitAndNeverUsesOtherRoundOrCreatesProfiles(string reason)
    {
        await using var db = await Seed();
        var scorer = new Mock<ILtrScorer>();
        scorer.Setup(x => x.ScoreAsync(It.IsAny<LtrProfile>(), It.IsAny<IReadOnlyList<LtrJob>>(), It.IsAny<CancellationToken>())).ReturnsAsync(new LtrAttempt(null, reason));
        var service = new RecommendationService(db, Time, scorer.Object);
        var result = await service.RecommendAsync("SV", maDot: "A");
        var item = Assert.Single(result.Items);
        Assert.Equal("CT", item.MaCongTy); Assert.Equal("A", item.MaDot);
        Assert.False(result.DaSuDungModelTrain); Assert.Null(item.RankingScore);
        Assert.Contains("TF-IDF", result.ThuatToan);
        Assert.Empty(await db.HoSoNangLucs.ToListAsync());
        Assert.Null((await service.EvaluateAsync("SV", maDot: "A")).Ndcg);
    }

    [Theory]
    [InlineData("expired")]
    [InlineData("full")]
    [InlineData("paused")]
    public async Task IneligibleCompanyIsExcludedBeforeScoring(string mode)
    {
        await using var db = await Seed();
        var plan = (await db.CongTyTheoDots.FindAsync("CT", "A"))!;
        if (mode == "expired") plan.HanDangKy = Time.GetUtcNow().AddSeconds(-1);
        if (mode == "paused") plan.HoatDong = false;
        if (mode == "full") db.PhanBoThucTaps.AddRange(
            new() { MaPhanBo = "P1", MaSinhVien = "S1", MaDot = "A", MaCongTy = "CT" },
            new() { MaPhanBo = "P2", MaSinhVien = "S2", MaDot = "A", MaCongTy = "CT" });
        await db.SaveChangesAsync();
        var scorer = new Mock<ILtrScorer>(MockBehavior.Strict);
        Assert.Empty((await new RecommendationService(db, Time, scorer.Object).RecommendAsync("SV", maDot: "A")).Items);
        scorer.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task OfferStoppedDuringInferenceIsNotReturned()
    {
        await using var db = await Seed();
        var scorer = new Mock<ILtrScorer>();
        scorer.Setup(x => x.ScoreAsync(It.IsAny<LtrProfile>(), It.IsAny<IReadOnlyList<LtrJob>>(), It.IsAny<CancellationToken>()))
            .Returns(async () => {
                (await db.CongTyTheoDots.FindAsync("CT", "A"))!.HoatDong = false;
                await db.SaveChangesAsync();
                return new LtrAttempt(null, "Unavailable");
            });
        Assert.Empty((await new RecommendationService(db, Time, scorer.Object).RecommendAsync("SV", maDot: "A")).Items);
    }

    // 04/11/2026: SQL aggregates count temporary holds and preserve company/position caps.
    [Fact]
    public async Task AvailableOffersCountHoldsAndExcludeCancelledAndOtherRoundPlacements()
    {
        await using var db = await Seed();
        (await db.CongTyTheoDots.FindAsync("CT", "A"))!.SoLuongNhan = 3;
        db.ViTriTheoDots.AddRange(
            new() { MaViTri = "P1", MaCongTy = "CT", MaDot = "A", TenViTri = "Backend 1", YeuCau = "C#", SoLuongNhan = 1 },
            new() { MaViTri = "P2", MaCongTy = "CT", MaDot = "A", TenViTri = "Backend 2", YeuCau = "C# SQL", SoLuongNhan = 2 });
        db.PhanBoThucTaps.AddRange(
            new() { MaPhanBo = "HOLD", MaSinhVien = "S1", MaCongTy = "CT", MaDot = "A", MaViTri = "P1", DaDuocKhoaDuyet = false },
            new() { MaPhanBo = "CANCELLED", MaSinhVien = "S2", MaCongTy = "CT", MaDot = "A", MaViTri = "P2", TrangThai = "Huy" },
            new() { MaPhanBo = "OTHER", MaSinhVien = "S3", MaCongTy = "CT", MaDot = "B" });
        await db.SaveChangesAsync();
        var result = await new InternshipManagement.BLL.Services.Admin.CompanyRoundService(db, Time).AvailableAsync("A");
        var item = Assert.Single(result); Assert.Equal("P2", item.MaViTri); Assert.Equal(0, item.DaTiepNhan); Assert.Equal(2, item.ConLai);
        db.PhanBoThucTaps.Add(new() { MaPhanBo = "LEGACY", MaSinhVien = "S4", MaCongTy = "CT", MaDot = "A" });
        await db.SaveChangesAsync();
        Assert.Equal(1, Assert.Single(await new InternshipManagement.BLL.Services.Admin.CompanyRoundService(db, Time).AvailableAsync("A")).ConLai);
    }

    [Fact]
    public async Task PositionRemovedDuringInferenceKeepsTheRemainingPositionsOwnScore()
    {
        await using var db = await Seed();
        db.ViTriTheoDots.AddRange(
            new() { MaViTri = "P1", MaCongTy = "CT", MaDot = "A", TenViTri = "Backend 1", YeuCau = "C# SQL", SoLuongNhan = 1 },
            new() { MaViTri = "P2", MaCongTy = "CT", MaDot = "A", TenViTri = "Backend 2", YeuCau = "C# SQL", SoLuongNhan = 1 });
        await db.SaveChangesAsync();
        var scorer = new Mock<ILtrScorer>();
        scorer.Setup(x => x.ScoreAsync(It.IsAny<LtrProfile>(), It.IsAny<IReadOnlyList<LtrJob>>(), It.IsAny<CancellationToken>()))
            .Returns(async () => {
                (await db.ViTriTheoDots.FindAsync("P1"))!.HoatDong = false;
                await db.SaveChangesAsync();
                return new LtrAttempt(new[] { new LtrScore("0", 100, 0.9), new LtrScore("1", 5, 0.6) });
            });
        var result = await new RecommendationService(db, Time, scorer.Object).RecommendAsync("SV", maDot: "A");
        var item = Assert.Single(result.Items); Assert.Equal("P2", item.MaViTri); Assert.Equal(5, item.RankingScore); Assert.True(result.DaSuDungModelTrain);
    }

    [Fact]
    public async Task EditedJobDuringInferenceUsesCurrentContentAndExplicitBaseline()
    {
        await using var db = await Seed();
        var scorer = new Mock<ILtrScorer>();
        scorer.Setup(x => x.ScoreAsync(It.IsAny<LtrProfile>(), It.IsAny<IReadOnlyList<LtrJob>>(), It.IsAny<CancellationToken>()))
            .Returns(async () => {
                (await db.CongTyTheoDots.FindAsync("CT", "A"))!.YeuCau = "C# backend updated";
                await db.SaveChangesAsync();
                return new LtrAttempt(new[] { new LtrScore("0", 99, 0.99) });
            });
        var result = await new RecommendationService(db, Time, scorer.Object).RecommendAsync("SV", maDot: "A");
        Assert.False(result.DaSuDungModelTrain); Assert.Null(Assert.Single(result.Items).RankingScore);
        Assert.Contains("updated", result.Items[0].YeuCau); Assert.Contains("TF-IDF", result.ThuatToan);
    }
}
