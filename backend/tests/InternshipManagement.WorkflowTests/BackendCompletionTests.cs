using System.IO.Compression;
using System.Text.Json;
using System.Xml.Linq;
using InternshipManagement.BLL.DTOs.Admin;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.PhieuChamDiem;
using InternshipManagement.BLL.Validators.SinhVien;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternshipManagement.WorkflowTests;

public class BackendCompletionTests
{
    private static AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private static JsonElement Json(object value) => JsonSerializer.SerializeToElement(value);

    private static async Task Seed(AppDbContext db)
    {
        db.DotThucTaps.AddRange(new DotThucTap { MaSo = "A", TenDot = "Đợt A", NamHoc = "2026", MaRubric = "TTNN_V1", MaLoaiThucTap = "TTNN" },
            new DotThucTap { MaSo = "B", TenDot = "Đợt B", NamHoc = "2026" });
        db.VaiTros.Add(new() { MaVaiTro = "VT04", TenVaiTro = "SinhVien" });
        foreach (var id in new[] { "0001", "0002", "0003" })
        {
            db.SinhViens.Add(new() { MaSV = id, HoTen = "Sinh viên " + id, Lop = "L1" });
            db.SinhVienThamGiaDots.Add(new() { MaSV = id, MaDot = id == "0003" ? "B" : "A", NguoiThem = "K", NguoiCapNhat = "K" });
            db.TaiKhoans.Add(new() { MaTaiKhoan = "TK" + id, TenDangNhap = "sv" + id, MatKhau = "DO_NOT_EXPOSE", MaSV = id,
                MaVaiTro = "VT04", TrangThai = id == "0003" ? "BiKhoa" : "HoatDong" });
        }
        db.CongTys.Add(new() { MaCongTy = "CT", TenCongTy = "Công ty" });
        db.DangKyThucTaps.AddRange(
            new() { MaDK = "DK1", MaSV = "0001", MaCongTy = "CT", MaDot = "A", ThuTuUuTien = 1 },
            new() { MaDK = "DK2", MaSV = "0002", MaCongTy = "CT", MaDot = "A", ThuTuUuTien = 1 },
            new() { MaDK = "DK3", MaSV = "0003", MaCongTy = "CT", MaDot = "B", ThuTuUuTien = 1 });
        db.TienDoThucTaps.AddRange(
            new() { MaTienDo = "R1", MaSV = "0001", MaDot = "A", TrangThaiDuyet = "DaNop" },
            new() { MaTienDo = "R2", MaSV = "0002", MaDot = "A", TrangThaiDuyet = "ChuaNop" },
            new() { MaTienDo = "OLD", MaSV = "0001", MaDot = "A", TrangThaiDuyet = "DaDuyet", MaPhanBoLuuTru = "OLD_PB" },
            new() { MaTienDo = "B1", MaSV = "0003", MaDot = "B", TrangThaiDuyet = "DaDuyet" });
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task StudentPaginationCountsWholeFilterAndXlsxExportsAllMatchingRowsAsTextIds()
    {
        await using var db = Db(); await Seed(db);
        var service = new AdminListService(db);
        var filter = new AdminListQuery { MaDot = "A", Page = 2, PageSize = 1 };
        var result = Json(await service.StudentsAsync(filter));
        Assert.Equal(2, result.GetProperty("TotalCount").GetInt32());
        Assert.Equal(2, result.GetProperty("Summary").GetProperty("Total").GetInt32());
        Assert.Equal("0002", Assert.Single(result.GetProperty("Items").EnumerateArray()).GetProperty("MaSV").GetString());
        using var zip = new ZipArchive(new MemoryStream(await service.ExportAsync("students", filter)));
        using var stream = zip.GetEntry("xl/worksheets/sheet1.xml")!.Open();
        var sheet = XDocument.Load(stream); XNamespace ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        // Phía trên bảng là khối tiêu đề (logo, tiêu đề, thông tin đợt); dữ liệu bắt đầu sau dòng tiêu đề cột.
        var ids = sheet.Descendants(ns + "row").SkipWhile(row => row.Elements(ns + "c").FirstOrDefault()?.Value != "Mã SV").Skip(1)
            .Select(row => row.Elements(ns + "c").First()).ToList();
        Assert.Equal(new[] { "0001", "0002" }, ids.Select(cell => cell.Value));
        Assert.All(ids, cell => Assert.Equal("inlineStr", (string?)cell.Attribute("t")));
    }

    [Fact]
    public async Task AccountSearchIncludesOwnerNameAndNeverReturnsPasswords()
    {
        await using var db = Db(); await Seed(db);
        var result = Json(await new AdminListService(db).AccountsAsync(new() { Search = "SINH VIÊN", PageSize = 1 }));
        Assert.Equal(3, result.GetProperty("TotalCount").GetInt32());
        Assert.Equal(1, result.GetProperty("Summary").GetProperty("BiKhoa").GetInt32());
        Assert.Single(result.GetProperty("Items").EnumerateArray());
        Assert.DoesNotContain("DO_NOT_EXPOSE", result.GetRawText());
        Assert.DoesNotContain("MatKhau", result.GetRawText());
        Assert.DoesNotContain("SecurityStamp", result.GetRawText());
    }

    [Fact]
    public async Task ProgressAndApplicationSummariesStayWithinTheRoundAndIgnorePageSize()
    {
        await using var db = Db(); await Seed(db);
        var service = new AdminListService(db);
        var progress = Json(await service.ProgressAsync(new() { MaDot = "A", PageSize = 1, PhamVi = "TatCa" }));
        Assert.Equal(3, progress.GetProperty("TotalCount").GetInt32());
        Assert.Equal(2, progress.GetProperty("Summary").GetProperty("Total").GetInt32());
        Assert.Equal(1, progress.GetProperty("Summary").GetProperty("Archived").GetInt32());
        Assert.Equal(1, progress.GetProperty("Summary").GetProperty("Pending").GetInt32());
        var current = Json(await service.ProgressAsync(new() { MaDot = "A" }));
        Assert.Equal(2, current.GetProperty("TotalCount").GetInt32());
        var registrations = Json(await service.RegistrationsAsync(new() { MaDot = "A", PageSize = 1, TrangThai = "ChoDuyet" }));
        Assert.Equal(2, registrations.GetProperty("TotalCount").GetInt32());
        Assert.Equal(2, registrations.GetProperty("Summary").GetProperty("TongSinhVien").GetInt32());
        Assert.Single(registrations.GetProperty("Items").EnumerateArray());
        await Assert.ThrowsAsync<ArgumentException>(() => service.StudentsAsync(new() { PageSize = 101 }));
        await Assert.ThrowsAsync<ArgumentException>(() => service.ProgressAsync(new() { TrangThai = "INVALID" }));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.StudentsAsync(new() { MaDot = "MISSING" }));
    }

    [Theory]
    [InlineData("TTNN", "Thực tập nghề nghiệp")]
    [InlineData("TTKS", "Thực tập kỹ sư")]
    [InlineData(null, null)]
    public async Task GradeWorkbookMetadataComesFromRoundAndTypeCatalog(string? type, string? name)
    {
        await using var db = Db();
        db.DotThucTaps.Add(new() { MaSo = "D", TenDot = "Đợt", NamHoc = "2026", MaLoaiThucTap = type, MaRubric = type == null ? "OLD" : type + "_V1" });
        if (type != null) db.LoaiThucTaps.Add(new() { MaLoai = type, TenLoai = name! });
        await db.SaveChangesAsync();
        var result = await new PhieuChamDiemService(new PhieuChamDiemRepository(db)).GetBangDiemAsync("D");
        Assert.Equal(type, result.MaLoaiThucTap);
        Assert.Equal(name, result.TenLoaiThucTap);
        Assert.Equal(type == null ? "OLD" : type + "_V1", result.MaRubric);
    }

    [Fact]
    public async Task UnknownRoundAssignmentsDoNotConsumeRoundCapacityOrHideStudentsAndImportHistoryIsOwned()
    {
        await using var db = Db(); await Seed(db);
        db.GiangViens.Add(new() { MaGV = "GV", HoTen = "Giảng viên" });
        db.GVHuongDans.Add(new() { MaSo = "LEGACY", MaGiangVien = "GV", MaSinhVien = "0001" });
        db.PhanBoThucTaps.Add(new() { MaPhanBo = "PB", MaSinhVien = "0001", MaCongTy = "CT", MaDot = "A", TrangThai = "DangThucTap" });
        db.NhapDanhSachDots.AddRange(new() { Id = "OWN", MaDot = "A", NguoiNhap = "K1" }, new() { Id = "OTHER", MaDot = "A", NguoiNhap = "K2" });
        await db.SaveChangesAsync();
        var repo = new GVHuongDanRepository(db);
        Assert.Equal(0, await repo.CountSVHienTaiByGiangVienAsync("GV", "A"));
        Assert.Equal(1, await repo.CountSVHienTaiByGiangVienAsync("GV"));
        Assert.False(await repo.SinhVienDaCoGVHDAsync("0001", "A"));
        Assert.Equal("0001", Assert.Single(await repo.GetDanhSachSVChuaPhanCongAsync("A")).MaSV);
        var import = new RoundStudentImportService(db, new SinhVienValidator(), TimeProvider.System, new InternshipManagement.BLL.Services.Auth.PasswordService());
        var history = Json(await import.HistoryAsync("A", "K1"));
        Assert.Equal(1, history.GetProperty("TotalCount").GetInt32());
        await Assert.ThrowsAsync<KeyNotFoundException>(() => import.GetAsync("OTHER", "K1"));
        await Assert.ThrowsAsync<ArgumentException>(() => import.HistoryAsync("", "K1"));
    }

    [Fact]
    public void PagedProjectionsTranslateToSqlServerWithoutConnectingToAnyDatabase()
    {
        using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=unused;Database=SqlTranslationOnly;Integrated Security=True;TrustServerCertificate=True").Options);
        var service = new AdminListService(db);
        var flags = System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Static;
        object Filter(string name) => typeof(AdminListService).GetMethod(name, flags)!.Invoke(service,
            [new AdminListQuery { MaDot = "A", Search = "sinh viên", TrangThai = null }])!;
        object Rows(string name, object query) => typeof(AdminListService).GetMethod(name, flags)!.Invoke(service, [query])!;
        var accounts = (IQueryable<AccountDto>)Rows("AccountRows", Filter("Accounts"));
        var students = (IQueryable<StudentListRow>)Rows("StudentRows", Filter("Students"));
        var apps = (IQueryable<RegistrationListRow>)Rows("RegistrationRows", Filter("Registrations"));
        var reports = (IQueryable<ProgressListRow>)Rows("ProgressRows", Filter("Progress"));
        foreach (var sql in new[] { accounts.Skip(20).Take(20).ToQueryString(), students.Skip(20).Take(20).ToQueryString(),
            apps.Skip(20).Take(20).ToQueryString(), reports.Skip(20).Take(20).ToQueryString() })
        {
            Assert.Contains("OFFSET", sql);
            Assert.Contains("FETCH NEXT", sql);
        }
    }
}
