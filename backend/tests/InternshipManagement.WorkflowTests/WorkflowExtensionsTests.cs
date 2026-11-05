using System.IO.Compression;
using System.Text;
using System.Text.Json;
using System.Xml.Linq;
using InternshipManagement.BLL.Common;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.Auth;
using InternshipManagement.BLL.Services.SinhVienTheoDot;
using InternshipManagement.BLL.Services.ThongKe;
using InternshipManagement.BLL.Validators.SinhVien;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Database;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternshipManagement.WorkflowTests;

public class WorkflowExtensionsTests
{
    private sealed class Clock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2029, 1, 10, 0, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }
    private sealed class Fixture : IAsyncDisposable
    {
        public Clock Time { get; } = new();
        public AppDbContext Db { get; }
        public Fixture() { Db = new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options) { RoundClock = Time }; }
        public RoundStudentImportService Import => new(Db, new SinhVienValidator(), Time, new PasswordService());
        public SupportResponseService Responses => new(Db, Time);
        public SinhVienTheoDotService Roster => new(Db, Time);
        public RaSoatNoiService Review => new(Db, Roster, Time);
        public UngTuyenHoTroService Tracking => new(Db, Roster, Time);
        public FailedInternshipService Failed => new(Db, Tracking, Time);
        public async Task Seed()
        {
            Db.DotThucTaps.Add(new() { MaSo = "D", TenDot = "Đợt 2", NamHoc = "2028-2029", MaLoaiThucTap = "TTKS", MaRubric = "TTKS_V1", TrangThai = "DangDienRa",
                ThoiGianBD = new(2029, 2, 1), ThoiGianKT = new(2029, 5, 1) });
            Db.SinhViens.Add(new() { MaSV = "SV", HoTen = "Tên gốc", Lop = "L1" });
            Db.SinhVienThamGiaDots.Add(new() { MaDot = "D", MaSV = "SV", NguoiThem = "K", NguoiCapNhat = "K" });
            Db.CongTys.Add(new() { MaCongTy = "CT", TenCongTy = "Đối tác", TrangThai = "DaDuyet" });
            Db.CongTyTheoDots.Add(new() { MaDot = "D", MaCongTy = "CT", ViTriTuyen = "Dev", YeuCau = "C#", SoLuongNhan = 50,
                MoDangKy = Time.Now.AddDays(-1), HanDangKy = Time.Now.AddDays(10) });
            await Db.SaveChangesAsync();
        }
        public async Task Session(string id = "S", params string[] students)
        {
            if (students.Length == 0) students = ["SV"];
            Db.LanHoTroThucTaps.Add(new() { MaLan = id, MaDot = "D", TenLan = "Hỗ trợ", NgayHoTro = new(2029, 1, 10),
                DanhSachJson = JsonSerializer.Serialize(students.Select(s => new HoTroMember(s, "Tên " + s, "L1"))) });
            await Db.SaveChangesAsync();
        }
        public async Task Grade(bool complete = true, bool passed = false)
        {
            var criteria = InternshipCatalogMigration.Criteria("TTKS"); Db.TieuChis.AddRange(criteria);
            Db.PhieuChamDiems.Add(new() { MaPhieu = "P", MaDot = "D", MaSV = "SV", TongDiem = 10,
                ChiTietChamDiems = criteria.Where(c => complete || c.MaCLO != "CLO3.5").Select(c => new ChiTietChamDiem
                { MaSo = "S_" + c.MaCLO, MaPhieu = "P", MaTieuChi = c.MaTieuChi, DiemCham = passed ? c.DiemToiDa : c.MaCLO == "CLO4.2" ? 3 : 0 }).ToList() });
            await Db.SaveChangesAsync();
        }
        public ValueTask DisposeAsync() => Db.DisposeAsync();
    }

    [Fact]
    public async Task LongStudentIdWithExistingTruncatedAccountIdDoesNotLoopOrInventContactDetails()
    {
        await using var f = new Fixture(); await f.Seed();
        const string student = "12345678901234567890";
        var oldId = ("TK_" + student)[..20];
        f.Db.TaiKhoans.Add(new() { MaTaiKhoan = oldId, TenDangNhap = "legacy", MatKhau = "hash", MaVaiTro = "VT04", MaSV = "SV" });
        await f.Db.SaveChangesAsync();
        var preview = await f.Import.PreviewAsync(new("D", "NhapHoSo", [new(student, "Sinh viên mới", "L1")], "kiem-tra"), "K");
        Assert.True(preview.CoTheNhap);
        await f.Import.CommitAsync(preview.Id!, new(0), "K");
        var account = await f.Db.TaiKhoans.SingleAsync(x => x.MaSV == student);
        Assert.NotEqual(oldId, account.MaTaiKhoan);
        Assert.InRange(account.MaTaiKhoan.Length, 1, 20);
        Assert.Null(account.Email);
        Assert.Equal("SV", (await f.Db.TaiKhoans.FindAsync(oldId))!.MaSV);
    }

    [Fact]
    public async Task PreviewDoesNotCreateStudentsCommitIsAtomicAndReplayIsIdempotent()
    {
        await using var f = new Fixture(); await f.Seed();
        var input = new RoundImportRequest("D", "NhapHoSo", [new("SV", "Tên gốc", "L1"), new("0000123", "Sinh viên mới", "L2")]);
        var preview = await f.Import.PreviewAsync(input, "ADMIN");
        Assert.True(preview.CoTheNhap); Assert.Equal(1, preview.SoHoSoMoi); Assert.Equal(1, preview.SoDaThamGia);
        Assert.False(await f.Db.SinhViens.AnyAsync(x => x.MaSV == "0000123"));
        var result = await f.Import.CommitAsync(preview.Id!, new(0), "ADMIN");
        Assert.True(result.ThanhCong); Assert.Equal(1, result.SoHoSoTaoMoi); Assert.Equal(1, result.SoThemVaoDot);
        var retry = await f.Import.CommitAsync(preview.Id!, new(0), "ADMIN");
        Assert.Equal(result.Id, retry.Id); Assert.Equal(result.NgayNhap, retry.NgayNhap); Assert.Equal(result.SoHoSoTaoMoi, retry.SoHoSoTaoMoi);
        Assert.Equal(2, await f.Db.SinhViens.CountAsync()); Assert.Equal(2, await f.Db.SinhVienThamGiaDots.CountAsync());
    }

    [Fact]
    public async Task InvalidOrDuplicateRowsHaveNoCommitTokenAndDoNotWriteProfiles()
    {
        await using var f = new Fixture(); await f.Seed();
        var preview = await f.Import.PreviewAsync(new("D", "NhapHoSo", [new("NEW", "Mới"), new("new", "Lặp"), new("BAD", "", Gpa: 6)]), "K");
        Assert.False(preview.CoTheNhap); Assert.Null(preview.Id); Assert.All(preview.Rows, x => Assert.NotEmpty(x.Loi));
        Assert.Equal(1, await f.Db.SinhViens.CountAsync()); Assert.Empty(await f.Db.NhapDanhSachDots.ToListAsync());
    }

    [Fact]
    public async Task ConflictingProfileRequiresExplicitReuseAndNeverOverwritesOldData()
    {
        await using var f = new Fixture(); await f.Seed();
        var input = new RoundImportRequest("D", "NhapHoSo", [new("SV", "Tên khác", "L9")]);
        Assert.False((await f.Import.PreviewAsync(input, "K")).CoTheNhap);
        var preview = await f.Import.PreviewAsync(input with { Rows = [new("SV", "Tên khác", "L9", DungHoSoHienCo: true)] }, "K");
        await f.Import.CommitAsync(preview.Id!, new(0), "K");
        Assert.Equal("Tên gốc", (await f.Db.SinhViens.FindAsync("SV"))!.HoTen);
        Assert.Equal("L1", (await f.Db.SinhViens.FindAsync("SV"))!.Lop);
    }

    [Fact]
    public async Task RevalidateAfterPreviewAvoidsPartialInsertOnNewConflict()
    {
        await using var f = new Fixture(); await f.Seed();
        var preview = await f.Import.PreviewAsync(new("D", "NhapHoSo", [new("NEW1", "Một"), new("NEW2", "Hai")]), "K");
        f.Db.SinhViens.Add(new() { MaSV = "NEW2", HoTen = "Người khác đã tạo" }); await f.Db.SaveChangesAsync();
        var result = await f.Import.CommitAsync(preview.Id!, new(0), "K");
        Assert.False(result.ThanhCong); Assert.False(await f.Db.SinhViens.AnyAsync(x => x.MaSV == "NEW1"));
        Assert.False(await f.Db.SinhVienThamGiaDots.AnyAsync(x => x.MaSV == "NEW2"));
    }

    [Fact]
    public async Task ImportPreviewIsOwnedExpiresAndChecksRoundScope()
    {
        await using var f = new Fixture(); await f.Seed();
        var input = new RoundImportRequest("D", "NhapHoSo", [new("NEW", "Mới")]);
        await Assert.ThrowsAsync<ArgumentException>(() => f.Import.PreviewAsync(input with { NamHoc = "SAI" }, "K"));
        var preview = await f.Import.PreviewAsync(input, "K");
        await Assert.ThrowsAsync<KeyNotFoundException>(() => f.Import.CommitAsync(preview.Id!, new(0), "OTHER"));
        f.Time.Now = f.Time.Now.AddMinutes(31);
        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Import.CommitAsync(preview.Id!, new(0), "K"));
        Assert.False(await f.Db.SinhViens.AnyAsync(x => x.MaSV == "NEW"));
    }

    [Fact]
    public async Task LockedRoundAfterPreviewCannotBeImported()
    {
        await using var f = new Fixture(); await f.Seed();
        var preview = await f.Import.PreviewAsync(new("D", "NhapHoSo", [new("NEW", "Mới")]), "K");
        f.Db.ChotDotThucTaps.Add(new() { MaDot = "D", TrangThai = "DaChot" }); await f.Db.SaveRoundControlAsync();
        await Assert.ThrowsAsync<RoundLockedException>(() => f.Import.CommitAsync(preview.Id!, new(0), "K"));
        Assert.False(await f.Db.SinhViens.AnyAsync(x => x.MaSV == "NEW"));
    }

    [Fact]
    public async Task ReconciliationRecordsWarningsWithoutChangingEnrollmentOrResult()
    {
        await using var f = new Fixture(); await f.Seed();
        f.Db.PhanBoThucTaps.Add(new() { MaPhanBo = "PB", MaDot = "D", MaSinhVien = "SV", MaCongTy = "CT", TrangThai = "DangThucTap", DaDuocKhoaDuyet = true }); await f.Db.SaveChangesAsync();
        var preview = await f.Import.PreviewAsync(new("D", "DoiSoatKhongThamGia", [new("SV")]), "K");
        Assert.True(preview.CoTheNhap); Assert.NotEmpty(Assert.Single(preview.Rows).CanhBao!);
        var result = await f.Import.CommitAsync(preview.Id!, new(0), "K");
        Assert.Equal(0, result.SoThemVaoDot); Assert.NotNull(result.DoiSoat);
        Assert.True((await f.Db.SinhVienThamGiaDots.FindAsync("D", "SV"))!.DangThamGia);
        Assert.Empty(await f.Db.KhongHoanTatDots.ToListAsync());
    }

    [Fact]
    public void CsvSupportsQuotedNamesSeparateNameColumnsAndLeadingZeroIds()
    {
        var request = RoundStudentImportService.FromCsv("D", "NhapHoSo", "maSV,hoDem,ten,lop\r\n000123,\"Nguyễn, Văn\",An,L1\r\n", "nguon.csv");
        var row = Assert.Single(request.Rows);
        Assert.Equal("000123", row.MaSV); Assert.Equal("Nguyễn, Văn An", row.HoTen);
        Assert.Throws<ArgumentException>(() => RoundStudentImportService.FromCsv("D", "NhapHoSo", "maSV,gpa\nSV,sai", "nguon.csv"));
    }

    [Fact]
    public async Task StudentReplyIsVersionedAndDoesNotFinalizeFailure()
    {
        await using var f = new Fixture(); await f.Seed(); await f.Session("S", "SV", "OTHER");
        await f.Responses.RecordAsync("D", "S", "SV", new(0, "TuChoiHoTro", "Không nhận hỗ trợ"), "ACCOUNT", true);
        Assert.Empty(await f.Db.KhongHoanTatDots.ToListAsync());
        var row = Assert.Single((await f.Tracking.ListAsync(new("D"))).Items);
        Assert.True(row.Actions.CoTheXacNhanTuChoi); Assert.False(row.Actions.CoTheHoTroTiep);
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => f.Responses.RecordAsync("D", "S", "SV", new(0, "NhanHoTro", "Đổi ý"), "ACCOUNT", true));
        var personal = JsonSerializer.Serialize(await f.Responses.StudentAsync("D", "SV"));
        Assert.DoesNotContain("OTHER", personal);
    }

    [Fact]
    public async Task RefusalBlocksRegistrationButAcceptanceRestoresSupport()
    {
        await using var f = new Fixture(); await f.Seed(); await f.Session();
        await f.Responses.RecordAsync("D", "S", "SV", new(0, "TuChoiHoTro", "Từ chối"), "ACCOUNT", true);
        var registration = new DangKyThucTap { MaDK = "DK", MaSV = "SV", MaDot = "D", MaCongTy = "CT", MaLanHoTro = "S", ThuTuUuTien = 1 };
        await Assert.ThrowsAsync<InvalidOperationException>(() => new DangKyThucTapRepository(f.Db, f.Time).AddWithinLimitAsync(registration, 3));
        f.Time.Now = f.Time.Now.AddMinutes(1);
        await f.Responses.RecordAsync("D", "S", "SV", new(1, "NhanHoTro", "Nhận hỗ trợ lại"), "ACCOUNT", true);
        await new DangKyThucTapRepository(f.Db, f.Time).AddWithinLimitAsync(registration, 3);
        Assert.Equal(1, await f.Db.DangKyThucTaps.CountAsync());
    }

    [Fact]
    public async Task OnlyVerifiedRefusalWithoutPlaceOrPendingRecordsCanBeFinalized()
    {
        await using var f = new Fixture(); await f.Seed(); await f.Session();
        var request = new GhiNhanChuaCoNoiRequest(0, "SV không nhận hỗ trợ", "Biên bản xác minh", true, MaLyDo: "TuChoiHoTro", MaLanHoTro: "S", PhienBanHoTro: 0);
        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Review.ConfirmAsync("D", "SV", request, "K"));
        await f.Responses.RecordAsync("D", "S", "SV", new(0, "TuChoiHoTro", "Không muốn nhận hỗ trợ"), "ACCOUNT", true);
        await f.Review.ConfirmAsync("D", "SV", request with { PhienBanHoTro = 1 }, "K");
        var failure = await f.Db.KhongHoanTatDots.SingleAsync();
        Assert.Equal("TuChoiHoTro", failure.MaLyDo); Assert.Equal("S", failure.MaLanHoTro);
        Assert.Empty(await f.Db.PhieuChamDiems.ToListAsync());
        var row = Assert.Single((await f.Failed.ListAsync(new())).Items);
        Assert.Equal("TuChoiHoTro", row.NguyenNhan); Assert.Null(row.TongDiem);
        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Responses.RecordAsync("D", "S", "SV", new(1, "NhanHoTro", "Nhận lại"), "ACCOUNT", true));
    }

    [Fact]
    public async Task PendingApplicationsPreventFinalizingRefusal()
    {
        await using var f = new Fixture(); await f.Seed(); await f.Session();
        await f.Responses.RecordAsync("D", "S", "SV", new(0, "TuChoiHoTro", "Từ chối"), "ACCOUNT", true);
        f.Db.DangKyThucTaps.Add(new() { MaDK = "DK", MaSV = "SV", MaDot = "D", MaCongTy = "CT", TrangThai = "ChoDuyet" }); await f.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Review.ConfirmAsync("D", "SV", new(0, "Lý do", "Căn cứ", true, MaLyDo: "TuChoiHoTro", MaLanHoTro: "S", PhienBanHoTro: 1), "K"));
        Assert.Empty(await f.Db.KhongHoanTatDots.ToListAsync());
    }

    [Fact]
    public async Task AcceptedAgainCannotBeMarkedFailedFromOldRefusal()
    {
        await using var f = new Fixture(); await f.Seed(); await f.Session();
        await f.Responses.RecordAsync("D", "S", "SV", new(0, "TuChoiHoTro", "Từ chối"), "ACCOUNT", true);
        f.Time.Now = f.Time.Now.AddMinutes(1);
        await f.Responses.RecordAsync("D", "S", "SV", new(1, "NhanHoTro", "Nhận lại"), "ACCOUNT", true);
        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Review.ConfirmAsync("D", "SV", new(0, "Lý do", "Căn cứ", true, MaLyDo: "TuChoiHoTro", MaLanHoTro: "S", PhienBanHoTro: 2), "K"));
    }

    [Fact]
    public async Task FacultyMustVerifyDirectResponseAndStudentMustBelongToSession()
    {
        await using var f = new Fixture(); await f.Seed(); await f.Session();
        await Assert.ThrowsAsync<ArgumentException>(() => f.Responses.RecordAsync("D", "S", "SV", new(0, "TuChoiHoTro", "Ghi thay SV"), "K", false));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => f.Responses.RecordAsync("D", "S", "OTHER", new(0, "NhanHoTro", "Xin hỗ trợ"), "OTHER_ACCOUNT", true));
    }

    [Theory]
    [InlineData(false, false, 0)]
    [InlineData(true, true, 0)]
    [InlineData(true, false, 1)]
    public async Task FailedListRequiresCompleteFailingGrade(bool complete, bool passed, int count)
    {
        await using var f = new Fixture(); await f.Seed(); await f.Grade(complete, passed);
        var list = await f.Failed.ListAsync(new());
        Assert.Equal(count, list.TotalCount);
        if (count > 0)
        {
            Assert.Equal(3m, list.Items[0].TongDiem); Assert.Equal("RotDiem", list.Items[0].NguyenNhan);
            JsonSerializer.Serialize(await f.Failed.DetailAsync("D", "SV")); // The detail response must not contain EF navigation cycles.
        }
    }

    [Fact]
    public async Task ClosedResultKeepsOriginalNameAndGradeAfterCurrentProfileChanges()
    {
        await using var f = new Fixture(); await f.Seed(); await f.Grade();
        f.Db.PhanBoThucTaps.Add(new() { MaPhanBo = "PB", MaSinhVien = "SV", MaDot = "D", MaCongTy = "CT", TrangThai = "HoanThanh", DaDuocKhoaDuyet = true });
        await f.Db.SaveChangesAsync(); f.Time.Now = new(2029, 6, 1, 0, 0, 0, TimeSpan.Zero);
        await new ChotDotService(f.Db, f.Roster, f.Time).CloseAsync("D", new(0, "Chốt kết quả"), "K");
        (await f.Db.SinhViens.FindAsync("SV"))!.HoTen = "Tên hiện tại"; await f.Db.SaveChangesAsync();
        var archived = Assert.Single((await f.Failed.ListAsync(new())).Items);
        Assert.Equal("BanChot", archived.NguonDuLieu); Assert.Equal("Tên gốc", archived.HoTen); Assert.Equal(3m, archived.TongDiem);
        var live = Assert.Single((await f.Failed.ListAsync(new(Nguon: "HienHanh"))).Items);
        Assert.Equal("Tên hiện tại", live.HoTen);
        JsonSerializer.Serialize(await f.Failed.DetailAsync("D", "SV"));
    }

    [Fact]
    public void ExportProducesRealXlsxAndCsvWithoutFormulaCells()
    {
        var data = new List<object?[]> { new object?[] { "000123", "=HYPERLINK(\"x\")", 3m } };
        var xlsx = TabularExport.Xlsx(["MSSV", "Tên", "Điểm"], data);
        using var zip = new ZipArchive(new MemoryStream(xlsx));
        using var sheet = zip.GetEntry("xl/worksheets/sheet1.xml")!.Open();
        var xml = XDocument.Load(sheet); XNamespace ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        Assert.Empty(xml.Descendants(ns + "f")); Assert.Contains(xml.Descendants(ns + "t"), t => t.Value == "000123");
        Assert.Contains(xml.Descendants(ns + "t"), t => t.Value.StartsWith("=HYPERLINK"));
        var csv = Encoding.UTF8.GetString(TabularExport.Csv(["MSSV", "Tên", "Điểm"], data));
        Assert.Contains("'=HYPERLINK", csv);
    }

    [Fact]
    public async Task CompanyReferralIsRecordedWithoutCreatingApplicationOrPlacement()
    {
        await using var f = new Fixture(); await f.Seed(); await f.Session();
        var referral = await f.Responses.RecommendAsync("D", "S", "SV", new(0, "CT", "Phù hợp kỹ năng C#"), "K");
        Assert.Equal("Đối tác", referral.TenCongTy);
        Assert.Empty(await f.Db.PhanBoThucTaps.ToListAsync()); Assert.Empty(await f.Db.DangKyThucTaps.ToListAsync());
        var personal = JsonSerializer.SerializeToElement(await f.Responses.StudentAsync("D", "SV"));
        Assert.Equal("Phù hợp kỹ năng C#", personal.GetProperty("CacLanHoTro")[0].GetProperty("SinhVien").GetProperty("CongTyGioiThieu")[0].GetProperty("GhiChu").GetString());
        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Responses.RecommendAsync("D", "S", "SV", new(1, "CT", "Trùng"), "K"));
    }

    [Fact]
    public async Task ExpiredPartnerOrRefusalCannotReceiveNewReferral()
    {
        await using var f = new Fixture(); await f.Seed(); await f.Session();
        (await f.Db.CongTyTheoDots.FindAsync("CT", "D"))!.HanDangKy = f.Time.Now.AddMinutes(-1); await f.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Responses.RecommendAsync("D", "S", "SV", new(0, "CT", "Giới thiệu"), "K"));
        await f.Responses.RecordAsync("D", "S", "SV", new(0, "TuChoiHoTro", "Từ chối hỗ trợ"), "ACCOUNT", true);
        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Responses.RecommendAsync("D", "S", "SV", new(1, "CT", "Giới thiệu"), "K"));
    }
}
