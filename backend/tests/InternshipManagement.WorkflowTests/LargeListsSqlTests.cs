using System.Diagnostics;
using System.Text.Json;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.SinhVienTheoDot;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using Xunit.Abstractions;

namespace InternshipManagement.WorkflowTests;

public class LargeListsSqlTests(ITestOutputHelper output)
{
    private sealed class Materializations : IMaterializationInterceptor
    {
        public int Count { get; set; }
        public object InitializedInstance(MaterializationInterceptionData data, object entity) { Count++; return entity; }
    }

    // 04/11/2026: 100.000 SV tổng hợp, 50.000 SV/đợt, 20.000 phân bổ; đo cục bộ, không suy ra tải production.
    [LocalSqlFact]
    public async Task LargeRosterCatalogAndAssignmentsReturnOnlyTheRequestedPage()
    {
        var name = "CodexScaleAudit_" + Guid.NewGuid().ToString("N");
        var materialized = new Materializations();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlServer(
            $"Server=(localdb)\\MSSQLLocalDB;Database={name};Integrated Security=True;TrustServerCertificate=True")
            .AddInterceptors(materialized).Options;
        await using var db = new AppDbContext(options);
        try
        {
            await DatabaseInitializer.InitializeAsync(db.Database.GetConnectionString()!, NullLogger.Instance);
            await DatabaseSchemaMigrator.ApplyAsync(db);
            await using (var tx = await db.Database.BeginTransactionAsync())
            {
                foreach (var sql in InternshipCatalogMigration.Statements.Concat(WorkflowExtensionsMigration.Statements))
                    await db.Database.ExecuteSqlRawAsync(sql);
                await tx.CommitAsync();
            }
            foreach (var id in new[] { "LOAD_A", "LOAD_B" }) db.DotThucTaps.Add(new() { MaSo = id, TenDot = id, NamHoc = "2028-2029",
                MaLoaiThucTap = "TTKS", MaRubric = "TTKS_V1", TrangThai = "DangDienRa", ThoiGianBD = new(2029, 1, 1), ThoiGianKT = new(2029, 5, 1) });
            await db.SaveChangesAsync();
            await db.Database.ExecuteSqlRawAsync("""
                ;WITH N AS (SELECT TOP (100000) ROW_NUMBER() OVER (ORDER BY a.object_id,b.object_id) AS n
                    FROM sys.all_objects a CROSS JOIN sys.all_objects b)
                INSERT INTO SINHVIEN(maSV,hoTen,lop)
                SELECT 'LOAD'+RIGHT('000000'+CAST(n AS varchar(6)),6), N'Sinh viên '+RIGHT('000000'+CAST(n AS varchar(6)),6),
                    'L'+CAST(n%100 AS varchar(3)) FROM N;
                INSERT INTO SVTHAMGIADOT(MaDot,MaSV,DangThamGia,NgayThem,NguoiThem,NgayCapNhat,NguoiCapNhat)
                SELECT CASE WHEN maSV <= 'LOAD050000' THEN 'LOAD_A' ELSE 'LOAD_B' END,maSV,1,SYSDATETIMEOFFSET(),'AUDIT',SYSDATETIMEOFFSET(),'AUDIT'
                    FROM SINHVIEN WHERE maSV LIKE 'LOAD%';
                INSERT INTO PHANBOTHUCTAP(maPB,maSV,maCongTy,maDot,ngayPhanBo,trangThai,daDuocKhoaDuyet,PhienBanThoiGian)
                SELECT 'PB'+maSV,maSV,'CT001','LOAD_A','2029-01-01','DangThucTap',1,0
                    FROM SINHVIEN WHERE maSV BETWEEN 'LOAD000001' AND 'LOAD020000';
                """);
            db.ChangeTracker.Clear();
            Assert.Equal(100000, await db.SinhViens.CountAsync(x => x.MaSV.StartsWith("LOAD")));
            var service = new SinhVienTheoDotService(db);
            materialized.Count = 0; var timer = Stopwatch.StartNew();
            var first = await service.GetPagedAsync(new("LOAD_A", PageSize: 20));
            output.WriteLine($"Roster first page: {timer.ElapsedMilliseconds} ms; {materialized.Count} entities; {JsonSerializer.SerializeToUtf8Bytes(first).Length} bytes");
            Assert.Equal(50000, first.TotalCount); Assert.Equal(50000, first.TongSinhVien);
            Assert.Equal(20000, first.DaPhanBoChinhThuc); Assert.Equal(20, first.SinhViens.Count);
            Assert.InRange(materialized.Count, 1, 200);
            materialized.Count = 0; timer.Restart();
            var last = await service.GetPagedAsync(new("LOAD_A", Page: 2500, PageSize: 20));
            output.WriteLine($"Roster page 2500: {timer.ElapsedMilliseconds} ms; {materialized.Count} entities");
            Assert.Equal(20, last.SinhViens.Count); Assert.Equal("LOAD050000", last.SinhViens.Last().MaSV);
            Assert.DoesNotContain(last.SinhViens, x => first.SinhViens.Any(y => y.MaSV == x.MaSV));
            Assert.InRange(materialized.Count, 1, 200);
            timer.Restart();
            var search = await service.GetPagedAsync(new("LOAD_A", Search: "LOAD049999"));
            output.WriteLine($"Roster exact-code search: {timer.ElapsedMilliseconds} ms");
            Assert.Equal("LOAD049999", Assert.Single(search.SinhViens).MaSV); Assert.Equal(50000, search.TongSinhVien);
            timer.Restart();
            var catalog = JsonSerializer.SerializeToElement(await service.GetCatalogPagedAsync(new("LOAD_A", Search: "LOAD", PageSize: 20)));
            output.WriteLine($"Catalog excluding current round: {timer.ElapsedMilliseconds} ms");
            Assert.Equal(50000, catalog.GetProperty("TotalCount").GetInt32());
            Assert.Equal(20, catalog.GetProperty("Items").GetArrayLength());
            Assert.All(catalog.GetProperty("Items").EnumerateArray(), x => Assert.False(x.GetProperty("DaTrongDot").GetBoolean()));
            timer.Restart(); materialized.Count = 0;
            var assignments = JsonSerializer.SerializeToElement(await new AssignmentListService(db).ListAsync(new("LOAD_A", TrangThai: "unassigned", PageSize: 20)));
            output.WriteLine($"Assignments: {timer.ElapsedMilliseconds} ms; {materialized.Count} entities; {JsonSerializer.SerializeToUtf8Bytes(assignments).Length} bytes");
            Assert.Equal(20000, assignments.GetProperty("TotalCount").GetInt32());
            Assert.Equal(20, assignments.GetProperty("Items").GetArrayLength());
            Assert.InRange(materialized.Count, 0, 100);
            // 04/11/2026: AI/intake quota uses SQL grouped counts rather than loading 20,000 placement rows.
            db.CongTyTheoDots.Add(new() { MaCongTy = "CT001", MaDot = "LOAD_A", ViTriTuyen = "Backend audit", YeuCau = "C# SQL",
                SoLuongNhan = 20005, MoDangKy = DateTimeOffset.UtcNow.AddDays(-1), HanDangKy = DateTimeOffset.UtcNow.AddDays(1) });
            await db.SaveChangesAsync(); db.ChangeTracker.Clear(); timer.Restart();
            var offer = Assert.Single(await new CompanyRoundService(db, TimeProvider.System).AvailableAsync("LOAD_A"));
            Assert.Equal(20000, offer.DaTiepNhan); Assert.Equal(5, offer.ConLai);
            output.WriteLine($"Grouped company-round quota (20,000 placements): {timer.ElapsedMilliseconds} ms");
        }
        finally { await db.Database.EnsureDeletedAsync(); }
    }
}
