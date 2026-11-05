using System.Data;
using System.Text.Json;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.SinhVienTheoDot;

public record SupportResponseRequest(int PhienBan, string PhanHoi, string LyDo, bool DaTiepNhanTrucTiep = false);
public record RecommendSupportCompanyRequest(int PhienBan, string MaCongTy, string GhiChu, string? MaViTri = null);

public class SupportResponseService(AppDbContext db, TimeProvider clock)
{
    public async Task<SupportCompanyReferral> RecommendAsync(string maDot, string sessionId, string student, RecommendSupportCompanyRequest request, string actor)
    {
        if (string.IsNullOrWhiteSpace(actor) || actor.Length > 20) throw new UnauthorizedAccessException();
        if (string.IsNullOrWhiteSpace(request.MaCongTy) || request.MaCongTy.Length > 20 || string.IsNullOrWhiteSpace(request.GhiChu) || request.GhiChu.Trim().Length > 1000)
            throw new ArgumentException("Chọn công ty và ghi chú giới thiệu tối đa 1.000 ký tự.");
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        await db.LockRoundsAsync([maDot]);
        var round = await db.DotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaSo == maDot) ?? throw new KeyNotFoundException("Không tìm thấy đợt.");
        LanHoTroService.CheckRound(round, clock.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).Date);
        var state = await db.ChotDotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaDot == maDot);
        if (AppDbContext.LockStatus(state, clock.GetUtcNow()) != "ChuaChot") throw new RoundLockedException("Đợt đã khóa.");
        var sessions = await db.LanHoTroThucTaps.AsNoTracking().Where(x => x.MaDot == maDot && x.TrangThai != "DaXoa").ToListAsync();
        if (DAL.Common.SupportConsent.Latest(sessions, student)?.PhanHoi == "TuChoiHoTro") throw new InvalidOperationException("SV đang từ chối hỗ trợ; cần xác nhận nhận hỗ trợ lại.");
        if (await db.KhongHoanTatDots.AnyAsync(x => x.MaDot == maDot && x.MaSV == student && x.HieuLuc)
            || await db.PhanBoThucTaps.AnyAsync(x => x.MaDot == maDot && x.MaSinhVien == student && x.TrangThai != "Huy")
            || await db.DangKyThucTaps.AnyAsync(x => x.MaDot == maDot && x.MaSV == student && (x.TrangThai == "ChoDuyet" || x.TrangThai == "DaDuyet"))
            || await db.DeXuatThucTapTuTims.AnyAsync(x => x.MaDot == maDot && x.MaSV == student && (x.TrangThai == "ChoDuyet" || x.TrangThai == "DaDuyet")))
            throw new InvalidOperationException("SV đã có nơi, kết quả hoặc hồ sơ đang xử lý; rà hồ sơ trước khi giới thiệu tiếp.");
        var session = await db.LanHoTroThucTaps.SingleOrDefaultAsync(x => x.MaDot == maDot && x.MaLan == sessionId && x.TrangThai != "DaXoa")
            ?? throw new KeyNotFoundException("Không tìm thấy lần hỗ trợ.");
        if (session.PhienBan != request.PhienBan) throw new DbUpdateConcurrencyException();
        if (session.NgayHoTro.Date > clock.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).Date) throw new InvalidOperationException("Chưa đến ngày hỗ trợ.");
        var members = LanHoTroService.Members(session); var index = members.FindIndex(x => x.MaSV == student);
        if (index < 0) throw new KeyNotFoundException("SV không thuộc lần hỗ trợ.");
        var offer = await db.CongTyTheoDots.AsNoTracking().Include(x => x.CongTy).SingleOrDefaultAsync(x => x.MaDot == maDot && x.MaCongTy == request.MaCongTy);
        if (offer == null || !offer.HoatDong || offer.CongTy.TrangThai != "DaDuyet" || offer.CongTy.ChiTiepNhanTuTim || round.TrangThai != "DangDienRa"
            || clock.GetUtcNow() < offer.MoDangKy || clock.GetUtcNow() > offer.HanDangKy
            || await db.PhanBoThucTaps.CountAsync(x => x.MaDot == maDot && x.MaCongTy == request.MaCongTy && x.TrangThai != "Huy") >= offer.SoLuongNhan)
            throw new InvalidOperationException("Công ty đối tác chưa mở, đã hết hạn, ngừng nhận hoặc đủ chỉ tiêu trong đợt.");
        var position = await DAL.Common.PositionCapacity.RequireRoomAsync(db, request.MaCongTy, maDot, request.MaViTri);
        var before = members[index]; var referrals = (before.CongTyGioiThieu ?? []).ToList();
        if (referrals.Any(x => x.MaCongTy == request.MaCongTy && x.MaViTri == position?.MaViTri)) throw new InvalidOperationException("Đã giới thiệu công ty/vị trí này trong lần hỗ trợ.");
        var referral = new SupportCompanyReferral(Guid.NewGuid().ToString("N"), request.MaCongTy, offer.CongTy.TenCongTy, position?.MaViTri,
            position?.TenViTri ?? offer.ViTriTuyen, clock.GetUtcNow(), actor, request.GhiChu.Trim());
        referrals.Add(referral); members[index] = before with { CongTyGioiThieu = referrals };
        var history = JsonSerializer.Deserialize<List<HoTroAudit>>(session.NhatKyJson)!;
        history.Add(new("GioiThieuCongTy", actor, clock.GetUtcNow(), JsonSerializer.Serialize(before), JsonSerializer.Serialize(members[index])));
        session.DanhSachJson = JsonSerializer.Serialize(members); session.NhatKyJson = JsonSerializer.Serialize(history); session.PhienBan++; session.TrangThai = "DaThucHien";
        await db.SaveChangesAsync(); if (tx != null) await tx.CommitAsync(); return referral;
    }

    public async Task<object> StudentAsync(string maDot, string student)
    {
        if (!await db.DotThucTaps.AnyAsync(x => x.MaSo == maDot)) throw new KeyNotFoundException("Không tìm thấy đợt.");
        var sessions = await db.LanHoTroThucTaps.AsNoTracking().Where(x => x.MaDot == maDot && x.TrangThai != "DaXoa").OrderByDescending(x => x.NgayHoTro).ToListAsync();
        var round = await db.DotThucTaps.AsNoTracking().SingleAsync(x => x.MaSo == maDot);
        string? blocked = null;
        try { LanHoTroService.CheckRound(round, clock.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).Date); }
        catch (InvalidOperationException e) { blocked = e.Message; }
        var state = await db.ChotDotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaDot == maDot);
        if (AppDbContext.LockStatus(state, clock.GetUtcNow()) != "ChuaChot") blocked = "Đợt đã khóa.";
        if (await db.KhongHoanTatDots.AnyAsync(x => x.MaDot == maDot && x.MaSV == student && x.HieuLuc)) blocked = "Đã có quyết định không hoàn tất; Khoa cần rà/thu hồi trước.";
        var hasPlace = await db.PhanBoThucTaps.AnyAsync(x => x.MaDot == maDot && x.MaSinhVien == student && x.TrangThai != "Huy");
        return new { MaDot = maDot, CacLanHoTro = sessions.SelectMany(s => LanHoTroService.Members(s).Where(m => m.MaSV == student)
            .Select(m => new { s.MaLan, s.TenLan, s.NgayHoTro, s.PhienBan, SinhVien = m,
                CoThePhanHoi = blocked == null && !hasPlace && s.NgayHoTro.Date <= clock.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).Date,
                LyDoBiChan = blocked ?? (hasPlace ? "Đã có nơi tiếp nhận." : s.NgayHoTro.Date > clock.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).Date ? "Chưa đến ngày hỗ trợ." : null) })).ToList() };
    }

    public async Task RecordAsync(string maDot, string sessionId, string student, SupportResponseRequest request, string actor, bool byStudent)
    {
        if (string.IsNullOrWhiteSpace(actor) || actor.Length > 20) throw new UnauthorizedAccessException();
        var reason = request.LyDo?.Trim();
        if (request.PhanHoi is not ("NhanHoTro" or "TuChoiHoTro") || string.IsNullOrWhiteSpace(reason) || reason.Length > 1000)
            throw new ArgumentException("Chọn nhận/từ chối hỗ trợ và nhập lý do tối đa 1.000 ký tự.");
        if (!byStudent && !request.DaTiepNhanTrucTiep) throw new ArgumentException("Khoa phải xác nhận đã tiếp nhận trực tiếp phản hồi của SV.");
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        await db.LockRoundsAsync([maDot]);
        var round = await db.DotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaSo == maDot) ?? throw new KeyNotFoundException("Không tìm thấy đợt.");
        LanHoTroService.CheckRound(round, clock.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).Date);
        var state = await db.ChotDotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaDot == maDot);
        if (AppDbContext.LockStatus(state, clock.GetUtcNow()) != "ChuaChot") throw new RoundLockedException("Đợt đã khóa; không nhận phản hồi mới.");
        if (await db.KhongHoanTatDots.AnyAsync(x => x.MaDot == maDot && x.MaSV == student && x.HieuLuc)
            || await db.PhanBoThucTaps.AnyAsync(x => x.MaDot == maDot && x.MaSinhVien == student && x.TrangThai != "Huy"))
            throw new InvalidOperationException("SV đã có nơi hoặc kết quả không hoàn tất; Khoa cần rà hồ sơ trước khi đổi phản hồi.");
        var session = await db.LanHoTroThucTaps.SingleOrDefaultAsync(x => x.MaLan == sessionId && x.MaDot == maDot && x.TrangThai != "DaXoa")
            ?? throw new KeyNotFoundException("Không tìm thấy lần hỗ trợ.");
        if (session.PhienBan != request.PhienBan) throw new DbUpdateConcurrencyException();
        if (session.NgayHoTro.Date > clock.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).Date) throw new InvalidOperationException("Chưa đến ngày hỗ trợ.");
        var members = LanHoTroService.Members(session); var index = members.FindIndex(x => x.MaSV == student);
        if (index < 0) throw new KeyNotFoundException("SV không thuộc lần hỗ trợ.");
        var before = members[index];
        var after = before with { PhanHoi = request.PhanHoi, LyDoPhanHoi = reason, NguoiPhanHoi = actor,
            ThoiDiemPhanHoi = clock.GetUtcNow(), NguonPhanHoi = byStudent ? "SinhVien" : "KhoaXacMinh" };
        members[index] = after;
        var audit = JsonSerializer.Deserialize<List<HoTroAudit>>(session.NhatKyJson)!;
        audit.Add(new(byStudent ? "PhanHoiSV" : "KhoaGhiNhanPhanHoi", actor, clock.GetUtcNow(), JsonSerializer.Serialize(before), JsonSerializer.Serialize(after)));
        session.DanhSachJson = JsonSerializer.Serialize(members); session.NhatKyJson = JsonSerializer.Serialize(audit);
        session.TrangThai = "DaThucHien"; session.PhienBan++;
        await db.SaveChangesAsync(); if (tx != null) await tx.CommitAsync();
    }
}
