using InternshipManagement.DAL;
using InternshipManagement.DAL.Database;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.SinhVienTheoDot;
using InternshipManagement.BLL.Services.ThongKe;
using InternshipManagement.BLL.Validators.SinhVien;
using InternshipManagement.DAL.Entities;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace InternshipManagement.WorkflowTests;

public sealed class LocalSqlFactAttribute : FactAttribute
{
    public LocalSqlFactAttribute()
    {
        if (Environment.GetEnvironmentVariable("INTERNSHIP_TEST_LOCALDB") != "1")
            Skip = "Set INTERNSHIP_TEST_LOCALDB=1 to verify the real SQL Server bootstrap on an isolated LocalDB database.";
    }
}

public class CatalogSqlTests
{
    [LocalSqlFact]
    public async Task FreshAndRepeatedStartupPreserveLegacyAndNewRubricsAndAllowRepeatCompany()
    {
        // The connection is deliberately fixed to LocalDB, never application configuration or a production server.
        var name = "CodexWorkflow_" + Guid.NewGuid().ToString("N");
        var target = new SqlConnectionStringBuilder { DataSource = @"(localdb)\MSSQLLocalDB", InitialCatalog = name,
            IntegratedSecurity = true, TrustServerCertificate = true, ConnectTimeout = 30 };
        try
        {
            await DatabaseInitializer.InitializeAsync(target.ConnectionString, NullLogger.Instance);
            await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlServer(target.ConnectionString).Options);
            await DatabaseSchemaMigrator.ApplyAsync(db);
            async Task Upgrade()
            {
                await using var tx = await db.Database.BeginTransactionAsync();
                foreach (var statement in InternshipCatalogMigration.Statements.Concat(WorkflowExtensionsMigration.Statements)) await db.Database.ExecuteSqlRawAsync(statement);
                await tx.CommitAsync();
            }
            var legacyCount = await db.TieuChis.CountAsync();
            await Upgrade();
            Assert.Equal(legacyCount + 23, await db.TieuChis.CountAsync());
            Assert.Equal(11, await db.TieuChis.CountAsync(x => x.MaRubric == "TTNN_V1"));
            Assert.Equal(12, await db.TieuChis.CountAsync(x => x.MaRubric == "TTKS_V1"));
            var count = await db.TieuChis.CountAsync();
            // Execute the original startup path again as well as the new migration: old cleanup must not delete new criteria.
            await DatabaseInitializer.InitializeAsync(target.ConnectionString, NullLogger.Instance);
            await Upgrade();
            Assert.Equal(count, await db.TieuChis.CountAsync());
            Assert.All(await db.DotThucTaps.ToListAsync(), x => Assert.Null(x.MaLoaiThucTap));
            var roundId = await db.DotThucTaps.OrderBy(x => x.MaSo).Select(x => x.MaSo).FirstAsync();
            var tracking = new UngTuyenHoTroService(db, new SinhVienTheoDotService(db), TimeProvider.System);
            var page = await tracking.ListAsync(new(roundId, PageSize: 2));
            Assert.True(page.TotalCount > 0);
            Assert.InRange(page.Items.Count, 1, 2);
            await tracking.DetailAsync(roundId, page.Items[0].MaSV);
            await new RubricService(db, TimeProvider.System).ListAsync("TTKS");
            var sql = """
                DECLARE @sv nvarchar(20)=(SELECT TOP 1 maSV FROM SINHVIEN ORDER BY maSV),
                    @ct nvarchar(20)=(SELECT TOP 1 maCongTy FROM CONGTY ORDER BY maCongTy),
                    @dot nvarchar(20)=(SELECT TOP 1 maSo FROM DOTTHUCTAP ORDER BY maSo);
                INSERT DANGKYTHUCTAP(maDK,maSV,maCongTy,maDot,ngayDangKy,thuTuUuTien,trangThai,LanDangKy)
                    VALUES('CODEX_WAVE_99',@sv,@ct,@dot,GETDATE(),1,'TuChoi',99),
                          ('CODEX_WAVE_100',@sv,@ct,@dot,GETDATE(),1,'ChoDuyet',100);
                """;
            await db.Database.ExecuteSqlRawAsync(sql);
            Assert.Equal(2, await db.DangKyThucTaps.CountAsync(x => x.MaDK.StartsWith("CODEX_WAVE_")));
            await VerifyWorkflowExtensions(db);
        }
        finally
        {
            SqlConnection.ClearAllPools();
            var master = new SqlConnectionStringBuilder(target.ConnectionString) { InitialCatalog = "master" };
            await using var connection = new SqlConnection(master.ConnectionString); await connection.OpenAsync();
            await using var cleanup = connection.CreateCommand();
            // name is a private literal prefix plus a generated GUID; no caller-supplied path or DB name is accepted.
            cleanup.CommandText = $"IF DB_ID(N'{name}') IS NOT NULL BEGIN ALTER DATABASE [{name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{name}]; END";
            await cleanup.ExecuteNonQueryAsync();
        }
    }

    private sealed class SqlClock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2030, 1, 10, 0, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private static async Task VerifyWorkflowExtensions(AppDbContext db)
    {
        var clock = new SqlClock(); db.RoundClock = clock;
        db.DotThucTaps.Add(new() { MaSo = "CODEX_FLOW", TenDot = "Kiểm thử", NamHoc = "2029-2030", MaLoaiThucTap = "TTKS", MaRubric = "TTKS_V1",
            TrangThai = "DangDienRa", ThoiGianBD = new(2030, 2, 1), ThoiGianKT = new(2030, 5, 1) });
        await db.SaveChangesAsync();
        var importer = new RoundStudentImportService(db, new SinhVienValidator(), clock, new InternshipManagement.BLL.Services.Auth.PasswordService());
        var preview = await importer.PreviewAsync(new("CODEX_FLOW", "NhapHoSo", [new("CODEX_IMPORT_A", "Sinh viên kiểm thử A", "L1"), new("CODEX_IMPORT_B", "Sinh viên kiểm thử B", "L2")]), "CODEX");
        var imported = await importer.CommitAsync(preview.Id!, new(0), "CODEX");
        Assert.Equal(2, imported.SoHoSoTaoMoi); Assert.Equal(2, imported.SoThemVaoDot);
        Assert.Equal(imported.NgayNhap, (await importer.CommitAsync(preview.Id!, new(0), "CODEX")).NgayNhap);

        var concurrent = await importer.PreviewAsync(new("CODEX_FLOW", "ThemVaoDot", [new("CODEX_IMPORT_A")]), "CODEX");
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlServer(db.Database.GetConnectionString()).Options;
        await using (var first = new AppDbContext(options))
        await using (var second = new AppDbContext(options))
        {
            var retries = await Task.WhenAll(new RoundStudentImportService(first, new SinhVienValidator(), clock, new InternshipManagement.BLL.Services.Auth.PasswordService()).CommitAsync(concurrent.Id!, new(0), "CODEX"),
                new RoundStudentImportService(second, new SinhVienValidator(), clock, new InternshipManagement.BLL.Services.Auth.PasswordService()).CommitAsync(concurrent.Id!, new(0), "CODEX"));
            Assert.All(retries, x => Assert.True(x.ThanhCong));
            Assert.Equal(retries[0].NgayNhap, retries[1].NgayNhap);
        }
        db.ChangeTracker.Clear();

        var rollback = await importer.PreviewAsync(new("CODEX_FLOW", "NhapHoSo", [new("CODEX_ROLLBACK", "Không được lưu dở dang", "L1")]), "CODEX");
        await db.Database.ExecuteSqlRawAsync("CREATE TRIGGER CODEX_FAIL_IMPORT ON NHAPDANHSACHDOT AFTER UPDATE AS IF EXISTS(SELECT 1 FROM inserted WHERE TrangThai='DaNhap') THROW 51000, 'Simulated import failure', 1;");
        try { await Assert.ThrowsAsync<DbUpdateException>(() => importer.CommitAsync(rollback.Id!, new(0), "CODEX")); }
        finally { db.ChangeTracker.Clear(); await db.Database.ExecuteSqlRawAsync("DROP TRIGGER CODEX_FAIL_IMPORT;"); }
        Assert.False(await db.SinhViens.AnyAsync(x => x.MaSV == "CODEX_ROLLBACK"));
        Assert.False(await db.SinhVienThamGiaDots.AnyAsync(x => x.MaSV == "CODEX_ROLLBACK"));

        var roster = new SinhVienTheoDotService(db, clock);
        var sessions = new LanHoTroService(db, roster, clock);
        var id = await sessions.SaveAsync("CODEX_FLOW", null, new("Hỗ trợ", new(2030, 1, 10), ["CODEX_IMPORT_A"]), "CODEX");
        var version = await db.LanHoTroThucTaps.Where(x => x.MaLan == id).Select(x => x.PhienBan).SingleAsync();
        await new SupportResponseService(db, clock).RecordAsync("CODEX_FLOW", id, "CODEX_IMPORT_A", new(version, "TuChoiHoTro", "Không nhận hỗ trợ"), "CODEX", true);
        var review = new RaSoatNoiService(db, roster, clock);
        await review.ConfirmAsync("CODEX_FLOW", "CODEX_IMPORT_A", new(0, "Từ chối hỗ trợ", "Biên bản kiểm thử", true,
            MaLyDo: "TuChoiHoTro", MaLanHoTro: id, PhienBanHoTro: version + 1), "CODEX");
        await review.ConfirmAsync("CODEX_FLOW", "CODEX_IMPORT_B", new(1, "Chưa có nơi", "Biên bản kiểm thử", true), "CODEX");
        var results = new FailedInternshipService(db, new UngTuyenHoTroService(db, roster, clock), clock);
        Assert.Equal(2, (await results.ListAsync(new(MaDot: "CODEX_FLOW"))).TotalCount);
        await results.DetailAsync("CODEX_FLOW", "CODEX_IMPORT_A");
        clock.Now = new(2030, 6, 1, 0, 0, 0, TimeSpan.Zero);
        await new ChotDotService(db, roster, clock).CloseAsync("CODEX_FLOW", new(2, "Chốt kiểm thử"), "CODEX");
        (await db.SinhViens.FindAsync("CODEX_IMPORT_A"))!.HoTen = "Tên hiện hành thay đổi"; await db.SaveChangesAsync();
        var archived = await results.ListAsync(new(MaDot: "CODEX_FLOW", NguyenNhan: "TuChoiHoTro"));
        Assert.Equal("Sinh viên kiểm thử A", Assert.Single(archived.Items).HoTen);
        Assert.Equal("BanChot", archived.Items[0].NguonDuLieu);
        await results.DetailAsync("CODEX_FLOW", "CODEX_IMPORT_A");
    }
}
