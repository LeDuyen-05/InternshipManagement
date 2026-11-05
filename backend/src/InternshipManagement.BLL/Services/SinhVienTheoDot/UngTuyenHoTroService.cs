using InternshipManagement.BLL.DTOs.SinhVienTheoDot;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.SinhVienTheoDot;

public record UngTuyenHoTroQuery(string MaDot, string? Search = null, string? Lop = null, string? KetQua = null,
    string? TinhTrangNoi = null, bool? CanHoTro = null, int Page = 1, int PageSize = 20);
public record HoTroActions(bool CoTheHoTroTiep, bool CoTheTheoDoiXacNhan, string? LyDoBiChan, bool CoTheXacNhanTuChoi = false, int PhienBanChot = 0);
public record UngTuyenItem(string MaDK, string MaCongTy, string TenCongTy, string? MaViTri, string? ViTri,
    DateTime NgayDangKy, int LanDangKy, string? MaLanHoTro, string TrangThai, string KetQua,
    string? MaPV, string? LyDo, string? NguonKetQua);
public record HoTroSessionItem(string MaLan, string TenLan, DateTime NgayHoTro, int PhienBan, HoTroMember SinhVien);
public record TheoDoiUngTuyenRow(string MaSV, string HoTen, string? Lop, string MaDot, string NamHoc, string? MaLoaiThucTap,
    UngTuyenItem? UngTuyenGanNhat, int SoLanRotUngTuyen, int SoLanUngTuyen, int SoLanHoTro,
    HoTroSessionItem? LanHoTroHienTai, string TinhTrangNoi, bool CanHoTroTiep, int SoHoSoChoKetQua,
    bool CoUngTuyenDat, HoTroActions Actions, List<UngTuyenItem> UngTuyens, DAL.Common.SupportReply? PhanHoiHoTro = null)
{
    public int SoLanDatUngTuyen => UngTuyens.Count(x => x.KetQua == "Dat");
    public int SoLanVangPhongVan => UngTuyens.Count(x => x.KetQua == "Vang");
    public int SoHoSoKetThucKhac => UngTuyens.Count(x => x.KetQua == "DaKetThuc");
}
public record HoTroSummary(int TongSinhVien, int ChuaCoNoi, int ChoKetQua, int DatChoXacNhan, int CanHoTroTiep, int DaCoNoi);
public record UngTuyenHoTroResponse(string MaDot, int TotalCount, int Page, int PageSize, HoTroSummary ThongKe, List<TheoDoiUngTuyenRow> Items);

public class UngTuyenHoTroService(AppDbContext db, SinhVienTheoDotService roster, TimeProvider clock)
{
    private static readonly string[] Outcomes = ["Dat", "KhongDat", "ChuaCoKetQua", "Vang", "DaKetThuc"];
    private static readonly string[] Places = ["ChuaCoNoi", "ChoXacNhan", "DaCoNoi", "KhongHoanTat", "CanKiemTra"];

    public async Task<object> RegistrationContextAsync(string maDot, string maSV)
    {
        var round = await db.DotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaSo == maDot)
            ?? throw new KeyNotFoundException("Không tìm thấy đợt.");
        var now = clock.GetUtcNow();
        var apps = await db.DangKyThucTaps.AsNoTracking().Where(x => x.MaDot == maDot && x.MaSV == maSV).ToListAsync();
        var active = apps.Where(x => x.TrangThai is "ChoDuyet" or "DaDuyet").ToList();
        var state = await db.ChotDotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaDot == maDot);
        var sessions = await db.LanHoTroThucTaps.AsNoTracking().Where(x => x.MaDot == maDot && x.TrangThai != "DaXoa").OrderByDescending(x => x.NgayHoTro).ThenBy(x => x.MaLan).ToListAsync();
        var memberSessions = sessions.Where(s => LanHoTroService.Members(s).Any(m => m.MaSV == maSV && m.KetQua != "DaCoNoi")).ToList();
        var reply = DAL.Common.SupportConsent.Latest(sessions, maSV);
        var validSessions = memberSessions.Where(s => s.NgayHoTro.Date <= now.ToOffset(TimeSpan.FromHours(7)).Date
            && (DAL.Common.SupplementalRegistration.Remaining(s, maSV, apps, now) > 0
                || apps.Count < 3 && active.All(a => a.MaLanHoTro == s.MaLan)
                && (!apps.Any(a => a.MaLanHoTro == s.MaLan) || apps.First(a => a.MaLanHoTro == s.MaLan).LanDangKy >= apps.Max(a => a.LanDangKy)))).ToList();
        var allowedSupport = true;
        try { LanHoTroService.CheckRound(round, now.ToOffset(TimeSpan.FromHours(7)).Date); }
        catch (InvalidOperationException) { allowedSupport = false; }
        if (!allowedSupport) validSessions.Clear();
        var availableBase = !apps.Any(x => x.MaLanHoTro != null) && apps.Count < 3;
        var reason = round.TrangThai != "DangDienRa" ? "Đợt không mở đăng ký."
            : AppDbContext.LockStatus(state, now) != "ChuaChot" ? "Đợt đã chốt/khóa."
            : await db.KhongHoanTatDots.AnyAsync(x => x.MaSV == maSV && x.MaDot == maDot && x.HieuLuc) ? "Đã xác nhận không hoàn tất; cần Khoa rà hồ sơ."
            : reply?.PhanHoi == "TuChoiHoTro" ? "SV đã từ chối hỗ trợ; cần xác nhận nhận hỗ trợ lại."
            : await db.PhanBoThucTaps.AnyAsync(x => x.MaSinhVien == maSV && x.MaDot == maDot && x.TrangThai != "Huy") ? "SV đã có nơi tiếp nhận."
            : active.Count > 0 ? "Bạn đang có một hồ sơ ứng tuyển chờ xử lý. Chỉ đăng ký công ty khác khi hồ sơ trước đã kết thúc."
            : apps.Count >= 3 && validSessions.Count == 0 ? "Đã hết lượt đăng ký thông thường hoặc bổ sung. Liên hệ Khoa để được rà soát hỗ trợ."
            : !availableBase && validSessions.Count == 0 ? "Cần Khoa tạo lần hỗ trợ tiếp hợp lệ hoặc rà hồ sơ đang xét." : null;
        return new { MaDot = maDot, DuocDangKy = reason == null, LyDo = reason,
            CoTheDangKyLanDau = reason == null && availableBase,
            ThuTuUuTienConTrong = reason == null ? new[] { apps.Count + 1 } : Array.Empty<int>(),
            CacLanHoTro = validSessions.Select(s => new { s.MaLan, s.TenLan, s.NgayHoTro, s.PhienBan,
                LanDangKy = apps.Any(a => a.MaLanHoTro == s.MaLan) ? apps.First(a => a.MaLanHoTro == s.MaLan).LanDangKy : apps.Select(a => a.LanDangKy).DefaultIfEmpty(0).Max() + 1,
                SoLuotConLai = apps.Count < 3 ? 3 - apps.Count : DAL.Common.SupplementalRegistration.Remaining(s, maSV, apps, now),
                DangKyBoSung = DAL.Common.SupplementalRegistration.Read(s, maSV) }).ToList(),
            LuuY = "Mỗi lần chỉ ứng tuyển một công ty; có 3 lượt thông thường. Lượt bổ sung phải được Khoa chấp thuận riêng, có hạn; công ty vẫn phải còn thời hạn và chỉ tiêu." };
    }

    public async Task<UngTuyenHoTroResponse> ListAsync(UngTuyenHoTroQuery query)
    {
        if (query.Page < 1 || query.PageSize is < 1 or > 100 || query.Page > 1_000_000)
            throw new ArgumentException("Trang phải dương, kích thước trang từ 1 đến 100.");
        if (query.KetQua != null && !Outcomes.Contains(query.KetQua) || query.TinhTrangNoi != null && !Places.Contains(query.TinhTrangNoi))
            throw new ArgumentException("Bộ lọc kết quả ứng tuyển/tình trạng nơi không hợp lệ.");
        if (string.IsNullOrWhiteSpace(query.MaDot)) throw new ArgumentException("Chọn đợt thực tập.");
        if (!await db.DotThucTaps.AnyAsync(x => x.MaSo == query.MaDot)) throw new KeyNotFoundException("Không tìm thấy đợt thực tập.");
        var filtered = UngTuyenReadQuery.Build(db, roster.StudentIds(query.MaDot), query);
        // Count filtered keys: SQL Server rejects aggregate CASE expressions containing correlated subqueries.
        var total = await filtered.CountAsync();
        var noPlace = await filtered.CountAsync(x => x.TinhTrangNoi == "ChuaCoNoi");
        var waiting = await filtered.CountAsync(x => x.ChoKetQua > 0);
        var accepted = await filtered.CountAsync(x => x.CoUngTuyenDat && x.TinhTrangNoi != "DaCoNoi");
        var support = await filtered.CountAsync(x => x.CanHoTro);
        var placed = await filtered.CountAsync(x => x.TinhTrangNoi == "DaCoNoi");
        var keys = await filtered.OrderBy(x => x.MaSV).Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).Select(x => x.MaSV).ToListAsync();
        var rows = keys.Count == 0 ? [] : (await LoadAsync(query.MaDot, keys)).Rows;
        var byKey = rows.ToDictionary(x => x.MaSV, StringComparer.OrdinalIgnoreCase);
        return new(query.MaDot, total, query.Page, query.PageSize,
            new(total, noPlace, waiting, accepted, support, placed),
            keys.Where(byKey.ContainsKey).Select(id => byKey[id]).ToList());
    }

    public async Task<object> DetailAsync(string maDot, string maSV)
    {
        var data = await LoadAsync(maDot, [maSV]);
        var row = data.Rows.SingleOrDefault(x => x.MaSV == maSV) ?? throw new KeyNotFoundException("SV không thuộc đợt đang chọn.");
        var history = await db.NhatKyPhongVans.AsNoTracking().Where(x => db.DangKyThucTaps.Any(a => a.MaDK == x.MaDK && a.MaSV == maSV && a.MaDot == maDot))
            .OrderBy(x => x.ThoiDiem).Select(x => new { x.MaDK, x.MaPV, x.Loai, x.KetQuaCu, x.KetQuaMoi, x.LyDo, x.Nguon, x.ThoiDiem, x.MaPVMoi }).ToListAsync();
        return new { SinhVien = row, row.UngTuyens, CacLanHoTro = data.Sessions.GetValueOrDefault(maSV) ?? [], LichSuPhongVan = history,
            NoiThucTap = data.Roster.Single(x => x.MaSV == maSV), row.Actions };
    }

    private async Task<(List<TheoDoiUngTuyenRow> Rows, Dictionary<string, List<HoTroSessionItem>> Sessions, List<SinhVienTheoDotDto> Roster)> LoadAsync(string maDot, IReadOnlyCollection<string> scope)
    {
        if (string.IsNullOrWhiteSpace(maDot)) throw new ArgumentException("Chọn đợt thực tập.");
        var round = await db.DotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaSo == maDot)
            ?? throw new KeyNotFoundException("Không tìm thấy đợt thực tập.");
        var students = (await roster.GetAsync(maDot, scope)).SinhViens;
        var applications = await db.DangKyThucTaps.AsNoTracking().Include(x => x.CongTy).Where(x => x.MaDot == maDot && scope.Contains(x.MaSV)).ToListAsync();
        var interviews = await db.PhongVans.AsNoTracking().Where(x => x.MaDK != null && db.DangKyThucTaps.Any(a => a.MaDK == x.MaDK && a.MaDot == maDot && scope.Contains(a.MaSV))).ToListAsync();
        var replaced = interviews.Where(x => x.MaPVTruoc != null).Select(x => x.MaPVTruoc!).ToHashSet();
        var byApplication = interviews.Where(x => !replaced.Contains(x.MaPV)).ToLookup(x => x.MaDK!);
        var byStudent = applications.ToLookup(x => x.MaSV);
        var sessionQuery = db.LanHoTroThucTaps.AsNoTracking();
        if (db.Database.IsSqlServer()) {
            var keysJson = System.Text.Json.JsonSerializer.Serialize(scope);
            sessionQuery = db.LanHoTroThucTaps.FromSqlInterpolated($"SELECT l.* FROM LANHOTROTHUCTAP AS l WHERE l.MaDot = {maDot} AND EXISTS (SELECT 1 FROM OPENJSON(l.DanhSachJson) AS m INNER JOIN OPENJSON({keysJson}) AS k ON JSON_VALUE(m.value, '$.MaSV') = k.value)").AsNoTracking();
        }
        var sessions = await sessionQuery.Where(x => x.MaDot == maDot && x.TrangThai != "DaXoa")
            .OrderBy(x => x.NgayHoTro).ThenBy(x => x.MaLan).ToListAsync();
        var memberSessions = sessions.SelectMany(s => LanHoTroService.Members(s).Where(m => scope.Contains(m.MaSV)).Select(m => new HoTroSessionItem(s.MaLan, s.TenLan, s.NgayHoTro, s.PhienBan, m)))
            .GroupBy(x => x.SinhVien.MaSV).ToDictionary(g => g.Key, g => g.ToList());
        var state = await db.ChotDotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaDot == maDot);
        string? blocked = null;
        try { LanHoTroService.CheckRound(round, clock.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).Date); }
        catch (InvalidOperationException e) { blocked = e.Message; }
        if (AppDbContext.LockStatus(state, clock.GetUtcNow()) != "ChuaChot") blocked = "Đợt đã chốt kết quả; chỉ xem lịch sử.";
        var rows = new List<TheoDoiUngTuyenRow>();
        foreach (var student in students)
        {
            var attempts = byStudent[student.MaSV].OrderByDescending(x => x.NgayDangKy).ThenByDescending(x => x.MaDK, StringComparer.Ordinal)
                .Select(a =>
                {
                    var interview = byApplication[a.MaDK].OrderByDescending(x => x.NgayPV).ThenByDescending(x => x.MaPV, StringComparer.Ordinal).FirstOrDefault();
                    var outcome = Outcome(a, interview);
                    var closedWithoutInterview = a.TrangThai == "TuChoi" && a.MaPVKetThuc == null;
                    return new UngTuyenItem(a.MaDK, a.MaCongTy, a.CongTy?.TenCongTy ?? a.MaCongTy, a.MaViTri, a.ViTriDangKy,
                        a.NgayDangKy, a.LanDangKy, a.MaLanHoTro, a.TrangThai, outcome, interview?.MaPV,
                        closedWithoutInterview ? a.LyDoKetThuc : interview?.LyDoKetQua ?? a.LyDoKetThuc,
                        closedWithoutInterview ? a.KetQuaHoSo == "KhongDat" ? "DoanhNghiep" : null : interview?.NguonKetQua);
                }).ToList();
            var place = student.CoPhanBoChinhThuc ? "DaCoNoi" : student.TrangThai == "KhongHoanTat" ? "KhongHoanTat"
                : student.TrangThai is "ChoCongNhan" or "ChoSVXacNhan" or "ChoKhoaChot" ? "ChoXacNhan"
                : student.TrangThai is "CanKiemTra" or "CanXuLyLai" ? "CanKiemTra" : "ChuaCoNoi";
            var waiting = attempts.Count(x => x.KetQua == "ChuaCoKetQua");
            var accepted = attempts.Any(x => x.KetQua == "Dat");
            var needsHelp = place == "ChuaCoNoi" && waiting == 0 && !accepted;
            var canSupport = needsHelp && student.TrangThai is "ChuaDangKy" or "ChuaCoNoiTiepNhan";
            var history = memberSessions.GetValueOrDefault(student.MaSV) ?? [];
            var reply = DAL.Common.SupportConsent.Latest(sessions, student.MaSV);
            var declined = reply?.PhanHoi == "TuChoiHoTro";
            var reason = blocked ?? (declined ? "SV đã từ chối hỗ trợ; Khoa rà phản hồi và tình trạng nơi trước khi xác nhận kết quả." : !canSupport ? "SV có nơi/hồ sơ đang xử lý hoặc cần rà soát trước khi hỗ trợ." : null);
            rows.Add(new(student.MaSV, student.HoTen, student.Lop, maDot, round.NamHoc, round.MaLoaiThucTap,
                attempts.FirstOrDefault(), attempts.Count(x => x.KetQua == "KhongDat"), attempts.Count, history.Count,
                history.LastOrDefault(), place, needsHelp, waiting, accepted,
                new(canSupport && blocked == null && !declined, place == "ChoXacNhan", reason, canSupport && blocked == null && declined, state?.PhienBan ?? 0), attempts, reply));
        }
        return (rows, memberSessions, students);
    }

    public static string Outcome(DAL.Entities.DangKyThucTap application, DAL.Entities.PhongVan? interview)
    {
        // A manually closed/withdrawn application is not an interview failure, even if it has an old appointment.
        if (application.TrangThai == "TuChoi" && application.MaPVKetThuc == null)
            return application.KetQuaHoSo == "KhongDat" ? "KhongDat" : "DaKetThuc";
        if (interview?.KetQua is "Dat" or "KhongDat" or "Vang") return interview.KetQua;
        return application.TrangThai is "ChoDuyet" or "DaDuyet" ? "ChuaCoKetQua" : "DaKetThuc";
    }
}
