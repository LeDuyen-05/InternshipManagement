using System.Data;
using System.Text.Json;
using InternshipManagement.BLL.Common;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Common;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.SinhVienTheoDot;

public record CongBoDuKienRequest(string TieuDe, string NoiDung, DateTimeOffset HanPhanHoi);
public record ThongTinCongTyMoi(string TenCongTy, string? DiaChi, string? MaSoThue);
public record GuiPhanHoiDanhSachRequest(string MaCongBo, bool ThongTinDung, string? NoiDung, int PhienBanPhanHoi,
    ThongTinCongTyMoi? ThongTinMoi = null, int PhienBanThongTin = 0);
public record XuLyYeuCauDanhSachRequest(string MaCongBo, bool ChapThuan, string LyDo, int PhienBanRaSoat);
public record ChotDanhSachChinhThucRequest(string MaCongBo, int PhienBanRaSoat, string LyDo, bool DaRaSoat, int PhienBanRaSoatNoi = 0);
public record DongDanhSachDuKien(string MaSV, string HoTen, string? Lop, bool CoNoiThucTap, string? MaPhanBo,
    string? MaCongTy, string? TenCongTy, string? ViTri, DateTime? NgayBatDau, DateTime? NgayKetThuc, string TinhTrang,
    string? DiaChiCongTy = null, string? MaSoThue = null);

public class CongBoDanhSachService(AppDbContext db, SinhVienTheoDotService roster, TimeProvider? clock = null)
{
    private readonly TimeProvider time = clock ?? TimeProvider.System;
    private DateTime Today => time.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).Date;
    private static List<DongDanhSachDuKien> Rows(CongBoDanhSachThucTap publication)
        => JsonSerializer.Deserialize<List<DongDanhSachDuKien>>(publication.DanhSachJson)!;
    private static string Text(string? value, string label, int limit, bool required = true)
    {
        var result = value?.Trim() ?? "";
        if ((required && result.Length == 0) || result.Length > limit) throw new ArgumentException($"{label} {(required ? "bắt buộc, " : "")}tối đa {limit} ký tự.");
        return result;
    }
    private static void Actor(string actor) { if (string.IsNullOrWhiteSpace(actor) || actor.Length > 20) throw new UnauthorizedAccessException(); }
    private async Task<DotThucTap> Round(string maDot, bool write = false)
    {
        if (string.IsNullOrWhiteSpace(maDot)) throw new ArgumentException("Chọn đợt thực tập.");
        if (write) await db.LockRoundsAsync(new[] { maDot });
        var round = await db.DotThucTaps.SingleOrDefaultAsync(x => x.MaSo == maDot) ?? throw new KeyNotFoundException("Không tìm thấy đợt.");
        if (write && (round.TrangThai is not ("ChuaBatDau" or "DangDienRa") || Today >= round.ThoiGianBD.Date || round.ThoiGianBD == default || round.ThoiGianKT < round.ThoiGianBD))
            throw new InvalidOperationException("Đã đến ngày bắt đầu thực tập hoặc đợt không còn cho phép công bố/phản hồi.");
        if (write)
        {
            var state = await db.ChotDotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaDot == maDot);
            if (AppDbContext.LockStatus(state, time.GetUtcNow()) != "ChuaChot") throw new InvalidOperationException("Đợt đã chốt kết quả, chỉ được xem.");
        }
        return round;
    }
    private Task<CongBoDanhSachThucTap?> Latest(string maDot) => db.CongBoDanhSachThucTaps.AsNoTracking()
        .Where(x => x.MaDot == maDot).OrderByDescending(x => x.PhienBan).FirstOrDefaultAsync();
    private sealed record ReviewData(List<DongDanhSachDuKien> Rows, List<PhanHoiDanhSachThucTap> Feedback,
        List<XuLyPhanHoiDanhSach> Decisions, DanhSachThucTapChinhThuc? Official)
    {
        public int Revision => Feedback.Count + Decisions.Count;
        public XuLyPhanHoiDanhSach? Decision(string id) => Decisions.SingleOrDefault(d => d.MaPhanHoi == id);
        public bool Pending(string? student = null) => Feedback.Any(f => !f.ThongTinDung && (student == null || f.MaSV == student) && Decision(f.MaPhanHoi) == null);
        public int InfoVersion(string student) => Feedback.Count(f => f.MaSV == student && Decision(f.MaPhanHoi)?.ChapThuan == true);
    }
    private async Task<ReviewData> Review(CongBoDanhSachThucTap publication)
    {
        var feedback = await db.PhanHoiDanhSachThucTaps.AsNoTracking().Where(f => f.MaCongBo == publication.MaCongBo).OrderBy(f => f.LanPhanHoi).ToListAsync();
        var ids = feedback.Select(f => f.MaPhanHoi).ToArray();
        var decisions = await db.XuLyPhanHoiDanhSachs.AsNoTracking().Where(d => d.MaDot == publication.MaDot && ids.Contains(d.MaPhanHoi)).ToListAsync();
        var official = await db.DanhSachThucTapChinhThucs.AsNoTracking().SingleOrDefaultAsync(x => x.MaDot == publication.MaDot);
        var rows = official == null ? Rows(publication) : JsonSerializer.Deserialize<List<DongDanhSachDuKien>>(official.DanhSachJson)!;
        if (official == null)
            foreach (var f in feedback)
            {
                var decision = decisions.SingleOrDefault(d => d.MaPhanHoi == f.MaPhanHoi && d.ChapThuan);
                if (decision != null)
                {
                    var index = rows.FindIndex(r => r.MaSV == f.MaSV);
                    if (index >= 0) rows[index] = JsonSerializer.Deserialize<DongDanhSachDuKien>(decision.ThongTinMoiJson)!;
                }
            }
        return new(rows, feedback, decisions, official);
    }
    private static object? FeedbackView(PhanHoiDanhSachThucTap? f, ReviewData data) => f == null ? null : new
    {
        f.MaPhanHoi, f.MaSV, f.LanPhanHoi, f.ThongTinDung, f.NoiDung, f.NgayGui, f.NguoiGui, f.PhienBanThongTin,
        ThongTinCu = f.ThongTinCuJson == null ? null : JsonSerializer.Deserialize<DongDanhSachDuKien>(f.ThongTinCuJson),
        ThongTinMoi = f.ThongTinMoiJson == null ? null : JsonSerializer.Deserialize<ThongTinCongTyMoi>(f.ThongTinMoiJson),
        XuLy = data.Decision(f.MaPhanHoi),
        TrangThai = f.ThongTinDung ? "XacNhanDung" : data.Decision(f.MaPhanHoi) is { } d ? d.ChapThuan ? "DaChapThuan" : "DaTuChoi" : "ChoXuLy"
    };
    private static ThongTinCongTyMoi ValidateCompany(ThongTinCongTyMoi? info, DongDanhSachDuKien row)
    {
        if (info == null) throw new ArgumentException("Nhập thông tin công ty mới cùng lý do yêu cầu chỉnh sửa.");
        var name = Text(info.TenCongTy, "Tên công ty mới", 500);
        var address = Text(info.DiaChi, "Địa chỉ mới", 1000, !string.IsNullOrWhiteSpace(row.DiaChiCongTy));
        var tax = Text(info.MaSoThue, "Mã số thuế mới", 30, !string.IsNullOrWhiteSpace(row.MaSoThue));
        if (tax.Any(c => !char.IsAsciiDigit(c) && c != '-')) throw new ArgumentException("Mã số thuế chỉ nhập chữ số và dấu gạch nối, tối đa 30 ký tự.");
        if (name == row.TenCongTy && address == (row.DiaChiCongTy ?? "") && tax == (row.MaSoThue ?? ""))
            throw new ArgumentException("Thông tin mới chưa khác thông tin hiện tại.");
        return new(name, address, tax);
    }
    private string? FinalizationBlock(DotThucTap round, CongBoDanhSachThucTap publication, ReviewData data)
    {
        if (round.TrangThaiDanhSachNoi != "DuKien" || data.Official != null) return "Danh sách không ở trạng thái dự kiến hoặc đã chốt chính thức.";
        if (Today >= round.ThoiGianBD.Date || round.TrangThai is not ("ChuaBatDau" or "DangDienRa")) return "Đã đến ngày bắt đầu thực tập hoặc đợt đã đóng.";
        if (data.Pending()) return "Còn yêu cầu báo sai/chỉnh sửa chưa được Khoa xử lý.";
        if (time.GetUtcNow() < publication.HanPhanHoi && data.Rows.Any(r => !data.Feedback.Any(f => f.MaSV == r.MaSV)))
            return "Chưa hết hạn phản hồi và vẫn còn SV chưa phản hồi.";
        return null;
    }
    private async Task<List<DongDanhSachDuKien>> BuildRows(string maDot)
    {
        var students = (await roster.GetAsync(maDot)).SinhViens;
        if (students.Count == 0) throw new InvalidOperationException("Đợt chưa có SV tham gia để công bố.");
        var placements = await db.PhanBoThucTaps.AsNoTracking().Where(x => x.MaDot == maDot && x.TrangThai != "Huy").Include(x => x.ViTri).ToListAsync();
        var outside = await db.DeXuatThucTapTuTims.AsNoTracking().Where(x => x.MaDot == maDot && x.TrangThai == "DaDuyet").ToListAsync();
        if (placements.GroupBy(x => x.MaSinhVien).Any(g => g.Count() > 1)) throw new InvalidOperationException("SV có nhiều nơi hiệu lực; Khoa cần kiểm tra trước khi công bố.");
        if (!students.Any(x => x.CoPhanBoChinhThuc)) throw new InvalidOperationException("Chưa có nơi thực tập chính thức nào; Khoa rà phân bổ trước khi công bố dự kiến.");
        return students.Select(s => new DongDanhSachDuKien(s.MaSV, s.HoTen, s.Lop, s.CoPhanBoChinhThuc,
            s.CoPhanBoChinhThuc ? s.MaPhanBo : null, s.CoPhanBoChinhThuc ? s.MaCongTy : null,
            s.CoPhanBoChinhThuc ? placements.FirstOrDefault(p => p.MaPhanBo == s.MaPhanBo)?.TenCongTyXacNhan ?? s.TenCongTy : null,
            s.CoPhanBoChinhThuc ? placements.FirstOrDefault(p => p.MaPhanBo == s.MaPhanBo)?.ViTri?.TenViTri : null,
            s.NgayBatDauThucTap, s.NgayKetThucThucTap, s.TenTrangThai,
            s.CoPhanBoChinhThuc ? placements.FirstOrDefault(p => p.MaPhanBo == s.MaPhanBo)?.DiaChiCongTyXacNhan ?? outside.FirstOrDefault(t => t.MaPhanBo == s.MaPhanBo)?.DiaChi : null,
            s.CoPhanBoChinhThuc ? placements.FirstOrDefault(p => p.MaPhanBo == s.MaPhanBo)?.MaSoThueCongTyXacNhan : null)).ToList();
    }
    public async Task<object> FacultyGetAsync(string maDot)
    {
        var round = await Round(maDot); var publication = await Latest(maDot);
        var state = await db.ChotDotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaDot == maDot);
        var review = await new RaSoatNoiService(db, roster, time).GetAsync(maDot);
        if (publication == null) return new { MaDot = maDot, TrangThai = round.TrangThaiDanhSachNoi, BanCongBo = (object?)null,
            XemTruoc = (await roster.GetAsync(maDot)).SinhViens,
            CoTheCongBo = round.TrangThaiDanhSachNoi == "ChuaCongBo" && Today < round.ThoiGianBD.Date && round.TrangThai is "ChuaBatDau" or "DangDienRa"
                && AppDbContext.LockStatus(state, time.GetUtcNow()) == "ChuaChot" && review.ChoXuLy == 0,
            LyDoChuaCongBo = review.ChoXuLy > 0 ? "Còn hồ sơ đang ứng tuyển/chờ xác minh hoặc dữ liệu mâu thuẫn; giải quyết trước khi công bố dự kiến." : null };
        var data = await Review(publication); var feedback = data.Feedback.OrderByDescending(f => f.LanPhanHoi).ToList();
        var blocked = FinalizationBlock(round, publication, data);
        if (blocked == null && !review.DaRaSoatHet) blocked = "Còn SV chưa có nơi hoặc hồ sơ chờ xác minh chưa xử lý. Hoàn tất rà soát trước khi chốt.";
        if (AppDbContext.LockStatus(state, time.GetUtcNow()) != "ChuaChot") blocked = "Đợt đã chốt kết quả.";
        return new { MaDot = maDot, TrangThai = round.TrangThaiDanhSachNoi, CoTheCongBo = false,
            PhienBanRaSoat = data.Revision, PhienBanRaSoatNoi = review.PhienBan, CoTheXuLy = round.TrangThaiDanhSachNoi == "DuKien" && Today < round.ThoiGianBD.Date
                && round.TrangThai is "ChuaBatDau" or "DangDienRa" && AppDbContext.LockStatus(state, time.GetUtcNow()) == "ChuaChot",
            CoTheChot = blocked == null, LyDoChuaChot = blocked, BanChinhThuc = data.Official,
            BanCongBo = new { publication.MaCongBo, publication.PhienBan, publication.TieuDe, publication.NoiDung,
                publication.HanPhanHoi, publication.NgayCongBo, publication.NguoiCongBo,
                SinhViens = data.Rows.Select(s => new { ThongTin = s, ThongTinLucCongBo = Rows(publication).Single(r => r.MaSV == s.MaSV),
                    PhanHoi = FeedbackView(feedback.FirstOrDefault(f => f.MaSV == s.MaSV), data),
                    LichSu = feedback.Where(f => f.MaSV == s.MaSV).Select(f => FeedbackView(f, data)).ToList() }) } };
    }
    public async Task<string> PublishAsync(string maDot, CongBoDuKienRequest request, string actor)
    {
        Actor(actor); var title = Text(request.TieuDe, "Tiêu đề", 200); var content = Text(request.NoiDung, "Nội dung thông báo", 2000);
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var round = await Round(maDot, true);
        if (round.TrangThaiDanhSachNoi != "ChuaCongBo" || await Latest(maDot) != null)
            throw new InvalidOperationException("Danh sách đã công bố. Không tạo lại hoặc ghi đè bản đã gửi SV.");
        var start = new DateTimeOffset(DateTime.SpecifyKind(round.ThoiGianBD.Date, DateTimeKind.Unspecified), TimeSpan.FromHours(7));
        if (request.HanPhanHoi <= time.GetUtcNow() || request.HanPhanHoi > start)
            throw new ArgumentException("Hạn phản hồi phải sau thời điểm hiện tại và không sau thời điểm bắt đầu thực tập (giờ VN).");
        if ((await new RaSoatNoiService(db, roster, time).GetAsync(maDot)).ChoXuLy > 0)
            throw new InvalidOperationException("Còn hồ sơ đang ứng tuyển/chờ xác minh hoặc dữ liệu mâu thuẫn. Giải quyết trước khi công bố dự kiến để tránh khóa hồ sơ đang xử lý.");
        var rows = await BuildRows(maDot);
        var publication = new CongBoDanhSachThucTap { MaDot = maDot, TieuDe = title, NoiDung = content, HanPhanHoi = request.HanPhanHoi,
            NgayCongBo = time.GetUtcNow(), NguoiCongBo = actor, DanhSachJson = JsonSerializer.Serialize(rows) };
        db.CongBoDanhSachThucTaps.Add(publication); round.TrangThaiDanhSachNoi = "DuKien";
        // Thông báo chung chỉ có tên/mã đợt và đường dẫn; dữ liệu cá nhân qua API riêng theo token SV.
        db.ThongBaos.Add(new ThongBao { MaThongBao = IdGenerator.New("TB"), TieuDe = title,
            NoiDung = $"Khoa đã công bố danh sách thực tập dự kiến đợt {round.TenDot} ({maDot}). Chọn đúng đợt, mở Bảng điều khiển sinh viên để kiểm tra thông tin và phản hồi trước {request.HanPhanHoi.ToOffset(TimeSpan.FromHours(7)):dd/MM/yyyy HH:mm} (giờ VN).",
            DoiTuong = "SV", LoaiThongBao = "DanhSachDuKien", MaNguoiGui = actor, NgayTao = time.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).DateTime });
        await db.SaveChangesAsync(); if (tx != null) await tx.CommitAsync(); return publication.MaCongBo;
    }
    public async Task<object> StudentGetAsync(string maDot, string maSV)
    {
        if (string.IsNullOrWhiteSpace(maSV)) throw new UnauthorizedAccessException();
        var round = await Round(maDot); var publication = await Latest(maDot);
        if (publication == null) return new { MaDot = maDot, BanCongBo = (object?)null };
        var data = await Review(publication);
        var row = data.Rows.SingleOrDefault(x => x.MaSV == maSV) ?? throw new UnauthorizedAccessException();
        var feedback = data.Feedback.Where(x => x.MaSV == maSV).OrderByDescending(x => x.LanPhanHoi).ToList();
        var state = await db.ChotDotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaDot == maDot);
        return new { MaDot = maDot, TrangThai = round.TrangThaiDanhSachNoi,
            BanCongBo = new { publication.MaCongBo, publication.PhienBan, publication.TieuDe, publication.NoiDung, publication.HanPhanHoi, publication.NgayCongBo,
                ThongTin = row, ThongTinLucCongBo = Rows(publication).Single(r => r.MaSV == maSV),
                PhienBanThongTin = data.InfoVersion(maSV), YeuCauDangCho = data.Pending(maSV),
                ChinhThuc = data.Official == null ? null : new { data.Official.NgayChot, data.Official.NguoiChot },
                PhanHoi = FeedbackView(feedback.FirstOrDefault(), data), LichSu = feedback.Select(f => FeedbackView(f, data)).ToList(),
                CoThePhanHoi = round.TrangThaiDanhSachNoi == "DuKien" && time.GetUtcNow() < publication.HanPhanHoi && Today < round.ThoiGianBD.Date
                    && round.TrangThai is "ChuaBatDau" or "DangDienRa" && AppDbContext.LockStatus(state, time.GetUtcNow()) == "ChuaChot" && !data.Pending(maSV) } };
    }
    public async Task FeedbackAsync(string maDot, string maSV, GuiPhanHoiDanhSachRequest request, string actor)
    {
        Actor(actor); if (string.IsNullOrWhiteSpace(maSV)) throw new UnauthorizedAccessException();
        var content = Text(request.NoiDung, "Nội dung sai/cần kiểm tra", 2000, !request.ThongTinDung);
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var round = await Round(maDot, true); var publication = await Latest(maDot) ?? throw new InvalidOperationException("Chưa công bố danh sách.");
        if (round.TrangThaiDanhSachNoi != "DuKien" || time.GetUtcNow() >= publication.HanPhanHoi)
            throw new InvalidOperationException("Đã hết hạn phản hồi hoặc danh sách đã chốt; chỉ được xem.");
        if (request.MaCongBo != publication.MaCongBo) throw new InvalidOperationException("Bản công bố đã thay đổi. Tải lại thông tin.");
        var data = await Review(publication);
        var row = data.Rows.SingleOrDefault(r => r.MaSV == maSV) ?? throw new UnauthorizedAccessException();
        if (data.Pending(maSV)) throw new InvalidOperationException("Bạn đang có yêu cầu chờ Khoa xử lý; chưa gửi thêm yêu cầu khác.");
        if (request.PhienBanThongTin != data.InfoVersion(maSV)) throw new InvalidOperationException("Thông tin đã được Khoa cập nhật. Tải lại trước khi gửi yêu cầu mới.");
        ThongTinCongTyMoi? proposed = null;
        if (!request.ThongTinDung && row.CoNoiThucTap) proposed = ValidateCompany(request.ThongTinMoi, row);
        else if (request.ThongTinMoi != null) throw new ArgumentException("Chỉ sửa thông tin công ty của nơi đã có; không đổi/bổ sung nơi thực tập qua yêu cầu này.");
        var latestVersion = await db.PhanHoiDanhSachThucTaps.Where(x => x.MaCongBo == publication.MaCongBo && x.MaSV == maSV)
            .Select(x => (int?)x.LanPhanHoi).MaxAsync() ?? 0;
        if (request.PhienBanPhanHoi != latestVersion) throw new InvalidOperationException("Phản hồi đã thay đổi ở phiên khác. Tải lại trước khi gửi.");
        db.PhanHoiDanhSachThucTaps.Add(new() { MaDot = maDot, MaCongBo = publication.MaCongBo, MaSV = maSV,
            LanPhanHoi = latestVersion + 1, ThongTinDung = request.ThongTinDung, NoiDung = content, NguoiGui = actor, NgayGui = time.GetUtcNow(),
            ThongTinCuJson = JsonSerializer.Serialize(row), ThongTinMoiJson = proposed == null ? null : JsonSerializer.Serialize(proposed), PhienBanThongTin = data.InfoVersion(maSV) });
        await db.SaveChangesAsync(); if (tx != null) await tx.CommitAsync();
    }

    public async Task ProcessAsync(string maDot, string maPhanHoi, XuLyYeuCauDanhSachRequest request, string actor)
    {
        Actor(actor); var reason = Text(request.LyDo, "Lý do/kết quả xử lý của Khoa", 2000);
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var round = await Round(maDot, true); var publication = await Latest(maDot) ?? throw new InvalidOperationException("Chưa công bố danh sách.");
        if (round.TrangThaiDanhSachNoi != "DuKien") throw new InvalidOperationException("Danh sách không còn cho phép chỉnh sửa.");
        var data = await Review(publication);
        if (request.MaCongBo != publication.MaCongBo || request.PhienBanRaSoat != data.Revision) throw new InvalidOperationException("Danh sách/yêu cầu đã thay đổi. Tải lại trước khi xử lý.");
        var feedback = data.Feedback.SingleOrDefault(f => f.MaPhanHoi == maPhanHoi && !f.ThongTinDung) ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu chỉnh sửa trong đợt.");
        if (data.Decision(maPhanHoi) != null) throw new InvalidOperationException("Yêu cầu đã xử lý, không được ghi đè kết quả.");
        var row = data.Rows.Single(r => r.MaSV == feedback.MaSV); var updated = row;
        if (request.ChapThuan)
        {
            if (!row.CoNoiThucTap || feedback.ThongTinMoiJson == null) throw new InvalidOperationException("Yêu cầu chưa có thông tin công ty mới hợp lệ; không thể chấp thuận tự động.");
            if (feedback.PhienBanThongTin != data.InfoVersion(feedback.MaSV)) throw new InvalidOperationException("Thông tin nền đã thay đổi; từ chối có lý do để SV kiểm tra/gửi lại.");
            var info = ValidateCompany(JsonSerializer.Deserialize<ThongTinCongTyMoi>(feedback.ThongTinMoiJson), row);
            var place = await db.PhanBoThucTaps.SingleOrDefaultAsync(p => p.MaPhanBo == row.MaPhanBo && p.MaDot == maDot && p.MaSinhVien == feedback.MaSV
                && p.MaCongTy == row.MaCongTy && p.TrangThai != "Huy" && p.DaDuocKhoaDuyet) ?? throw new InvalidOperationException("Nơi thực tập không khớp hồ sơ; cần kiểm tra dữ liệu.");
            updated = row with { TenCongTy = info.TenCongTy, DiaChiCongTy = info.DiaChi, MaSoThue = info.MaSoThue };
            place.TenCongTyXacNhan = info.TenCongTy; place.DiaChiCongTyXacNhan = info.DiaChi; place.MaSoThueCongTyXacNhan = info.MaSoThue;
        }
        db.XuLyPhanHoiDanhSachs.Add(new() { MaDot = maDot, MaPhanHoi = maPhanHoi, ChapThuan = request.ChapThuan,
            LyDo = reason, NguoiXuLy = actor, NgayXuLy = time.GetUtcNow(), ThongTinCuJson = JsonSerializer.Serialize(row), ThongTinMoiJson = JsonSerializer.Serialize(updated) });
        await db.SaveDanhSachControlAsync(); if (tx != null) await tx.CommitAsync();
    }

    public async Task FinalizeAsync(string maDot, ChotDanhSachChinhThucRequest request, string actor)
    {
        Actor(actor); var reason = Text(request.LyDo, "Ghi nhận rà soát của Khoa", 2000);
        if (!request.DaRaSoat) throw new ArgumentException("Khoa cần xác nhận đã rà soát danh sách và kết quả xử lý.");
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var round = await Round(maDot, true); var publication = await Latest(maDot) ?? throw new InvalidOperationException("Chưa công bố dự kiến.");
        var data = await Review(publication); var blocked = FinalizationBlock(round, publication, data);
        if (blocked != null) throw new InvalidOperationException(blocked);
        var review = await new RaSoatNoiService(db, roster, time).GetAsync(maDot);
        if (!review.DaRaSoatHet)
            throw new InvalidOperationException("Còn SV chưa có nơi hoặc hồ sơ chờ xác minh chưa xử lý; chưa được chốt danh sách chính thức.");
        if (request.PhienBanRaSoatNoi != review.PhienBan) throw new InvalidOperationException("Kết quả rà soát nơi đã thay đổi. Tải lại trước khi chốt.");
        if (request.MaCongBo != publication.MaCongBo || request.PhienBanRaSoat != data.Revision) throw new InvalidOperationException("Danh sách đã có phản hồi/xử lý mới. Tải lại để rà soát trước khi chốt.");
        var actual = (await roster.GetAsync(maDot)).SinhViens.Where(s => s.CoPhanBoChinhThuc).ToList();
        var listed = data.Rows.Where(r => r.CoNoiThucTap).ToList();
        if (listed.Count == 0 || actual.Count != listed.Count || listed.Any(r => !actual.Any(a => a.MaSV == r.MaSV && a.MaPhanBo == r.MaPhanBo && a.MaCongTy == r.MaCongTy)))
            throw new InvalidOperationException("Nơi thực tập hiệu lực không khớp danh sách đã rà soát; chưa thể chốt.");
        db.DanhSachThucTapChinhThucs.Add(new() { MaDot = maDot, MaCongBo = publication.MaCongBo, PhienBanRaSoat = data.Revision,
            DanhSachJson = JsonSerializer.Serialize(data.Rows.Select(r => r.CoNoiThucTap ? r : r with {
                TinhTrang = "Không hoàn tất vì chưa có nơi. " + review.SinhViens.Single(s => s.MaSV == r.MaSV).LyDo }).ToList()),
            LyDo = reason, NguoiChot = actor, NgayChot = time.GetUtcNow() });
        round.TrangThaiDanhSachNoi = "ChinhThuc";
        db.ThongBaos.Add(new ThongBao { MaThongBao = IdGenerator.New("TB"), TieuDe = $"Danh sách thực tập chính thức — {maDot}",
            NoiDung = $"Khoa đã chốt danh sách thực tập chính thức đợt {round.TenDot} ({maDot}). SV chọn đúng đợt để xem kết quả tại Bảng điều khiển. Danh sách đã khóa chỉnh sửa.",
            DoiTuong = "SV", LoaiThongBao = "DanhSachChinhThuc", MaNguoiGui = actor, NgayTao = time.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).DateTime });
        await db.SaveDanhSachControlAsync(); if (tx != null) await tx.CommitAsync();
    }
}
