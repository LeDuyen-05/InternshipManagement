using System.Data;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Common;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.PhanBo;

public record DatHanDieuChinhRequest(string MaDot, DateTimeOffset? HanCu, DateTimeOffset HanMoi, string LyDo, string CanCu);
public record HuyNoiThucTapRequest(string MaDot, string TrangThaiHienTai, string LyDo, string CanCu, bool DaTiepNhanTrucTiep);
public record PhanBoLaiRequest(string MaDot, string MaCongTy, string LyDo, string CanCu, bool DaTiepNhanTrucTiep, bool DaDuocDNTiepNhan, string? MaViTri = null);
public record GhiNhanXuLyRiengRequest(string MaDot, string LyDo, string CanCu, bool DaTiepNhanTrucTiep);

public class DieuChinhNoiThucTapService(AppDbContext db, TimeProvider? clock = null)
{
    private readonly TimeProvider _clock = clock ?? TimeProvider.System;
    private DateTimeOffset Now => _clock.GetUtcNow();
    private DateTime Today => Now.ToOffset(TimeSpan.FromHours(7)).Date;

    private static string Text(string? value, string label, int limit = 1000)
    {
        var text = value?.Trim() ?? "";
        if (text.Length == 0 || text.Length > limit) throw new ArgumentException($"{label} bắt buộc, tối đa {limit} ký tự.");
        return text;
    }
    private static string Actor(string value) => Text(value, "Tài khoản xử lý", 20);
    private static void Direct(bool value)
    {
        if (!value) throw new ArgumentException("Khoa cần xác nhận đã tiếp nhận trực tiếp đơn/lý do và minh chứng trước khi xử lý.");
    }
    private async Task<DotThucTap> Round(string id) => await db.DotThucTaps.FirstOrDefaultAsync(x => x.MaSo == id)
        ?? throw new KeyNotFoundException("Không tìm thấy đợt thực tập.");
    private string? Closed(DotThucTap round)
    {
        if (round.TrangThai is not ("ChuaBatDau" or "DangDienRa")) return "Đợt đã kết thúc, chỉ xem lịch sử điều chỉnh.";
        if (round.ThoiGianBD == default || round.ThoiGianKT.Date < round.ThoiGianBD.Date) return "Ngày thực tập của đợt thiếu hoặc không hợp lệ; cần Khoa kiểm tra.";
        if (Today > round.ThoiGianKT.Date) return "Đã hết thời gian thực tập của đợt; không điều chỉnh trực tiếp.";
        return null;
    }
    private string? Window(DotThucTap round) => Closed(round)
        ?? (!round.HanDieuChinhNoiThucTap.HasValue ? "Khoa chưa thiết lập hạn điều chỉnh nơi thực tập cho đợt này."
            : Now >= round.HanDieuChinhNoiThucTap.Value ? "Đã hết hạn điều chỉnh nơi thực tập; liên hệ Khoa để xử lý riêng." : null);
    private void RequireWindow(DotThucTap round)
    {
        if (Window(round) is { } reason) throw new InvalidOperationException(reason);
    }
    private async Task<PhanBoThucTap> Placement(string id, string maDot)
    {
        var pb = await db.PhanBoThucTaps.Include(x => x.CongTy).FirstOrDefaultAsync(x => x.MaPhanBo == id)
            ?? throw new KeyNotFoundException("Không tìm thấy nơi thực tập.");
        if (pb.MaDot != maDot) throw new InvalidOperationException("Hồ sơ không thuộc đợt đang chọn. Vui lòng tải lại.");
        return pb;
    }
    // Phiếu dù chưa đủ thành phần vẫn cần xử lý riêng, không tái sử dụng cho một DN khác.
    private Task<bool> HasGrade(string maSV, string maDot) => db.PhieuChamDiems.AnyAsync(x => x.MaSV == maSV && x.MaDot == maDot);
    private async Task ArchiveReports(string maSV, string maDot, string placementId)
    {
        // Đánh dấu lưu trữ tại lần xử lý này, không suy đoán DN đã xác nhận báo cáo cũ.
        var reports = await db.TienDoThucTaps.Where(x => x.MaSV == maSV && x.MaDot == maDot
            && x.MaPhanBoLuuTru == null && (x.NgayNop != null || (x.NoiDungBaoCao != null && x.NoiDungBaoCao != ""))).ToListAsync();
        reports.ForEach(x => x.MaPhanBoLuuTru = placementId);
    }
    private void Log(string maDot, string? maSV, string? maPB, string type, string reason, string reference, string content, string actor)
        => db.NhatKyDieuChinhThucTaps.Add(new NhatKyDieuChinhThucTap
        {
            MaNhatKy = IdGenerator.New("DC"), MaDot = maDot, MaSV = maSV, MaPhanBo = maPB,
            Loai = type, LyDo = reason, CanCu = reference, NoiDung = content, NguoiThucHien = actor, ThoiDiem = Now
        });

    public async Task<object> GetPolicyAsync(string maDot)
    {
        var round = await Round(maDot);
        return new { round.MaSo, round.TenDot, hanDieuChinh = round.HanDieuChinhNoiThucTap?.ToOffset(TimeSpan.FromHours(7)),
            gioHienTai = Now.ToOffset(TimeSpan.FromHours(7)), lyDoKhoa = Window(round), coTheDatHan = Closed(round) == null,
            lichSuDatHan = await db.NhatKyDieuChinhThucTaps.AsNoTracking().Where(x => x.MaDot == maDot && x.Loai == "DatHan")
                .OrderByDescending(x => x.ThoiDiem).ThenByDescending(x => x.MaNhatKy).ToListAsync() };
    }

    public async Task SetDeadlineAsync(DatHanDieuChinhRequest request, string actor)
    {
        actor = Actor(actor);
        var reason = Text(request.LyDo, "Lý do thiết lập/gia hạn");
        var reference = Text(request.CanCu, "Căn cứ thông báo/quyết định của Khoa");
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var round = await Round(request.MaDot);
        if (Closed(round) is { } closed) throw new InvalidOperationException(closed);
        if (round.HanDieuChinhNoiThucTap != request.HanCu) throw new DbUpdateConcurrencyException();
        var vn = request.HanMoi.ToOffset(TimeSpan.FromHours(7));
        if (request.HanMoi <= Now || vn.Date > round.ThoiGianKT.Date)
            throw new ArgumentException("Hạn điều chỉnh phải sau thời điểm hiện tại và không vượt ngày kết thúc thực tập của đợt.");
        if (round.HanDieuChinhNoiThucTap == request.HanMoi) return;
        Log(round.MaSo, null, null, "DatHan", reason, reference,
            $"Hạn cũ: {round.HanDieuChinhNoiThucTap:O}; hạn mới: {request.HanMoi:O}. Không áp hồi tố cho dữ liệu cũ.", actor);
        round.HanDieuChinhNoiThucTap = request.HanMoi.ToUniversalTime();
        await db.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
    }

    public async Task<object> GetHistoryAsync(string maDot, string maSV)
    {
        var round = await Round(maDot);
        if (!await db.SinhViens.AnyAsync(x => x.MaSV == maSV)) throw new KeyNotFoundException("Không tìm thấy sinh viên.");
        var items = await db.PhanBoThucTaps.AsNoTracking().Include(x => x.CongTy)
            .Where(x => x.MaDot == maDot && x.MaSinhVien == maSV).OrderByDescending(x => x.NgayPhanBo).ThenByDescending(x => x.MaPhanBo).ToListAsync();
        var grade = await HasGrade(maSV, maDot);
        var pendingSelf = await db.DeXuatThucTapTuTims.AnyAsync(x => x.MaSV == maSV && x.MaDot == maDot && x.TrangThai == "ChoDuyet");
        var closed = Window(round);
        return new
        {
            maDot, maSV, coPhieuDiem = grade, lyDoKhoa = closed,
            soBaoCao = await db.TienDoThucTaps.CountAsync(x => x.MaSV == maSV && x.MaDot == maDot),
            giangViens = await db.GVHuongDans.AsNoTracking().Where(x => x.MaSinhVien == maSV && x.MaDot == maDot)
                .Select(x => new { x.MaSo, x.MaGiangVien, x.TrangThai }).ToListAsync(),
            phanBos = items.Select(p => new
            {
                p.MaPhanBo, p.MaCongTy, tenCongTy = p.CongTy?.TenCongTy ?? p.MaCongTy, p.MaDot, p.TrangThai,
                p.NgayPhanBo, p.DaDuocKhoaDuyet, p.LyDoHuy, p.CanCuHuy, p.NguoiHuy, p.NgayHuy,
                p.TrangThaiXuLyLai, p.MaPhanBoTruoc, p.NguonPhanBo,
                p.NgayBatDauThucTap, p.NgayKetThucThucTap, p.PhienBanThoiGian,
                canHuy = closed == null && !grade && p.TrangThai is ("ChuaNhanViec" or "ChoKhoaDuyet" or "DangThucTap"),
                canPhanBoLai = closed == null && !grade && !pendingSelf && p.TrangThai == "Huy"
                    && items.All(x => x.TrangThai == "Huy") && items.All(x => x.MaPhanBoTruoc != p.MaPhanBo)
            }),
            nhatKy = await db.NhatKyDieuChinhThucTaps.AsNoTracking().Where(x => x.MaDot == maDot && x.MaSV == maSV)
                .OrderByDescending(x => x.ThoiDiem).ThenByDescending(x => x.MaNhatKy).ToListAsync()
        };
    }

    public async Task<object> GetCompaniesAsync(string maDot)
    {
        await Round(maDot);
        return await db.CongTys.AsNoTracking().Where(x => x.TrangThai == "DaDuyet")
            .OrderBy(x => x.TenCongTy).Select(x => new { x.MaCongTy, x.TenCongTy,
                ViTris = db.ViTriTheoDots.Where(v => v.MaCongTy == x.MaCongTy && v.MaDot == maDot).Select(v => new { v.MaViTri, v.TenViTri, v.YeuCau, v.SoLuongNhan, v.HoatDong,
                    DaTiepNhan = db.PhanBoThucTaps.Count(p => p.MaDot == maDot && p.MaViTri == v.MaViTri && p.TrangThai != "Huy") }).ToList(),
                SoLuongNhan = db.CongTyTheoDots.Where(o => o.MaDot == maDot && o.MaCongTy == x.MaCongTy).Select(o => (int?)o.SoLuongNhan).FirstOrDefault() ?? x.SoLuongNhan,
                daTiepNhan = db.PhanBoThucTaps.Count(p => p.MaDot == maDot && p.MaCongTy == x.MaCongTy && p.TrangThai != "Huy") }).ToListAsync();
    }

    public async Task CancelAsync(string id, HuyNoiThucTapRequest request, string actor)
    {
        actor = Actor(actor); Direct(request.DaTiepNhanTrucTiep);
        var reason = Text(request.LyDo, "Lý do hủy"); var reference = Text(request.CanCu, "Đơn/minh chứng đã tiếp nhận trực tiếp");
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var round = await Round(request.MaDot);
        var pb = await Placement(id, request.MaDot);
        if (pb.TrangThai == "Huy" && pb.NgayHuy.HasValue) return; // Không ghi đè audit khi gửi lặp.
        RequireWindow(round);
        if (pb.TrangThai != request.TrangThaiHienTai) throw new DbUpdateConcurrencyException();
        if (pb.TrangThai is not ("ChuaNhanViec" or "ChoKhoaDuyet" or "DangThucTap"))
            throw new InvalidOperationException("Không hủy nơi đã hoàn thành hoặc trạng thái không hợp lệ; Khoa ghi nhận xử lý riêng.");
        if (await HasGrade(pb.MaSinhVien, pb.MaDot)) throw new InvalidOperationException("Đã có phiếu điểm trong đợt. Chỉ ghi nhận xử lý riêng; không hủy/chuyển điểm tự động.");
        Log(pb.MaDot, pb.MaSinhVien, id, "Huy", reason, reference,
            $"Hủy nơi {pb.MaCongTy}, trạng thái trước {pb.TrangThai}; giữ GVHD, báo cáo và hồ sơ cũ.", actor);
        pb.TrangThai = "Huy"; pb.LyDoHuy = reason; pb.CanCuHuy = reference; pb.NguoiHuy = actor;
        pb.NgayHuy = Now; pb.TrangThaiXuLyLai = "ChoPhanBoLai";
        await ArchiveReports(pb.MaSinhVien, pb.MaDot, id);
        await db.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
    }

    public async Task<string> ReallocateAsync(string oldId, PhanBoLaiRequest request, string actor)
    {
        actor = Actor(actor); Direct(request.DaTiepNhanTrucTiep);
        if (!request.DaDuocDNTiepNhan) throw new ArgumentException("Khoa cần xác nhận DN mới đã đồng ý tiếp nhận sinh viên.");
        var reason = Text(request.LyDo, "Lý do phân bổ lại"); var reference = Text(request.CanCu, "Căn cứ tiếp nhận của DN mới");
        var companyId = Text(request.MaCongTy, "Công ty", 20);
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var round = await Round(request.MaDot); RequireWindow(round);
        var old = await Placement(oldId, request.MaDot);
        if (old.TrangThai != "Huy") throw new InvalidOperationException("Cần Khoa hủy nơi cũ trước khi phân bổ lại.");
        if (await db.PhanBoThucTaps.AnyAsync(x => x.MaPhanBoTruoc == oldId))
            throw new InvalidOperationException("Nơi cũ đã được xử lý phân bổ lại. Tải lại để xem lịch sử mới nhất.");
        if (await db.PhanBoThucTaps.AnyAsync(x => x.MaDot == old.MaDot && x.MaSinhVien == old.MaSinhVien && x.TrangThai != "Huy"))
            throw new InvalidOperationException("Sinh viên đang có nơi tiếp nhận khác còn hiệu lực trong đợt.");
        if (await HasGrade(old.MaSinhVien, old.MaDot)) throw new InvalidOperationException("Đã có phiếu điểm trong đợt, cần Khoa xử lý riêng trước khi đổi nơi.");
        if (await db.DeXuatThucTapTuTims.AnyAsync(x => x.MaSV == old.MaSinhVien && x.MaDot == old.MaDot && x.TrangThai == "ChoDuyet"))
            throw new InvalidOperationException("Có hồ sơ nơi tự tìm đang chờ, Khoa cần giải quyết hồ sơ đó trước khi bố trí nơi khác.");
        var company = await db.CongTys.FirstOrDefaultAsync(x => x.MaCongTy == companyId)
            ?? throw new KeyNotFoundException("Không tìm thấy DN mới.");
        if (company.TrangThai != "DaDuyet") throw new InvalidOperationException("DN mới chưa được Khoa phê duyệt.");
        var count = await db.PhanBoThucTaps.CountAsync(x => x.MaCongTy == companyId && x.MaDot == old.MaDot && x.TrangThai != "Huy");
        var capacity = await CompanyRoundCapacity.LimitAsync(db, companyId, old.MaDot, company.SoLuongNhan);
        if (capacity > 0 && count >= capacity) throw new InvalidOperationException("DN đã đủ chỉ tiêu trong đợt.");
        // Phân bổ Huy từ dữ liệu cũ có thể chưa qua CancelAsync; vẫn bảo toàn báo cáo khi đổi nơi.
        await ArchiveReports(old.MaSinhVien, old.MaDot, oldId);
        var position = await PositionCapacity.RequireRoomAsync(db, companyId, old.MaDot, request.MaViTri);
        var id = IdGenerator.New("PB");
        db.PhanBoThucTaps.Add(new PhanBoThucTap
        {
            MaPhanBo = id, MaSinhVien = old.MaSinhVien, MaCongTy = companyId, MaViTri = position?.MaViTri, MaDot = old.MaDot, NgayPhanBo = Today,
            TrangThai = "DangThucTap", DaDuocKhoaDuyet = true, NgayKhoaDuyet = Now.ToOffset(TimeSpan.FromHours(7)).DateTime,
            NguoiKhoaDuyet = actor, MaPhanBoTruoc = oldId, NguonPhanBo = "KhoaPhanBoLai"
        });
        Log(old.MaDot, old.MaSinhVien, id, "PhanBoLai", reason, reference,
            $"Nơi cũ {oldId}/{old.MaCongTy} → nơi mới {id}/{companyId}. Khoa xác minh DN đã nhận; giữ GVHD và báo cáo cũ làm lịch sử, không xác nhận lại thay SV.", actor);
        old.TrangThaiXuLyLai = "DaPhanBoLai";
        await db.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
        return id;
    }

    public async Task RecordSeparateReviewAsync(string id, GhiNhanXuLyRiengRequest request, string actor)
    {
        actor = Actor(actor); Direct(request.DaTiepNhanTrucTiep);
        var reason = Text(request.LyDo, "Lý do cần xử lý riêng"); var reference = Text(request.CanCu, "Căn cứ hồ sơ");
        await Round(request.MaDot);
        var pb = await Placement(id, request.MaDot);
        Log(pb.MaDot, pb.MaSinhVien, id, "CanXuLyRieng", reason, reference,
            "Ghi nhận hồ sơ trình bày trực tiếp, chưa thay đổi nơi thực tập/GVHD/báo cáo/điểm. Không phải phê duyệt ngoại lệ.", actor);
        await db.SaveChangesAsync();
    }
}
