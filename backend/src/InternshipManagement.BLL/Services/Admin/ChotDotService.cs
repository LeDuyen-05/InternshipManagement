using System.Text.Json;
using System.Text.Json.Serialization;
using InternshipManagement.BLL.Common;
using InternshipManagement.BLL.Services.SinhVienTheoDot;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.Admin;

public record ChotDotRequest(int PhienBan, string LyDo);
public record MoLaiDotRequest(int PhienBan, string LyDo, DateTimeOffset HanMoLai);
public record KhongHoanTatRequest(int PhienBan, string LyDo, string CanCu, bool ThuHoi = false, bool DaXacMinhKhongHoanTat = false);
public record TrangThaiChotDotDto(string MaDot, string TrangThai, int PhienBan, DateTimeOffset? HanMoLai);
public record SinhVienChotDotDto(string MaSV, string HoTen, string? Lop, string KetQua, bool DuDiem, bool ThieuDN,
    bool ThieuGV, bool KhongHoanTat, bool CoTheXacNhanKhongHoanTat, decimal? TongDiem, List<string> Loi,
    string? LyDoKhongHoanTat, string? CanCuKhongHoanTat, bool TruocChotDanhSach = false);
public record RaSoatChotDotDto(string MaDot, string TenDot, TrangThaiChotDotDto Khoa, List<string> Loi,
    List<SinhVienChotDotDto> SinhViens, bool CoTheChot);

public class ChotDotService(AppDbContext db, SinhVienTheoDotService roster, TimeProvider clock)
{
    private DateTimeOffset Now => clock.GetUtcNow();
    private DateTime Today => Now.ToOffset(TimeSpan.FromHours(7)).Date;
    private static string Text(string? text, string label) => !string.IsNullOrWhiteSpace(text) && text.Trim().Length <= 1000
        ? text.Trim() : throw new ArgumentException($"{label} bắt buộc, tối đa 1.000 ký tự.");
    private async Task<DotThucTap> Round(string id) => await db.DotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaSo == id)
        ?? throw new KeyNotFoundException("Không tìm thấy đợt thực tập.");

    public async Task<TrangThaiChotDotDto> StatusAsync(string id)
    {
        await Round(id);
        var state = await db.ChotDotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaDot == id);
        return new(id, AppDbContext.LockStatus(state, Now), state?.PhienBan ?? 0, state?.HanMoLai);
    }

    public async Task<RaSoatChotDotDto> PreviewAsync(string id)
    {
        var round = await Round(id);
        var status = await StatusAsync(id);
        var list = await roster.GetAsync(id);
        var rubric = await db.TieuChis.AsNoTracking().Where(x => x.MaRubric == round.MaRubric && x.NhomDanhGia != null).ToListAsync();
        var forms = await db.PhieuChamDiems.AsNoTracking().Include(x => x.ChiTietChamDiems).Where(x => x.MaDot == id).ToListAsync();
        var placements = await db.PhanBoThucTaps.AsNoTracking().Include(x => x.HoSoTuTim).Where(x => x.MaDot == id).ToListAsync();
        var exceptions = await db.KhongHoanTatDots.AsNoTracking().Where(x => x.MaDot == id && x.HieuLuc).ToListAsync();
        var pendingApps = await db.DangKyThucTaps.AsNoTracking().Where(x => x.MaDot == id && (x.TrangThai == "ChoDuyet" || x.TrangThai == "DaDuyet")).ToListAsync();
        var pendingSelf = await db.DeXuatThucTapTuTims.AsNoTracking().Where(x => x.MaDot == id && x.TrangThai == "ChoDuyet").Select(x => x.MaSV).ToListAsync();
        var errors = new List<string>();
        if (Today <= round.ThoiGianKT.Date) errors.Add("Chưa hết ngày kết thúc thực tập của đợt (UTC+7).");
        if (list.SinhViens.Count == 0) errors.Add("Đợt chưa có danh sách SV tham gia để chốt điểm.");
        var rows = new List<SinhVienChotDotDto>();
        foreach (var student in list.SinhViens)
        {
            var ownForms = forms.Where(x => x.MaSV == student.MaSV).ToList();
            var result = CloResult.Evaluate(rubric, ownForms.Count == 1 ? ownForms[0].ChiTietChamDiems : []);
            var active = placements.Where(x => x.MaSinhVien == student.MaSV && x.TrangThai != "Huy").ToList();
            var exception = exceptions.SingleOrDefault(x => x.MaSV == student.MaSV);
            // Đơn DaDuyet đã dẫn tới phân bổ chính thức là lịch sử thành công, không phải hồ sơ chờ.
            var pending = pendingApps.Any(a => a.MaSV == student.MaSV && !active.Any(p => p.DaDuocKhoaDuyet
                && p.MaCongTy == a.MaCongTy && p.TrangThai is "DangThucTap" or "HoanThanh")) || pendingSelf.Contains(student.MaSV);
            var actual = active.Count == 1 ? PlacementPeriod.Resolve(active[0], round) : default;
            var settledPlacement = active.Count == 0 || (active.Count == 1 && active[0].DaDuocKhoaDuyet
                && active[0].TrangThai is ("DangThucTap" or "HoanThanh") && actual.Start.HasValue && actual.End.HasValue
                && actual.Start.Value != default && actual.End >= actual.Start && Today > actual.End.Value.Date);
            var canConfirm = Today > round.ThoiGianKT.Date && settledPlacement && !pending && !result.Complete
                && placements.Any(p => p.MaSinhVien == student.MaSV);
            if (exception?.TruocChotDanhSach == true) canConfirm = false;
            var issues = new List<string>();
            if (ownForms.Count > 1) issues.Add("Có nhiều phiếu điểm trong cùng đợt.");
            if (pending) issues.Add("Còn hồ sơ đăng ký/tự tìm chờ xử lý; Khoa phải giải quyết trước khi chốt.");
            if (exception is not null)
            {
                var validPreRoster = exception.TruocChotDanhSach && active.Count == 0 && !pending && ownForms.Count == 0;
                if (!canConfirm && !validPreRoster) issues.Add("Xác nhận không hoàn tất không còn phù hợp; cần rà lại hồ sơ.");
            }
            else
            {
                if (active.Count != 1 || !active[0].DaDuocKhoaDuyet || active[0].TrangThai is not ("DangThucTap" or "HoanThanh"))
                    issues.Add("Chưa có một phân bổ chính thức duy nhất; cần xử lý hồ sơ hoặc xác nhận không hoàn tất.");
                else
                {
                    var period = PlacementPeriod.Resolve(active[0], round);
                    if (!period.Start.HasValue || !period.End.HasValue || period.Start.Value == default || period.End.Value < period.Start.Value)
                        issues.Add("Chưa xác minh khoảng ngày thực tập tại DN hợp lệ.");
                    else if (Today <= period.End.Value.Date) issues.Add("Chưa hết ngày thực tập thực tế tại DN.");
                }
                if (!result.EnterpriseComplete) issues.Add("Thiếu/sai điểm DN hoặc rubric nhóm DN.");
                if (!result.LecturerComplete) issues.Add("Thiếu/sai điểm GVHD hoặc rubric nhóm GV.");
                if (!result.Complete && result.EnterpriseComplete && result.LecturerComplete) issues.Add("Rubric/phiếu điểm không hợp lệ.");
            }
            rows.Add(new(student.MaSV, student.HoTen, student.Lop, exception is not null ? "Không hoàn tất đợt" : result.Outcome,
                result.Complete, !result.EnterpriseComplete, !result.LecturerComplete, exception is not null,
                canConfirm, exception is null ? result.Total : null, issues, exception?.LyDo, exception?.CanCu, exception?.TruocChotDanhSach == true));
        }
        if (exceptions.Any(x => rows.All(r => r.MaSV != x.MaSV))) errors.Add("Xác nhận không hoàn tất nằm ngoài danh sách tham gia; cần rà dữ liệu.");
        return new(id, round.TenDot, status, errors, rows,
            status.TrangThai != "DaChot" && errors.Count == 0 && rows.All(x => x.Loi.Count == 0));
    }

    private async Task<ChotDotThucTap> State(string id, int expected)
    {
        await Round(id);
        var state = await db.ChotDotThucTaps.SingleOrDefaultAsync(x => x.MaDot == id);
        if ((state?.PhienBan ?? 0) != expected) throw new DbUpdateConcurrencyException();
        if (state is null) state = new() { MaDot = id };
        return state;
    }
    private void Stamp(ChotDotThucTap state, string actor, string reason, string type, object content)
    {
        if (string.IsNullOrWhiteSpace(actor) || actor.Length > 20) throw new UnauthorizedAccessException();
        state.PhienBan++; state.NguoiCapNhat = actor; state.NgayCapNhat = Now; state.LyDo = reason;
        if (db.Entry(state).State == EntityState.Detached) db.ChotDotThucTaps.Add(state);
        db.NhatKyChotDots.Add(new() { MaDot = state.MaDot, PhienBan = state.PhienBan, Loai = type,
            NguoiThucHien = actor, ThoiDiem = Now, LyDo = reason,
            NoiDung = JsonSerializer.Serialize(content, new JsonSerializerOptions { ReferenceHandler = ReferenceHandler.IgnoreCycles }) });
    }

    public async Task ConfirmNonCompletionAsync(string id, string student, KhongHoanTatRequest request, string actor)
    {
        var reason = Text(request.LyDo, "Lý do"); var evidence = Text(request.CanCu, "Căn cứ");
        if (!request.ThuHoi && !request.DaXacMinhKhongHoanTat)
            throw new ArgumentException("Khoa phải xác nhận đã xác minh SV thực sự bỏ/dừng/chưa có nơi; không dùng xác nhận này để bỏ qua điểm DN/GVHD đang chờ.");
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync() : null;
        await db.LockRoundsAsync([id]);
        var state = await State(id, request.PhienBan);
        if (AppDbContext.LockStatus(state, Now) is not ("ChuaChot" or "MoLai")) throw new RoundLockedException("Đợt đang khóa; Khoa phải mở lại trước khi điều chỉnh xác nhận.");
        var preview = await PreviewAsync(id);
        var row = preview.SinhViens.SingleOrDefault(x => x.MaSV == student) ?? throw new KeyNotFoundException("SV không thuộc danh sách tham gia đợt.");
        var item = await db.KhongHoanTatDots.SingleOrDefaultAsync(x => x.MaDot == id && x.MaSV == student);
        if (item?.TruocChotDanhSach == true)
            throw new InvalidOperationException("Xác nhận chưa có nơi thuộc bước rà trước chốt danh sách; không sửa/thu hồi từ luồng chốt điểm cuối đợt.");
        if (!await db.PhanBoThucTaps.AnyAsync(p => p.MaDot == id && p.MaSinhVien == student))
            throw new InvalidOperationException("SV chưa từng có nơi trong đợt phải được rà trước chốt danh sách và trước ngày bắt đầu; không xử lý muộn qua luồng chốt điểm.");
        if (!request.ThuHoi && !row.CoTheXacNhanKhongHoanTat)
            throw new InvalidOperationException("Chỉ xác nhận không hoàn tất sau khi hết thời gian thực tập, không còn hồ sơ chờ/mâu thuẫn và chưa có kết quả điểm đầy đủ. Phải xác minh ngày tại DN nếu vẫn còn phân bổ; không dùng xác nhận này để bỏ qua thiếu điểm đang chờ.");
        if (request.ThuHoi && item is not { HieuLuc: true }) throw new InvalidOperationException("Không có xác nhận hiệu lực để thu hồi.");
        if (item is null) { item = new() { MaDot = id, MaSV = student }; db.KhongHoanTatDots.Add(item); }
        var before = item.HieuLuc && item.NgayXacNhan != default ? new { item.LyDo, item.CanCu, item.NguoiXacNhan, item.NgayXacNhan } : null;
        item.HieuLuc = !request.ThuHoi; item.LyDo = reason; item.CanCu = evidence; item.NguoiXacNhan = actor; item.NgayXacNhan = Now;
        Stamp(state, actor, reason, request.ThuHoi ? "ThuHoiKhongHoanTat" : "KhongHoanTat", new { MaSV = student, Truoc = before, Sau = item });
        await db.SaveRoundControlAsync();
        if (tx is not null) await tx.CommitAsync();
    }

    public async Task CloseAsync(string id, ChotDotRequest request, string actor)
    {
        var reason = Text(request.LyDo, "Lý do/xác nhận chốt");
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync() : null;
        await db.LockRoundsAsync([id]);
        var state = await State(id, request.PhienBan);
        var preview = await PreviewAsync(id);
        if (!preview.CoTheChot) throw new InvalidOperationException("Chưa thể chốt đợt: " + string.Join("; ", preview.Loi.Concat(preview.SinhViens.Where(x => x.Loi.Count > 0).Take(8).Select(x => x.MaSV + ": " + string.Join(", ", x.Loi)))));
        var round = await Round(id);
        // Bản chốt chứa dữ liệu và tên tại thời điểm xác nhận, không phụ thuộc danh mục dùng chung sau này.
        var snapshot = new
        {
            Dot = round, SinhViens = preview.SinhViens,
            Rubric = await db.TieuChis.AsNoTracking().Where(x => x.MaRubric == round.MaRubric).ToListAsync(),
            PhieuDiem = await db.PhieuChamDiems.AsNoTracking().Include(x => x.ChiTietChamDiems).Where(x => x.MaDot == id).ToListAsync(),
            PhanBo = await db.PhanBoThucTaps.AsNoTracking().Include(x => x.CongTy).Include(x => x.HoSoTuTim).Where(x => x.MaDot == id).ToListAsync(),
            HuongDan = await db.GVHuongDans.AsNoTracking().Include(x => x.GiangVien).Where(x => x.MaDot == id).ToListAsync(),
            BaoCao = await db.TienDoThucTaps.AsNoTracking().Where(x => x.MaDot == id).ToListAsync(),
            KhongHoanTat = await db.KhongHoanTatDots.AsNoTracking().Where(x => x.MaDot == id && x.HieuLuc).ToListAsync()
        };
        state.TrangThai = "DaChot"; state.HanMoLai = null;
        Stamp(state, actor, reason, "Chot", snapshot);
        await db.SaveRoundControlAsync();
        if (tx is not null) await tx.CommitAsync();
    }

    public async Task ReopenAsync(string id, MoLaiDotRequest request, string actor)
    {
        var reason = Text(request.LyDo, "Lý do mở lại");
        if (request.HanMoLai <= Now) throw new ArgumentException("Hạn mở lại phải sau thời điểm hiện tại.");
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync() : null;
        await db.LockRoundsAsync([id]);
        var state = await State(id, request.PhienBan);
        if (AppDbContext.LockStatus(state, Now) is not ("DaChot" or "ChoChotLai")) throw new InvalidOperationException("Chỉ mở lại khi đã chốt hoặc đang chờ chốt lại.");
        state.TrangThai = "MoLai"; state.HanMoLai = request.HanMoLai.ToOffset(TimeSpan.FromHours(7));
        Stamp(state, actor, reason, "MoLai", new { PhamVi = "DiemBaoCao", state.HanMoLai });
        await db.SaveRoundControlAsync();
        if (tx is not null) await tx.CommitAsync();
    }

    public async Task<object> HistoryAsync(string id)
    {
        await Round(id);
        return await db.NhatKyChotDots.AsNoTracking().Where(x => x.MaDot == id).OrderByDescending(x => x.ThoiDiem)
            .Select(x => new { x.MaNhatKy, x.PhienBan, x.Loai, x.NguoiThucHien, x.ThoiDiem, x.LyDo }).ToListAsync();
    }
    public async Task<string> SnapshotAsync(string id, string key)
        => (await db.NhatKyChotDots.AsNoTracking().SingleOrDefaultAsync(x => x.MaDot == id && x.MaNhatKy == key))?.NoiDung
            ?? throw new KeyNotFoundException("Không tìm thấy bản ghi lịch sử của đợt.");
}
