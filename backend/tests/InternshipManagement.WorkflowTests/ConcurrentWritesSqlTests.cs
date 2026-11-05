using InternshipManagement.BLL.DTOs.PhieuChamDiem;
using InternshipManagement.BLL.Services.PhieuChamDiem;
using InternshipManagement.BLL.Services.SinhVienTheoDot;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.ThucTapTuTim;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Database;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace InternshipManagement.WorkflowTests;

public class ConcurrentWritesSqlTests
{
    private sealed class Clock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(2029, 1, 21, 0, 0, 0, TimeSpan.Zero);
    }

    // 04/11/2026: ép hai lượt đọc cùng bản cũ rồi cho DN lưu trước GV; SQL thật, CSDL riêng.
    [LocalSqlFact]
    public async Task ConcurrentGradingPreservesEnterpriseSubmissionAndCloseRejectsLateWrites()
    {
        var name = "CodexConcurrentAudit_" + Guid.NewGuid().ToString("N");
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlServer(
            $"Server=(localdb)\\MSSQLLocalDB;Database={name};Integrated Security=True;TrustServerCertificate=True").Options;
        var clock = new Clock();
        await using var seed = new AppDbContext(options) { RoundClock = clock };
        try
        {
            await DatabaseInitializer.InitializeAsync(seed.Database.GetConnectionString()!, NullLogger.Instance);
            await DatabaseSchemaMigrator.ApplyAsync(seed);
            await using (var tx = await seed.Database.BeginTransactionAsync())
            {
                foreach (var sql in InternshipCatalogMigration.Statements.Concat(WorkflowExtensionsMigration.Statements))
                    await seed.Database.ExecuteSqlRawAsync(sql);
                await tx.CommitAsync();
            }
            seed.DotThucTaps.Add(new() { MaSo = "RACE", TenDot = "Đợt kiểm tra đồng thời", NamHoc = "2028-2029",
                MaLoaiThucTap = "TTKS", MaRubric = "TTKS_V1", TrangThai = "DangDienRa", ThoiGianBD = new(2029, 1, 1), ThoiGianKT = new(2029, 1, 20),
                MoChamGV = clock.GetUtcNow().AddDays(-1), HanChamGV = clock.GetUtcNow().AddDays(5), HanChamDN = clock.GetUtcNow().AddDays(5) });
            seed.SinhViens.Add(new() { MaSV = "RACE_S", HoTen = "Sinh viên kiểm tra đồng thời" });
            seed.PhanBoThucTaps.Add(new() { MaPhanBo = "RACE_P", MaSinhVien = "RACE_S", MaCongTy = "CT001", MaDot = "RACE",
                TrangThai = "DangThucTap", DaDuocKhoaDuyet = true });
            seed.GVHuongDans.Add(new() { MaSo = "RACE_G", MaSinhVien = "RACE_S", MaGiangVien = "GV001", MaDot = "RACE", TrangThai = "DangHuongDan" });
            seed.PhieuChamDiems.Add(new() { MaPhieu = "RACE_F", MaSV = "RACE_S", MaDot = "RACE", MaGVHuongDan = "RACE_G" });
            await seed.SaveChangesAsync();
            async Task<int> GenerateSlots()
            {
                await using var context = new AppDbContext(options) { RoundClock = clock };
                var service = new AdminService(context, Mock.Of<InternshipManagement.BLL.Services.GVHuongDan.IGVHuongDanService>(),
                    new InternshipManagement.BLL.Services.Auth.PasswordService(), new InternshipManagement.BLL.Validators.SinhVien.SinhVienValidator(), clock);
                return await service.GenerateReportSlotsAsync(new("RACE", 12));
            }
            var generated = await Task.WhenAll(GenerateSlots(), GenerateSlots());
            Assert.Equal(2, generated.Sum()); // Jan 8/15 only, never Jan 22 beyond the round end.
            Assert.Equal(2, await seed.TienDoThucTaps.CountAsync(x => x.MaDot == "RACE"));
            Assert.False(await seed.TienDoThucTaps.AnyAsync(x => x.MaDot == "RACE" && x.MocThoiGian > new DateTime(2029, 1, 20)));
            var criteria = await seed.TieuChis.AsNoTracking().Where(x => x.MaRubric == "TTKS_V1").ToListAsync();
            var gvScores = criteria.Where(x => x.NhomDanhGia == "GV").Select(x => new ChiTietDiemInput(x.MaTieuChi, x.DiemToiDa)).ToList();
            var dnScores = criteria.Where(x => x.NhomDanhGia == "DN").Select(x => new ChiTietDiemInput(x.MaTieuChi, x.DiemToiDa)).ToList();
            await new PhieuChamDiemService(new PhieuChamDiemRepository(seed), clock)
                .LuuPhieuChamDiemAsync(new("RACE_S", "RACE", null, null, gvScores), "GV001");
            await using var gvDb = new AppDbContext(options) { RoundClock = clock };
            await using var dnDb = new AppDbContext(options) { RoundClock = clock };
            var gvRead = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var dnRead = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var releaseGv = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var releaseDn = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var gvService = new PhieuChamDiemService(Gated(new(gvDb), gvRead, releaseGv), clock);
            var dnService = new PhieuChamDiemService(Gated(new(dnDb), dnRead, releaseDn), clock);
            var gvTask = gvService.LuuPhieuChamDiemAsync(new("RACE_S", "RACE", null, null, gvScores), "GV001");
            var dnTask = dnService.LuuDiemDoanhNghiepAsync("RACE_S", "RACE", "DD001", dnScores, "Phiếu chính thức", khoaChinhThuc: true);
            try
            {
                await Task.WhenAll(gvRead.Task, dnRead.Task).WaitAsync(TimeSpan.FromSeconds(15));
                releaseDn.TrySetResult();
                await dnTask.WaitAsync(TimeSpan.FromSeconds(15));
                releaseGv.TrySetResult();
                await gvTask.WaitAsync(TimeSpan.FromSeconds(15));
            }
            finally
            {
                releaseDn.TrySetResult(); releaseGv.TrySetResult();
                await Task.WhenAll(gvTask, dnTask);
            }
            await using var check = new AppDbContext(options) { RoundClock = clock };
            var form = await check.PhieuChamDiems.Include(x => x.ChiTietChamDiems).SingleAsync(x => x.MaDot == "RACE");
            Assert.True(form.DaDoiChieuPhieuDN, "GV lưu từ bản cũ không được mở khóa phiếu DN vừa nộp chính thức.");
            Assert.Equal(criteria.Count, form.ChiTietChamDiems.Count);
            Assert.Equal(10m, form.ChiTietChamDiems.Sum(x => x.DiemCham));
            Assert.Equal(10m, form.TongDiem);
            await using var late = new AppDbContext(options) { RoundClock = clock };
            var lateRead = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var releaseLate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var lateWrite = new PhieuChamDiemService(Gated(new(late), lateRead, releaseLate), clock)
                .LuuPhieuChamDiemAsync(new("RACE_S", "RACE", null, null, gvScores.Select(x => x with { DiemCham = 0 }).ToList()), "GV001");
            try
            {
                await lateRead.Task.WaitAsync(TimeSpan.FromSeconds(15));
                async Task<Exception?> Close()
                {
                    await using var context = new AppDbContext(options) { RoundClock = clock };
                    try { await new ChotDotService(context, new SinhVienTheoDotService(context, clock), clock).CloseAsync("RACE", new(0, "Đủ điểm, khóa đợt"), "K"); return null; }
                    catch (Exception ex) { return ex; }
                }
                var closings = await Task.WhenAll(Close(), Close()).WaitAsync(TimeSpan.FromSeconds(20));
                Assert.Single(closings, x => x == null);
                Assert.IsType<DbUpdateConcurrencyException>(Assert.Single(closings, x => x != null));
                releaseLate.TrySetResult();
                await Assert.ThrowsAsync<RoundLockedException>(() => lateWrite);
            }
            finally
            {
                releaseLate.TrySetResult();
                try { await lateWrite; } catch (RoundLockedException) { }
            }
            Assert.Equal(10m, await check.ChiTietChamDiems.Where(x => x.MaPhieu == "RACE_F").SumAsync(x => x.DiemCham));
            Assert.Equal(1, await check.NhatKyChotDots.CountAsync(x => x.MaDot == "RACE" && x.Loai == "Chot"));
        }
        finally { await seed.Database.EnsureDeletedAsync(); }
    }

    private static IPhieuChamDiemRepository Gated(PhieuChamDiemRepository real, TaskCompletionSource read, TaskCompletionSource release)
    {
        var repo = new Mock<IPhieuChamDiemRepository>();
        repo.Setup(x => x.GetActiveAssignmentAsync(It.IsAny<string>(), It.IsAny<string>())).Returns((string s, string r) => real.GetActiveAssignmentAsync(s, r));
        repo.Setup(x => x.CanEnterpriseGradeAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).Returns((string s, string r, string d) => real.CanEnterpriseGradeAsync(s, r, d));
        repo.Setup(x => x.GetDanhSachTieuChiAsync(It.IsAny<string>())).Returns((string r) => real.GetDanhSachTieuChiAsync(r));
        repo.Setup(x => x.GetDotThucTapAsync(It.IsAny<string>())).Returns((string r) => real.GetDotThucTapAsync(r));
        repo.Setup(x => x.IsRoundReopenedAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>())).Returns((string r, DateTimeOffset now) => real.IsRoundReopenedAsync(r, now));
        var first = true;
        repo.Setup(x => x.GetPhieuChamBySinhVienAndDotAsync(It.IsAny<string>(), It.IsAny<string>())).Returns(async (string s, string r) =>
        {
            var value = await real.GetPhieuChamBySinhVienAndDotAsync(s, r);
            if (first) { first = false; read.TrySetResult(); await release.Task; }
            return value;
        });
        repo.Setup(x => x.LuuPhieuChamDiemAsync(It.IsAny<PhieuChamDiem>(), It.IsAny<IEnumerable<ChiTietChamDiem>>()))
            .Returns((PhieuChamDiem p, IEnumerable<ChiTietChamDiem> details) => real.LuuPhieuChamDiemAsync(p, details));
        return repo.Object;
    }

    // 04/11/2026: hai hồ sơ được công nhận cùng lúc khi DN chỉ còn một chỗ.
    [LocalSqlFact]
    public async Task TwoExternalRecognitionsCannotOverbookTheLastCompanyRoundPlace()
    {
        var name = "CodexCapacityAudit_" + Guid.NewGuid().ToString("N");
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlServer(
            $"Server=(localdb)\\MSSQLLocalDB;Database={name};Integrated Security=True;TrustServerCertificate=True").Options;
        await using var seed = new AppDbContext(options);
        try
        {
            await DatabaseInitializer.InitializeAsync(seed.Database.GetConnectionString()!, NullLogger.Instance);
            await DatabaseSchemaMigrator.ApplyAsync(seed);
            await using (var tx = await seed.Database.BeginTransactionAsync())
            {
                foreach (var sql in InternshipCatalogMigration.Statements.Concat(WorkflowExtensionsMigration.Statements))
                    await seed.Database.ExecuteSqlRawAsync(sql);
                await tx.CommitAsync();
            }
            seed.DotThucTaps.Add(new() { MaSo = "CAP_RACE", TenDot = "Kiểm tra chỗ cuối", NamHoc = "2028-2029",
                MaLoaiThucTap = "TTKS", MaRubric = "TTKS_V1", TrangThai = "DangDienRa", ThoiGianBD = new(2029, 1, 1), ThoiGianKT = new(2029, 5, 1) });
            seed.CongTyTheoDots.Add(new() { MaDot = "CAP_RACE", MaCongTy = "CT001", SoLuongNhan = 1, ViTriTuyen = "Dev", YeuCau = "C#", HoatDong = false,
                MoDangKy = new(2028, 12, 1, 0, 0, 0, TimeSpan.Zero), HanDangKy = new(2028, 12, 31, 0, 0, 0, TimeSpan.Zero) });
            foreach (var id in new[] { "CAP_A", "CAP_B" })
            {
                seed.SinhViens.Add(new() { MaSV = id, HoTen = id });
                seed.DeXuatThucTapTuTims.Add(new() { MaHoSo = id, MaSV = id, MaDot = "CAP_RACE", MaCongTy = "CT001",
                    TenCongTy = "Đơn vị tiếp nhận", DiaChi = "Địa chỉ", ViTri = "Dev", NguoiLienHe = "Đại diện", LienHe = "audit@example.invalid",
                    NgayBatDau = new(2029, 1, 1), NgayKetThuc = new(2029, 5, 1), TrangThai = "ChoDuyet" });
            }
            await seed.SaveChangesAsync();
            var start = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            async Task<Exception?> Review(string id)
            {
                await using var context = new AppDbContext(options);
                await start.Task;
                try { await new ThucTapTuTimService(context).ReviewAsync(id, "K", new("DaDuyet", "Đã xác minh")); return null; }
                catch (Exception ex) { return ex; }
            }
            var first = Review("CAP_A"); var second = Review("CAP_B");
            start.SetResult();
            var results = await Task.WhenAll(first, second).WaitAsync(TimeSpan.FromSeconds(40));
            Assert.Single(results, x => x == null);
            var rejection = Assert.Single(results, x => x != null);
            Assert.True(rejection is InvalidOperationException, rejection!.ToString());
            await using var check = new AppDbContext(options);
            Assert.Equal(1, await check.PhanBoThucTaps.CountAsync(x => x.MaDot == "CAP_RACE" && x.TrangThai != "Huy"));
            Assert.Equal(1, await check.DeXuatThucTapTuTims.CountAsync(x => x.MaDot == "CAP_RACE" && x.TrangThai == "ChoDuyet"));
            Assert.False((await check.CongTyTheoDots.SingleAsync(x => x.MaDot == "CAP_RACE")).HoatDong);
        }
        finally { await seed.Database.EnsureDeletedAsync(); }
    }
}
