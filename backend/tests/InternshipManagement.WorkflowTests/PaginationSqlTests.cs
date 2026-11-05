using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.SinhVienTheoDot;
using InternshipManagement.BLL.Services.ThongKe;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace InternshipManagement.WorkflowTests;

public class PaginationSqlTests
{
    private sealed class Clock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2029, 1, 10, 0, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }

    // 03/11/2026: SQL thực, CSDL tạm có tên cố định tiền tố + GUID; không đọc cấu hình ứng dụng.
    [LocalSqlFact]
    public async Task PagedReadsPreserveKpisGradeBoundariesAndHistoricalNamesOnIsolatedSqlDatabase()
    {
        var name = "CodexReadAudit_" + Guid.NewGuid().ToString("N");
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlServer(
            $"Server=(localdb)\\MSSQLLocalDB;Database={name};Integrated Security=True;TrustServerCertificate=True").Options;
        var clock = new Clock();
        await using var db = new AppDbContext(options) { RoundClock = clock };
        try {
            await DatabaseInitializer.InitializeAsync(db.Database.GetConnectionString()!, NullLogger.Instance);
            await DatabaseSchemaMigrator.ApplyAsync(db);
            await using (var tx = await db.Database.BeginTransactionAsync()) {
                foreach (var statement in InternshipCatalogMigration.Statements.Concat(WorkflowExtensionsMigration.Statements))
                    await db.Database.ExecuteSqlRawAsync(statement);
                await tx.CommitAsync();
            }
            db.BoTieuChis.Add(new() { MaRubric = "AUDIT", TenBo = "Bộ kiểm tra", MaLoaiThucTap = "TTKS", TrangThai = "PhatHanh" });
            db.TieuChis.AddRange(new() { MaTieuChi = "AUDIT_GV", MaCLO = "CLO1.1", TenTieuChi = "GV", MaRubric = "AUDIT", NhomDanhGia = "GV", DiemToiDa = 5 },
                new() { MaTieuChi = "AUDIT_DN", MaCLO = "CLO4.1", TenTieuChi = "DN", MaRubric = "AUDIT", NhomDanhGia = "DN", DiemToiDa = 5 });
            foreach (var id in new[] { "LIVE", "ARCHIVE", "EMPTY" }) db.DotThucTaps.Add(new() {
                MaSo = id, TenDot = id, NamHoc = "2028-2029", TrangThai = "DangDienRa", MaLoaiThucTap = "TTKS", MaRubric = "AUDIT",
                ThoiGianBD = new(2029, 2, 1), ThoiGianKT = new(2029, 5, 1) });
            db.CongTys.Add(new() { MaCongTy = "CT", TenCongTy = "Đối tác", TrangThai = "DaDuyet" });
            db.DaiDienDoanhNghieps.Add(new() { MaSo = "REP", MaCongTy = "CT", HoTen = "Đại diện" });
            for (var i = 1; i <= 10; i++) {
                var id = $"SV{i:00}"; var round = i == 10 ? "ARCHIVE" : "LIVE";
                db.SinhViens.Add(new() { MaSV = id, HoTen = i == 10 ? "Tên tại thời điểm chốt" : $"Sinh viên {i:00}", Lop = "L1" });
                db.SinhVienThamGiaDots.Add(new() { MaDot = round, MaSV = id, NguoiThem = "K", NguoiCapNhat = "K" });
                if (i is 2 or 3 or 4) db.DangKyThucTaps.Add(new() {
                    MaDK = $"DK{i}", MaSV = id, MaCongTy = "CT", MaDot = round, NgayDangKy = new(2029, 1, 1),
                    ThuTuUuTien = 1, TrangThai = i == 2 ? "TuChoi" : i == 3 ? "ChoDuyet" : "DaDuyet", KetQuaHoSo = i == 2 ? "KhongDat" : null });
                if (i is >= 4 and <= 7 || i == 10) db.PhanBoThucTaps.Add(new() {
                    MaPhanBo = $"PB{i}", MaSinhVien = id, MaCongTy = "CT", MaDot = round,
                    TrangThai = i == 4 ? "ChuaNhanViec" : i == 10 ? "HoanThanh" : "DangThucTap", DaDuocKhoaDuyet = i != 4 });
                if (i is >= 6 and <= 8 || i == 10) {
                    var form = new PhieuChamDiem { MaPhieu = $"PC{i}", MaSV = id, MaDot = round, TongDiem = 9 };
                    form.ChiTietChamDiems.Add(new() { MaSo = $"G{i}", MaTieuChi = "AUDIT_GV", DiemCham = i == 6 ? 3.94m : i == 7 ? 3.95m : i == 10 ? 0 : 3 });
                    if (i != 8) form.ChiTietChamDiems.Add(new() { MaSo = $"D{i}", MaTieuChi = "AUDIT_DN", DiemCham = 0 });
                    db.PhieuChamDiems.Add(form);
                }
            }
            db.PhongVans.Add(new() { MaPV = "PV4", MaDK = "DK4", MaSinhVien = "SV04", MaDaiDien = "REP", NgayPV = new(2029, 1, 2), KetQua = "Dat" });
            await db.SaveChangesAsync();
            db.KhongHoanTatDots.Add(new() { MaDot = "LIVE", MaSV = "SV09", LyDo = "Đã xác minh", CanCu = "Biên bản", NguoiXacNhan = "K" });
            await db.SaveRoundControlAsync();
            var roster = new SinhVienTheoDotService(db, clock); var tracking = new UngTuyenHoTroService(db, roster, clock);
            // 03/11/2026: phân trang nơi thực tập phải giữ đúng phân loại/KPI và lịch riêng chưa đầy đủ.
            (await db.PhanBoThucTaps.FindAsync("PB5"))!.NgayBatDauThucTap = new(2029, 2, 1);
            (await db.PhanBoThucTaps.FindAsync("PB6"))!.TenCongTyXacNhan = "Tên đơn vị đã xác nhận";
            await db.SaveChangesAsync();
            foreach (var roundId in new[] { "LIVE", "DOT01", "DOT02", "DOT03", "EMPTY" }) {
                var expected = await roster.GetAsync(roundId);
                var actual = await roster.GetPagedAsync(new(roundId, PageSize: 2));
                Assert.Equal(expected.TongSinhVien, actual.TongSinhVien);
                Assert.Equal(expected.TuDanhSachKhoa, actual.TuDanhSachKhoa);
                Assert.Equal(expected.CanHoTro, actual.CanHoTro);
                Assert.Equal(expected.DaPhanBoChinhThuc, actual.DaPhanBoChinhThuc);
                Assert.Equal(expected.ThongKe, actual.ThongKe);
                Assert.True(actual.SinhViens.Count <= 2);
                foreach (var group in expected.ThongKe.Where(x => x.SoLuong > 0)) {
                    var filtered = await roster.GetPagedAsync(new(roundId, TrangThai: group.Ma));
                    Assert.Equal(group.SoLuong, filtered.TotalCount);
                    Assert.All(filtered.SinhViens, x => Assert.Equal(group.Ma, x.TrangThai));
                }
            }
            Assert.Equal("SV05", Assert.Single((await roster.GetPagedAsync(new("LIVE", TrangThai: "ChuaXacMinhThoiGian"))).SinhViens).MaSV);
            Assert.Equal("SV06", Assert.Single((await roster.GetPagedAsync(new("LIVE", Search: "đã xác nhận"))).SinhViens).MaSV);
            var rosterFirst = await roster.GetPagedAsync(new("LIVE", PageSize: 2));
            var rosterSecond = await roster.GetPagedAsync(new("LIVE", Page: 2, PageSize: 2));
            Assert.DoesNotContain(rosterSecond.SinhViens, x => rosterFirst.SinhViens.Any(y => y.MaSV == x.MaSV));
            var present = await roster.PresentAsync("LIVE", ["sv01", "SV02", "SV10"]);
            Assert.Equal(new[] { "SV01", "SV02" }, present.OrderBy(x => x));
            using (var catalogJson = System.Text.Json.JsonDocument.Parse(System.Text.Json.JsonSerializer.Serialize(
                await roster.GetCatalogPagedAsync(new("LIVE", Search: "Sinh viên 0", PageSize: 2))))) {
                Assert.Equal(0, catalogJson.RootElement.GetProperty("TotalCount").GetInt32());
            }
            using (var catalogJson = System.Text.Json.JsonDocument.Parse(System.Text.Json.JsonSerializer.Serialize(
                await roster.GetCatalogPagedAsync(new("LIVE", Search: "Sinh viên 0", AnDaTrongDot: false, PageSize: 2))))) {
                Assert.Equal(9, catalogJson.RootElement.GetProperty("TotalCount").GetInt32());
                Assert.Equal(2, catalogJson.RootElement.GetProperty("Items").GetArrayLength());
                Assert.True(catalogJson.RootElement.GetProperty("Items")[0].GetProperty("DaTrongDot").GetBoolean());
            }
            // 04/11/2026: phân công phân trang, tổng KPI theo đợt và GPA thiếu không tự thành 0.
            db.GVHuongDans.Add(new() { MaSo = "AUDIT_ASSIGN", MaDot = "LIVE", MaSinhVien = "SV06", MaGiangVien = "GV001", TrangThai = "DangHuongDan", NgayPC = new(2029, 1, 10) });
            await db.SaveChangesAsync();
            var assignments = new AssignmentListService(db);
            using (var assignmentJson = System.Text.Json.JsonDocument.Parse(System.Text.Json.JsonSerializer.Serialize(
                await assignments.ListAsync(new("LIVE", PageSize: 1))))) {
                Assert.Equal(3, assignmentJson.RootElement.GetProperty("Total").GetInt32());
                Assert.Equal(1, assignmentJson.RootElement.GetProperty("Assigned").GetInt32());
                Assert.Equal(2, assignmentJson.RootElement.GetProperty("Unassigned").GetInt32());
                Assert.Single(assignmentJson.RootElement.GetProperty("Items").EnumerateArray());
                var lecturer = assignmentJson.RootElement.GetProperty("Lecturers").EnumerateArray().Single(x => x.GetProperty("MaGV").GetString() == "GV001");
                Assert.Equal(1, lecturer.GetProperty("AssignedCount").GetInt32());
            }
            Assert.Equal("SV06", Assert.Single(await assignments.ExportRowsAsync(new("LIVE", TrangThai: "assigned"))).MaSV);
            Assert.Equal("Tên đơn vị đã xác nhận", Assert.Single(await assignments.ExportRowsAsync(new("LIVE", Search: "đã xác nhận"))).CongTy);
            Assert.Equal(2, (await assignments.ExportRowsAsync(new("LIVE", TrangThai: "unassigned"))).Count);
            Assert.Empty(await assignments.ExportRowsAsync(new("LIVE", Gpa: "low")));
            Assert.Empty(await assignments.ExportRowsAsync(new("EMPTY")));
            // UPDATE phải hoạt động trên bảng có trigger; hủy giữ bản ghi thay vì xóa lịch sử.
            var assignmentRepository = new InternshipManagement.DAL.Repositories.GVHuongDanRepository(db);
            Assert.True(await assignmentRepository.DoiGiangVienAsync("AUDIT_ASSIGN", "GV002"));
            Assert.Equal("GV002", (await db.GVHuongDans.FindAsync("AUDIT_ASSIGN"))!.MaGiangVien);
            Assert.True(await assignmentRepository.HuyPhanCongAsync("AUDIT_ASSIGN"));
            Assert.Equal("HuyBo", (await db.GVHuongDans.FindAsync("AUDIT_ASSIGN"))!.TrangThai);
            Assert.Single(await db.GVHuongDans.Where(x => x.MaSo == "AUDIT_ASSIGN").ToListAsync());
            var page = await tracking.ListAsync(new("LIVE", PageSize: 2));
            Assert.Equal(9, page.TotalCount); Assert.Equal(2, page.Items.Count);
            var second = await tracking.ListAsync(new("LIVE", Page: 2, PageSize: 2));
            Assert.Equal(page.ThongKe, second.ThongKe); Assert.DoesNotContain(second.Items, r => page.Items.Any(p => p.MaSV == r.MaSV));
            var help = await tracking.ListAsync(new("LIVE", CanHoTro: true));
            Assert.All(help.Items, x => Assert.True(x.CanHoTroTiep)); Assert.Equal(help.TotalCount, help.ThongKe.CanHoTroTiep);
            Assert.Equal("SV02", Assert.Single((await tracking.ListAsync(new("LIVE", KetQua: "KhongDat"))).Items).MaSV);
            Assert.Equal("SV04", Assert.Single((await tracking.ListAsync(new("LIVE", TinhTrangNoi: "ChoXacNhan"))).Items).MaSV);
            var live = await new FailedInternshipService(db, tracking, clock).ListAsync(new(MaDot: "LIVE", PageSize: 1));
            Assert.Equal(2, live.TotalCount); Assert.Single(live.Items);
            var failure = Assert.Single((await new FailedInternshipService(db, tracking, clock).ListAsync(new(MaDot: "LIVE", NguyenNhan: "RotDiem"))).Items);
            Assert.Equal("SV06", failure.MaSV); Assert.Equal(3.94m, failure.TongDiem);
            clock.Now = new(2029, 6, 1, 0, 0, 0, TimeSpan.Zero);
            await new ChotDotService(db, roster, clock).CloseAsync("ARCHIVE", new(0, "Chốt để kiểm tra bản lưu"), "K");
            (await db.SinhViens.FindAsync("SV10"))!.HoTen = "Tên hiện tại"; await db.SaveChangesAsync();
            var service = new FailedInternshipService(db, tracking, clock);
            var archived = Assert.Single((await service.ListAsync(new(MaDot: "ARCHIVE", Search: "thời điểm chốt"))).Items);
            Assert.Equal("Tên tại thời điểm chốt", archived.HoTen); Assert.Equal("BanChot", archived.NguonDuLieu); Assert.Equal(0m, archived.TongDiem);
            Assert.Empty((await service.ListAsync(new(MaDot: "ARCHIVE", Search: "Tên hiện tại"))).Items);
            Assert.Equal(3, (await service.ListAsync(new())).TotalCount);
            Assert.Equal(0, (await tracking.ListAsync(new("EMPTY"))).TotalCount);
            Assert.Equal(0, (await service.ListAsync(new(MaDot: "EMPTY"))).TotalCount);
            await service.DetailAsync("ARCHIVE", "SV10");
            Assert.Single(await service.ExportAsync(new(MaDot: "ARCHIVE")));
        }
        finally {
            if (!name.StartsWith("CodexReadAudit_", StringComparison.Ordinal) || name.Length != "CodexReadAudit_".Length + 32)
                throw new InvalidOperationException("Invalid isolated database name.");
            await db.Database.EnsureDeletedAsync();
        }
    }
}
