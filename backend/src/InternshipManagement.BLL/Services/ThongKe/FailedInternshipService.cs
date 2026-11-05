using System.Text.Json;
using InternshipManagement.BLL.Common;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.SinhVienTheoDot;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.ThongKe;

public record FailedInternshipQuery(string? MaDot = null, string? NamHoc = null, string? MaLoaiThucTap = null,
    string? Lop = null, string? Search = null, string? NguyenNhan = null, string Nguon = "TuDong", int Page = 1, int PageSize = 20);
public record FailedInternshipRow(string MaSV, string HoTen, string? Lop, string MaDot, string TenDot, string NamHoc, string? MaLoaiThucTap,
    string MaRubric, string NguyenNhan, string KetQua, decimal? TongDiem, string? LyDo, string? CanCu,
    string? NguoiXacNhan, DateTimeOffset? NgayXacNhan, string? TenCongTy, string NguonDuLieu,
    string TrangThaiChot, string? MaNhatKyChot, int? PhienBanChot);
public record FailedInternshipList(int TotalCount, int Page, int PageSize, List<FailedInternshipRow> Items);

public class FailedInternshipService(AppDbContext db, UngTuyenHoTroService tracking, TimeProvider clock)
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private sealed class SavedSnapshot
    {
        public DotThucTap? Dot { get; set; }
        public List<SinhVienChotDotDto>? SinhViens { get; set; }
        public List<KhongHoanTatDot> KhongHoanTat { get; set; } = [];
        public List<SavedPlacement> PhanBo { get; set; } = [];
    }
    private sealed class SavedPlacement
    {
        public string MaSinhVien { get; set; } = "";
        public string TrangThai { get; set; } = "";
        public bool DaDuocKhoaDuyet { get; set; }
        public SavedCompany? CongTy { get; set; }
    }
    private sealed class SavedCompany { public string? TenCongTy { get; set; } }
    private static void Validate(FailedInternshipQuery query)
    {
        if (query.Page < 1 || query.Page > 1_000_000 || query.PageSize is < 1 or > 100
            || query.Nguon is not ("TuDong" or "HienHanh" or "BanChot")
            || query.NguyenNhan is not (null or "RotDiem" or "KhongHoanTat" or "TuChoiHoTro"))
            throw new ArgumentException("Bộ lọc/trang/nguồn kết quả không hợp lệ.");
    }

    private static string Reason(KhongHoanTatDot item) => item.MaLyDo == "TuChoiHoTro" ? "TuChoiHoTro" : "KhongHoanTat";
    private static string Outcome(string reason) => reason switch { "RotDiem" => "Rớt do điểm", "TuChoiHoTro" => "Rớt do từ chối hỗ trợ", _ => "Không hoàn tất đợt" };

    private async Task<List<FailedInternshipRow>> Load(FailedInternshipQuery query)
    {
        Validate(query);
        // Year/type/name can be historical values in a snapshot: filter them after reading the selected source.
        var rounds = await db.DotThucTaps.AsNoTracking().Where(x => query.MaDot == null || x.MaSo == query.MaDot).ToListAsync();
        if (query.MaDot != null && rounds.Count == 0) throw new KeyNotFoundException("Không tìm thấy đợt.");
        var ids = rounds.Select(x => x.MaSo).ToArray();
        var states = await db.ChotDotThucTaps.AsNoTracking().Where(x => ids.Contains(x.MaDot)).ToDictionaryAsync(x => x.MaDot);
        var liveIds = rounds.Where(r => query.Nguon == "HienHanh" || query.Nguon == "TuDong" && (!states.TryGetValue(r.MaSo, out var s) || AppDbContext.LockStatus(s, clock.GetUtcNow()) != "DaChot")).Select(x => x.MaSo).ToArray();
        var archiveIds = ids.Except(liveIds).ToArray();
        var snapshots = await db.NhatKyChotDots.AsNoTracking().Where(x => archiveIds.Contains(x.MaDot) && x.Loai == "Chot"
            && !db.NhatKyChotDots.Any(n => n.MaDot == x.MaDot && n.Loai == "Chot" && n.PhienBan > x.PhienBan)).ToListAsync();
        var forms = await db.PhieuChamDiems.AsNoTracking().Include(x => x.SinhVien).Include(x => x.ChiTietChamDiems).Where(x => liveIds.Contains(x.MaDot)).ToListAsync();
        var failures = await db.KhongHoanTatDots.AsNoTracking().Where(x => liveIds.Contains(x.MaDot) && x.HieuLuc).ToListAsync();
        var studentKeys = failures.Select(x => x.MaSV).ToArray();
        var students = await db.SinhViens.AsNoTracking().Where(x => studentKeys.Contains(x.MaSV)).ToDictionaryAsync(x => x.MaSV);
        var rubrics = rounds.Select(x => x.MaRubric).ToArray();
        var criteria = await db.TieuChis.AsNoTracking().Where(x => rubrics.Contains(x.MaRubric) && x.NhomDanhGia != null).ToListAsync();
        var places = await db.PhanBoThucTaps.AsNoTracking().Include(x => x.CongTy).Where(x => liveIds.Contains(x.MaDot) && x.TrangThai != "Huy" && x.DaDuocKhoaDuyet).ToListAsync();
        var result = new List<FailedInternshipRow>();
        foreach (var round in rounds)
        {
            states.TryGetValue(round.MaSo, out var state);
            var status = AppDbContext.LockStatus(state, clock.GetUtcNow());
            if (!liveIds.Contains(round.MaSo))
            {
                var snapshot = snapshots.FirstOrDefault(x => x.MaDot == round.MaSo);
                if (snapshot == null)
                {
                    if (query.Nguon == "BanChot" && status != "DaChot") continue;
                    throw new InvalidOperationException($"Đợt {round.MaSo} đã chốt nhưng thiếu bản lưu; cần Khoa rà dữ liệu.");
                }
                var saved = JsonSerializer.Deserialize<SavedSnapshot>(snapshot.NoiDung, JsonOptions);
                if (saved?.Dot == null || saved.SinhViens == null || saved.Dot.MaSo != round.MaSo)
                    throw new InvalidOperationException("Bản chốt thiếu dữ liệu bắt buộc; không thay bằng kết quả hiện hành.");
                foreach (var row in saved.SinhViens)
                {
                    var failed = saved.KhongHoanTat.SingleOrDefault(x => x.MaSV == row.MaSV && x.HieuLuc);
                    var cause = row.KhongHoanTat ? failed == null ? "KhongHoanTat" : Reason(failed)
                        : row.DuDiem && row.KetQua == "Không đạt" ? "RotDiem" : null;
                    if (cause == null) continue;
                    result.Add(new(row.MaSV, row.HoTen, row.Lop, round.MaSo, saved.Dot.TenDot, saved.Dot.NamHoc, saved.Dot.MaLoaiThucTap,
                        saved.Dot.MaRubric, cause, Outcome(cause), cause == "RotDiem" ? row.TongDiem : null,
                        failed?.LyDo ?? row.LyDoKhongHoanTat, failed?.CanCu ?? row.CanCuKhongHoanTat, failed?.NguoiXacNhan,
                        failed?.NgayXacNhan, saved.PhanBo.FirstOrDefault(x => x.MaSinhVien == row.MaSV && x.TrangThai != "Huy" && x.DaDuocKhoaDuyet)?.CongTy?.TenCongTy,
                        "BanChot", status, snapshot.MaNhatKy, snapshot.PhienBan));
                }
                continue;
            }
            foreach (var failure in failures.Where(x => x.MaDot == round.MaSo))
            {
                students.TryGetValue(failure.MaSV, out var student); var cause = Reason(failure);
                result.Add(new(failure.MaSV, student?.HoTen ?? failure.MaSV, student?.Lop, round.MaSo, round.TenDot, round.NamHoc, round.MaLoaiThucTap,
                    round.MaRubric, cause, Outcome(cause), null, failure.LyDo, failure.CanCu, failure.NguoiXacNhan, failure.NgayXacNhan,
                    places.FirstOrDefault(x => x.MaDot == round.MaSo && x.MaSinhVien == failure.MaSV)?.CongTy.TenCongTy, "HienHanh", status, null, null));
            }
            foreach (var form in forms.Where(x => x.MaDot == round.MaSo && !failures.Any(f => f.MaDot == x.MaDot && f.MaSV == x.MaSV)))
            {
                var grade = CloResult.Evaluate(criteria.Where(x => x.MaRubric == round.MaRubric), form.ChiTietChamDiems);
                if (!grade.Complete || grade.Outcome != "Không đạt") continue;
                result.Add(new(form.MaSV, form.SinhVien?.HoTen ?? form.MaSV, form.SinhVien?.Lop, round.MaSo, round.TenDot, round.NamHoc, round.MaLoaiThucTap,
                    round.MaRubric, "RotDiem", Outcome("RotDiem"), grade.Total, null, null, null, null,
                    places.FirstOrDefault(x => x.MaDot == round.MaSo && x.MaSinhVien == form.MaSV)?.CongTy.TenCongTy, "HienHanh", status, null, null));
            }
        }
        return result.Where(x => (query.NamHoc == null || x.NamHoc == query.NamHoc) && (query.MaLoaiThucTap == null || x.MaLoaiThucTap == query.MaLoaiThucTap)
            && (query.Lop == null || x.Lop == query.Lop) && (query.NguyenNhan == null || x.NguyenNhan == query.NguyenNhan)
            && (string.IsNullOrWhiteSpace(query.Search) || x.MaSV.Contains(query.Search.Trim(), StringComparison.OrdinalIgnoreCase) || x.HoTen.Contains(query.Search.Trim(), StringComparison.OrdinalIgnoreCase)))
            .OrderBy(x => x.MaDot, StringComparer.Ordinal).ThenBy(x => x.MaSV, StringComparer.Ordinal).ToList();
    }

    private async Task<IQueryable<FailedReadRow>> ReadQueryAsync(FailedInternshipQuery filter, string? student = null)
    {
        Validate(filter);
        var rounds = await db.DotThucTaps.AsNoTracking().Where(x => filter.MaDot == null || x.MaSo == filter.MaDot).Select(x => x.MaSo).ToListAsync();
        if (filter.MaDot != null && rounds.Count == 0) throw new KeyNotFoundException("Không tìm thấy đợt.");
        var states = await db.ChotDotThucTaps.AsNoTracking().Where(x => rounds.Contains(x.MaDot)).ToDictionaryAsync(x => x.MaDot);
        var now = clock.GetUtcNow();
        var live = rounds.Where(id => filter.Nguon == "HienHanh" || filter.Nguon == "TuDong"
            && (!states.TryGetValue(id, out var state) || AppDbContext.LockStatus(state, now) != "DaChot")).ToArray();
        var archive = rounds.Except(live).ToArray();
        if (archive.Length > 0) {
            var json = JsonSerializer.Serialize(archive);
            var health = await db.Database.SqlQuery<SnapshotHealth>($"""
                SELECT n.MaDot, CASE WHEN ISJSON(n.NoiDung)=1 THEN
                    CASE WHEN JSON_VALUE(n.NoiDung,'$.Dot.MaSo')=n.MaDot AND LEFT(LTRIM(JSON_QUERY(n.NoiDung,'$.SinhViens')),1)=N'[' THEN 1 ELSE 0 END
                    ELSE 0 END AS Valid
                FROM NHATKYCHOTDOT n WHERE n.Loai=N'Chot' AND n.MaDot IN (SELECT value FROM OPENJSON({json}))
                    AND NOT EXISTS(SELECT 1 FROM NHATKYCHOTDOT newer WHERE newer.MaDot=n.MaDot AND newer.Loai=N'Chot' AND newer.PhienBan>n.PhienBan)
                """).ToListAsync();
            if (health.Any(x => x.Valid != 1)) throw new InvalidOperationException("Bản chốt thiếu dữ liệu bắt buộc; không thay bằng kết quả hiện hành.");
            foreach (var id in archive.Where(id => !health.Any(x => x.MaDot == id))) {
                if (filter.Nguon == "BanChot" && (!states.TryGetValue(id, out var state) || AppDbContext.LockStatus(state, now) != "DaChot")) continue;
                throw new InvalidOperationException($"Đợt {id} đã chốt nhưng thiếu bản lưu; cần Khoa rà dữ liệu.");
            }
            archive = health.Select(x => x.MaDot).Distinct().ToArray();
        }
        return FailedResultQuery.Build(db, live, archive, now, filter, student);
    }

    public async Task<FailedInternshipList> ListAsync(FailedInternshipQuery query)
    {
        if (db.Database.IsSqlServer()) {
            var filtered = await ReadQueryAsync(query);
            var count = await filtered.CountAsync();
            var page = await filtered.OrderBy(x => x.MaDot).ThenBy(x => x.MaSV).Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync();
            return new(count, query.Page, query.PageSize, page.Select(x => x.ToDto()).ToList());
        }
        var rows = await Load(query);
        return new(rows.Count, query.Page, query.PageSize, rows.Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToList());
    }

    public async Task<List<FailedInternshipRow>> ExportAsync(FailedInternshipQuery query)
    {
        var rows = db.Database.IsSqlServer()
            ? (await (await ReadQueryAsync(query)).OrderBy(x => x.MaDot).ThenBy(x => x.MaSV).Take(10_001).ToListAsync()).Select(x => x.ToDto()).ToList()
            : await Load(query);
        if (rows.Count > 10_000) throw new ArgumentException("Tối đa 10.000 dòng mỗi lần xuất; chọn thêm bộ lọc.");
        return rows;
    }

    public async Task<object> DetailAsync(string round, string student, string source = "TuDong")
    {
        var row = (db.Database.IsSqlServer()
            ? (await (await ReadQueryAsync(new(MaDot: round, Nguon: source), student)).SingleOrDefaultAsync())?.ToDto()
            : (await Load(new(MaDot: round, Nguon: source))).SingleOrDefault(x => x.MaSV == student))
            ?? throw new KeyNotFoundException("SV không thuộc danh sách rớt thực tập của nguồn đã chọn.");
        object? current = null;
        try { current = await tracking.DetailAsync(round, student); }
        catch (KeyNotFoundException) when (row.NguonDuLieu == "BanChot") { /* The archived result remains readable if a current operational record is missing. */ }
        var reports = await db.TienDoThucTaps.AsNoTracking().Where(x => x.MaSV == student && x.MaDot == round).OrderBy(x => x.MocThoiGian)
            .Select(x => new { x.MaTienDo, x.MocThoiGian, x.HanNopBoSung, x.TrangThaiDuyet, x.NgayNop }).ToListAsync();
        var forms = await db.PhieuChamDiems.AsNoTracking().Where(x => x.MaSV == student && x.MaDot == round)
            .Select(x => new { x.MaPhieu, x.MaDot, x.MaSV, TongDiemDaLuu = x.TongDiem, x.NgayCham, x.NhanXetGV, x.NhanXetDN,
                ChiTiet = x.ChiTietChamDiems.Select(d => new { d.MaTieuChi, d.DiemCham }).ToList() }).ToListAsync();
        var placements = await db.PhanBoThucTaps.AsNoTracking().Include(x => x.CongTy).Where(x => x.MaSinhVien == student && x.MaDot == round)
            .Select(x => new { x.MaPhanBo, x.MaCongTy, x.CongTy.TenCongTy, x.TrangThai, x.DaDuocKhoaDuyet, x.MaPhanBoTruoc }).ToListAsync();
        var assignments = await db.GVHuongDans.AsNoTracking().Where(x => x.MaSinhVien == student && x.MaDot == round)
            .Select(x => new { x.MaSo, x.MaGiangVien, x.GiangVien.HoTen, x.TrangThai }).ToListAsync();
        var placementKeys = placements.Select(x => x.MaPhanBo).ToArray(); var reportKeys = reports.Select(x => x.MaTienDo).ToArray();
        var selfKeys = await db.DeXuatThucTapTuTims.Where(x => x.MaSV == student && x.MaDot == round).Select(x => x.MaHoSo).ToListAsync();
        var documents = await db.StoredDocuments.AsNoTracking().Where(x => x.State == "Ready" && (x.RoundId == round &&
            ((x.Kind == "Progress" && reportKeys.Contains(x.ResourceId)) || (x.Kind == "SelfPlacement" && selfKeys.Contains(x.ResourceId))
                || ((x.Kind == "EnterpriseForm" || x.Kind == "PlacementEvidence") && placementKeys.Contains(x.ResourceId))) || x.Kind == "CV" && x.ResourceId == student))
            .Select(x => new { x.Id, x.Kind, x.ResourceId, x.FileName, x.Size, x.CreatedAt }).ToListAsync();
        return new { KetQua = row, HoSoHienHanh = new { UngTuyenHoTro = current, BaoCao = reports, PhieuDiem = forms, PhanBo = placements, GVHD = assignments, TaiLieu = documents },
            BanChot = row.MaNhatKyChot == null ? null : new { row.MaNhatKyChot, row.PhienBanChot, Url = $"/api/khoa/chot-dot/{Uri.EscapeDataString(round)}/lich-su/{Uri.EscapeDataString(row.MaNhatKyChot)}" },
            LuuY = "HoSoHienHanh là dữ liệu tra cứu hiện tại; kết quả BanChot và tệp JSON lưu trữ là căn cứ tại thời điểm chốt." };
    }
}
