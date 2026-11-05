using System.Text.Json;
using InternshipManagement.BLL.DTOs.Admin;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.Auth;
using InternshipManagement.BLL.Services.GVHuongDan;
using InternshipManagement.BLL.Services.SinhVienTheoDot;
using InternshipManagement.BLL.Validators.SinhVien;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Database;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InternshipManagement.WorkflowTests;

public class InternshipWorkflowTests
{
    private sealed class FixedClock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(2029, 1, 10, 0, 0, 0, TimeSpan.Zero);
    }
    private static readonly TimeProvider Clock = new FixedClock();
    private static AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options)
        { RoundClock = Clock };
    private static AdminService Admin(AppDbContext db) => new(db, Mock.Of<IGVHuongDanService>(), new PasswordService(), new SinhVienValidator(), Clock);
    private static UngTuyenHoTroService Tracking(AppDbContext db) => new(db, new SinhVienTheoDotService(db, Clock), Clock);

    private static async Task Seed(AppDbContext db)
    {
        db.DotThucTaps.Add(new() { MaSo = "D", TenDot = "Đợt 2", NamHoc = "2028-2029", TrangThai = "DangDienRa",
            ThoiGianBD = new(2029, 2, 1), ThoiGianKT = new(2029, 5, 1), MaLoaiThucTap = "TTKS", MaRubric = "TTKS_V1" });
        db.SinhViens.Add(new() { MaSV = "SV", HoTen = "Sinh viên", Lop = "L1" });
        db.SinhVienThamGiaDots.Add(new() { MaSV = "SV", MaDot = "D", NguoiThem = "K", NguoiCapNhat = "K" });
        db.CongTys.Add(new() { MaCongTy = "CT", TenCongTy = "Đối tác", TrangThai = "DaDuyet" });
        db.CongTyTheoDots.Add(new() { MaDot = "D", MaCongTy = "CT", ViTriTuyen = "Dev", YeuCau = "C#", SoLuongNhan = 20,
            MoDangKy = Clock.GetUtcNow().AddDays(-1), HanDangKy = Clock.GetUtcNow().AddDays(10) });
        await db.SaveChangesAsync();
    }

    private static DangKyThucTap Application(string id, string status = "TuChoi", string? interview = null) =>
        new() { MaDK = id, MaSV = "SV", MaDot = "D", MaCongTy = "CT", TrangThai = status, MaPVKetThuc = interview,
            NgayDangKy = new(2029, 1, 1), ThuTuUuTien = 1 };

    private static LanHoTroThucTap Session(string id = "S", string member = "SV") => new()
    {
        MaLan = id, MaDot = "D", TenLan = "Hỗ trợ tiếp", NgayHoTro = new(2029, 1, 10),
        DanhSachJson = JsonSerializer.Serialize(new[] { new HoTroMember(member, "Sinh viên", "L1", "CanHoTro") })
    };

    [Theory]
    [InlineData("TTNN", 11)]
    [InlineData("TTKS", 12)]
    public void OfficialRubricsHaveCorrectWeightsAndDistinctKeys(string type, int count)
    {
        var criteria = InternshipCatalogMigration.Criteria(type);
        Assert.Equal(count, criteria.Count);
        Assert.Equal(10m, criteria.Sum(x => x.DiemToiDa));
        RubricService.Validate(criteria);
        Assert.All(criteria, x => Assert.InRange(x.MaTieuChi.Length, 1, 20));
        var other = InternshipCatalogMigration.Criteria(type == "TTNN" ? "TTKS" : "TTNN");
        Assert.Empty(criteria.Select(x => x.MaTieuChi).Intersect(other.Select(x => x.MaTieuChi)));
        Assert.Equal(type == "TTKS" ? .25m : .5m, criteria.Single(x => x.MaCLO == "CLO3.1").DiemToiDa);
        Assert.Equal(type == "TTKS", criteria.Any(x => x.MaCLO == "CLO3.5"));
    }

    [Fact]
    public async Task CopyDraftPublishAndPreservePublishedCriteria()
    {
        await using var db = Db();
        db.LoaiThucTaps.Add(new() { MaLoai = "TTKS", TenLoai = "Thực tập kỹ sư" });
        db.BoTieuChis.Add(new() { MaRubric = "TTKS_V1", TenBo = "Kỹ sư", MaLoaiThucTap = "TTKS", TrangThai = "PhatHanh" });
        db.TieuChis.AddRange(InternshipCatalogMigration.Criteria("TTKS"));
        await db.SaveChangesAsync();
        var service = new RubricService(db, Clock);
        await service.CreateAsync(new("TTKS_V2", "Kỹ sư phiên bản 2", "TTKS", 2, "TTKS_V1"), "K");
        Assert.Equal(12, await db.TieuChis.CountAsync(x => x.MaRubric == "TTKS_V2"));
        await service.SetStatusAsync("TTKS_V2", new(0), "PhatHanh", "K");
        var criterion = await db.TieuChis.FirstAsync(x => x.MaRubric == "TTKS_V2");
        await Assert.ThrowsAsync<InvalidOperationException>(() => Admin(db).DeleteCriteriaAsync(criterion.MaTieuChi));
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => service.SetStatusAsync("TTKS_V2", new(0), "NgungApDung", "K"));
        Assert.Equal(24, await db.TieuChis.CountAsync());
    }

    [Fact]
    public void InvalidWeightsCannotBePublished()
    {
        var criteria = InternshipCatalogMigration.Criteria("TTKS").ToList();
        criteria.RemoveAll(x => x.MaCLO == "CLO3.5");
        Assert.Throws<ArgumentException>(() => RubricService.Validate(criteria));
    }

    [Fact]
    public async Task RoundMustUsePublishedMatchingTypeAndCannotChangeAfterEnrollment()
    {
        await using var db = Db();
        await Seed(db);
        db.LoaiThucTaps.AddRange(new LoaiThucTap { MaLoai = "TTNN", TenLoai = "Nghề nghiệp" }, new LoaiThucTap { MaLoai = "TTKS", TenLoai = "Kỹ sư" });
        db.BoTieuChis.Add(new() { MaRubric = "TTNN_V1", TenBo = "Nghề nghiệp", MaLoaiThucTap = "TTNN", TrangThai = "PhatHanh" });
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<ArgumentException>(() => Admin(db).CreateRoundAsync(new("NEW", "Mới", "2029", new(2029, 2, 1), new(2029, 5, 1), "ChuaBatDau", "TTKS", "TTNN_V1")));
        await Assert.ThrowsAsync<InvalidOperationException>(() => Admin(db).UpdateRoundAsync("D", new("Đợt 2", "2028-2029", new(2029, 2, 1), new(2029, 5, 1), "DangDienRa", "TTNN", "TTNN_V1")));
        Assert.Equal("TTKS_V1", (await db.DotThucTaps.FindAsync("D"))!.MaRubric);
    }

    [Fact]
    public async Task FailedAttemptCannotRegisterSameCompanyAgainInTheRound()
    {
        await using var db = Db(); await Seed(db);
        var old = Application("OLD", interview: "PV");
        db.DangKyThucTaps.Add(old);
        db.PhongVans.Add(new() { MaPV = "PV", MaDK = "OLD", MaSinhVien = "SV", MaDaiDien = "REP", NgayPV = new(2029, 1, 2), KetQua = "KhongDat" });
        db.LanHoTroThucTaps.Add(Session()); await db.SaveChangesAsync();
        var repo = new DangKyThucTapRepository(db, Clock);
        Assert.True(await repo.HasRegisteredAsync("SV", "CT", "D"));
        Assert.False(await repo.HasPriorityInDotAsync("SV", "D", 1));
        var next = Application("NEW", "ChoDuyet"); next.MaLanHoTro = "S";
        await Assert.ThrowsAsync<InvalidOperationException>(() => repo.AddWithinLimitAsync(next, 3));
        Assert.Equal("TuChoi", old.TrangThai);
        Assert.Equal(1, await db.DangKyThucTaps.CountAsync());
        var result = await Tracking(db).ListAsync(new("D"));
        var row = Assert.Single(result.Items);
        Assert.Equal(1, row.SoLanRotUngTuyen);
        Assert.Equal(0, row.SoHoSoChoKetQua);
    }

    [Fact]
    public async Task DuplicateActiveApplicationCannotBeSubmitted()
    {
        await using var db = Db(); await Seed(db);
        db.DangKyThucTaps.Add(Application("OLD", "ChoDuyet")); await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => new DangKyThucTapRepository(db, Clock).AddWithinLimitAsync(Application("NEW", "ChoDuyet"), 3));
        Assert.Equal(1, await db.DangKyThucTaps.CountAsync());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task SupportMustBelongToStudentAndRound(bool wrongRound)
    {
        await using var db = Db(); await Seed(db);
        var session = Session(member: wrongRound ? "SV" : "OTHER");
        if (wrongRound) session.MaDot = "OTHER";
        db.LanHoTroThucTaps.Add(session); await db.SaveChangesAsync();
        var next = Application("NEW", "ChoDuyet"); next.MaLanHoTro = "S";
        await Assert.ThrowsAnyAsync<Exception>(() => new DangKyThucTapRepository(db, Clock).AddWithinLimitAsync(next, 3));
        Assert.Equal(0, await db.DangKyThucTaps.CountAsync());
    }

    [Fact]
    public async Task ExhaustedRoundCannotRegisterAgainEvenWithNewSupportSession()
    {
        await using var db = Db(); await Seed(db);
        db.DangKyThucTaps.AddRange(Application("1"), Application("2", "DaHuy"), Application("3"));
        db.LanHoTroThucTaps.Add(Session()); await db.SaveChangesAsync();
        var next = Application("NEW", "ChoDuyet"); next.MaLanHoTro = "S";
        var repo = new DangKyThucTapRepository(db, Clock);
        Assert.Equal(3, await repo.CountBySinhVienDotAsync("SV", "D"));
        await Assert.ThrowsAsync<InvalidOperationException>(() => repo.AddWithinLimitAsync(next, 3));
        var context = JsonSerializer.SerializeToElement(await Tracking(db).RegistrationContextAsync("D", "SV"));
        Assert.False(context.GetProperty("DuocDangKy").GetBoolean());
        Assert.Empty(context.GetProperty("CacLanHoTro").EnumerateArray());
        Assert.Equal(3, await db.DangKyThucTaps.CountAsync());
    }

    [Fact]
    public async Task WithdrawalsAndReplacedInterviewsAreNotCountedAsFailures()
    {
        await using var db = Db(); await Seed(db);
        db.DangKyThucTaps.AddRange(Application("WITHDRAW"), Application("RESCHEDULE", "DaDuyet"));
        db.PhongVans.AddRange(
            new PhongVan { MaPV = "WITHDRAW_PV", MaDK = "WITHDRAW", MaSinhVien = "SV", MaDaiDien = "R", KetQua = "KhongDat", NgayPV = new(2029, 1, 1) },
            new PhongVan { MaPV = "OLD_PV", MaDK = "RESCHEDULE", MaSinhVien = "SV", MaDaiDien = "R", KetQua = "KhongDat", NgayPV = new(2029, 1, 1) },
            new PhongVan { MaPV = "NEW_PV", MaPVTruoc = "OLD_PV", MaDK = "RESCHEDULE", MaSinhVien = "SV", MaDaiDien = "R", KetQua = "ChuaCoKetQua", NgayPV = new(2029, 1, 12) });
        await db.SaveChangesAsync();
        var row = Assert.Single((await Tracking(db).ListAsync(new("D"))).Items);
        Assert.Equal(0, row.SoLanRotUngTuyen);
        Assert.Equal(1, row.SoHoSoChoKetQua);
    }

    [Fact]
    public async Task VerifiedCompanyRejectionCountsButManualClosureDoesNot()
    {
        await using var db = Db(); await Seed(db);
        var rejection = Application("REJECT"); rejection.KetQuaHoSo = "KhongDat";
        db.DangKyThucTaps.AddRange(rejection, Application("CLOSED")); await db.SaveChangesAsync();
        var row = Assert.Single((await Tracking(db).ListAsync(new("D"))).Items);
        Assert.Equal(1, row.SoLanRotUngTuyen);
        Assert.True(row.Actions.CoTheHoTroTiep);
    }

    [Fact]
    public async Task AcceptedButUnconfirmedStillNeedsConfirmationNotNewSupport()
    {
        await using var db = Db(); await Seed(db);
        db.DangKyThucTaps.Add(Application("ACCEPT", "DaDuyet"));
        db.PhongVans.Add(new() { MaPV = "P", MaDK = "ACCEPT", MaSinhVien = "SV", MaDaiDien = "R", KetQua = "Dat", NgayPV = new(2029, 1, 9) });
        db.PhanBoThucTaps.Add(new() { MaPhanBo = "PB", MaSinhVien = "SV", MaDot = "D", MaCongTy = "CT", TrangThai = "ChuaNhanViec", DaDuocKhoaDuyet = false });
        await db.SaveChangesAsync();
        var row = Assert.Single((await Tracking(db).ListAsync(new("D"))).Items);
        Assert.Equal("ChoXacNhan", row.TinhTrangNoi);
        Assert.True(row.Actions.CoTheTheoDoiXacNhan);
        Assert.False(row.Actions.CoTheHoTroTiep);
    }

    [Fact]
    public async Task OfficialPlacementTakesPriorityOverOldFailure()
    {
        await using var db = Db(); await Seed(db);
        var rejection = Application("OLD"); rejection.KetQuaHoSo = "KhongDat";
        db.DangKyThucTaps.Add(rejection);
        db.PhanBoThucTaps.Add(new() { MaPhanBo = "PB", MaSinhVien = "SV", MaDot = "D", MaCongTy = "CT", TrangThai = "DangThucTap", DaDuocKhoaDuyet = true });
        await db.SaveChangesAsync();
        var row = Assert.Single((await Tracking(db).ListAsync(new("D"))).Items);
        Assert.Equal(1, row.SoLanRotUngTuyen);
        Assert.Equal("DaCoNoi", row.TinhTrangNoi);
        Assert.False(row.CanHoTroTiep);
    }

    [Fact]
    public async Task PaginationSummaryIncludesWholeFilterAndStudentsWithoutApplications()
    {
        await using var db = Db(); await Seed(db);
        db.SinhViens.Add(new() { MaSV = "SV2", HoTen = "Sinh viên 2", Lop = "L2" });
        db.SinhVienThamGiaDots.Add(new() { MaSV = "SV2", MaDot = "D", NguoiThem = "K", NguoiCapNhat = "K" }); await db.SaveChangesAsync();
        var data = await Tracking(db).ListAsync(new("D", PageSize: 1));
        Assert.Equal(2, data.TotalCount); Assert.Single(data.Items);
        Assert.Equal(2, data.ThongKe.ChuaCoNoi);
        Assert.Null(data.Items[0].UngTuyenGanNhat);
        Assert.Equal(1, (await Tracking(db).ListAsync(new("D", Lop: "L2"))).TotalCount);
        await Assert.ThrowsAsync<ArgumentException>(() => Tracking(db).ListAsync(new("D", PageSize: 101)));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => Tracking(db).DetailAsync("D", "NOT_ENROLLED"));
    }

    [Fact]
    public async Task LockedRoundCannotRegisterOrOfferNextSupport()
    {
        await using var db = Db(); await Seed(db);
        db.ChotDotThucTaps.Add(new() { MaDot = "D", TrangThai = "DaChot" }); await db.SaveRoundControlAsync();
        var row = Assert.Single((await Tracking(db).ListAsync(new("D"))).Items);
        Assert.False(row.Actions.CoTheHoTroTiep);
        await Assert.ThrowsAsync<RoundLockedException>(() => new DangKyThucTapRepository(db, Clock).AddWithinLimitAsync(Application("NEW", "ChoDuyet"), 3));
    }

    [Fact]
    public async Task StudentCanDiscoverValidSupportButCannotReturnToInitialWave()
    {
        await using var db = Db(); await Seed(db);
        db.CongTys.Add(new() { MaCongTy = "CT2", TenCongTy = "Đối tác 2", TrangThai = "DaDuyet" });
        db.CongTyTheoDots.Add(new() { MaDot = "D", MaCongTy = "CT2", ViTriTuyen = "Dev", YeuCau = "C#", SoLuongNhan = 20,
            MoDangKy = Clock.GetUtcNow().AddDays(-1), HanDangKy = Clock.GetUtcNow().AddDays(10) });
        db.DangKyThucTaps.Add(Application("OLD"));
        db.LanHoTroThucTaps.Add(Session()); await db.SaveChangesAsync();
        var context = JsonSerializer.SerializeToElement(await Tracking(db).RegistrationContextAsync("D", "SV"));
        Assert.True(context.GetProperty("DuocDangKy").GetBoolean());
        Assert.Equal("S", Assert.Single(context.GetProperty("CacLanHoTro").EnumerateArray()).GetProperty("MaLan").GetString());
        var next = Application("NEW", "ChoDuyet"); next.MaLanHoTro = "S"; next.MaCongTy = "CT2";
        await new DangKyThucTapRepository(db, Clock).AddWithinLimitAsync(next, 3);
        next.TrangThai = "TuChoi"; await db.SaveChangesAsync();
        var blocked = JsonSerializer.SerializeToElement(await Tracking(db).RegistrationContextAsync("D", "SV"));
        Assert.False(blocked.GetProperty("CoTheDangKyLanDau").GetBoolean());
        await Assert.ThrowsAsync<InvalidOperationException>(() => new DangKyThucTapRepository(db, Clock).AddWithinLimitAsync(Application("BACK", "ChoDuyet"), 3));
    }

    [Fact]
    public async Task SupportDoesNotOverrideCompanyDeadline()
    {
        await using var db = Db(); await Seed(db);
        db.LanHoTroThucTaps.Add(Session());
        (await db.CongTyTheoDots.FindAsync("CT", "D"))!.HanDangKy = Clock.GetUtcNow().AddMinutes(-1);
        await db.SaveChangesAsync();
        var next = Application("NEW", "ChoDuyet"); next.MaLanHoTro = "S";
        await Assert.ThrowsAsync<InvalidOperationException>(() => new DangKyThucTapRepository(db, Clock).AddWithinLimitAsync(next, 3));
        Assert.Empty(await db.DangKyThucTaps.ToListAsync());
    }

    [Fact]
    public async Task GradeCompletionUsesRoundRubricAndRequiresKsClo35()
    {
        await using var db = Db(); await Seed(db);
        var ks = InternshipCatalogMigration.Criteria("TTKS");
        db.TieuChis.AddRange(ks); db.TieuChis.AddRange(InternshipCatalogMigration.Criteria("TTNN"));
        db.PhieuChamDiems.Add(new() { MaPhieu = "P", MaSV = "SV", MaDot = "D", TongDiem = 10,
            ChiTietChamDiems = ks.Where(x => x.MaCLO != "CLO3.5").Select(x => new ChiTietChamDiem { MaSo = "D_" + x.MaCLO, MaPhieu = "P", MaTieuChi = x.MaTieuChi, DiemCham = x.DiemToiDa }).ToList() });
        await db.SaveChangesAsync();
        var repo = new DangKyThucTapRepository(db, Clock);
        Assert.False((await repo.GetKetQuaThucTapAsync("SV", "D")).DaDuDiem);
        var final = ks.Single(x => x.MaCLO == "CLO3.5");
        db.ChiTietChamDiems.Add(new() { MaSo = "D_CLO3.5", MaPhieu = "P", MaTieuChi = final.MaTieuChi, DiemCham = .5m }); await db.SaveChangesAsync();
        var result = await repo.GetKetQuaThucTapAsync("SV", "D");
        Assert.True(result.DaDuDiem); Assert.Equal(10m, result.TongDiem);
    }

    [Fact]
    public async Task DuplicateCloInDraftIsRejectedAndUpdatesVersionWhenSaved()
    {
        await using var db = Db();
        db.BoTieuChis.Add(new() { MaRubric = "DRAFT", TenBo = "Nháp", TrangThai = "Nhap" }); await db.SaveChangesAsync();
        await Admin(db).CreateCriteriaAsync(new("DRAFT_CLO1.1", "Tiêu chí", .5, "GV", 1, "CLO1.1", "DRAFT"));
        Assert.Equal(1, (await db.BoTieuChis.FindAsync("DRAFT"))!.PhienBanCapNhat);
        await Assert.ThrowsAsync<ArgumentException>(() => Admin(db).CreateCriteriaAsync(new("OTHER", "Trùng CLO", .5, "GV", 2, "CLO1.1", "DRAFT")));
        Assert.Equal(1, await db.TieuChis.CountAsync());
    }

    [Theory]
    [InlineData("TTNN", false)]
    [InlineData("TTKS", true)]
    public async Task CompletedDifferentInternshipTypeDoesNotBlockKsRegistration(string completedType, bool blocked)
    {
        var repo = new Mock<IDangKyThucTapRepository>();
        repo.Setup(x => x.GetDotAsync("NEXT")).ReturnsAsync(new DotThucTap { MaSo = "NEXT", MaLoaiThucTap = "TTKS" });
        repo.Setup(x => x.GetPhanBoConHieuLucAsync("SV")).ReturnsAsync(new List<PhanBoThucTap>
        {
            new() { MaSinhVien = "SV", MaDot = "OLD", TrangThai = "HoanThanh", MaCongTy = "CT",
                DotThucTap = new() { MaSo = "OLD", TenDot = "Cũ", MaLoaiThucTap = completedType } }
        });
        repo.Setup(x => x.GetKetQuaThucTapAsync("SV", "OLD")).ReturnsAsync((10m, true));
        var service = new InternshipManagement.BLL.Services.DangKyThucTap.DangKyThucTapService(repo.Object, Mock.Of<ICongTyRepository>(), Mock.Of<ISinhVienRepository>());
        var result = await service.KiemTraDieuKienDangKyAsync("SV", "NEXT");
        Assert.Equal(blocked, result != null);
    }
}
