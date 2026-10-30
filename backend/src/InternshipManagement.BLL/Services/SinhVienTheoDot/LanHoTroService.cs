using System.Data;
using System.Text.Json;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.SinhVienTheoDot;

public record LuuLanHoTroRequest(string TenLan, DateTime NgayHoTro, List<string> MaSinhViens, int PhienBan = 0, string? MaLanTruoc = null);
public record KetQuaHoTroRequest(string KetQua, string GhiChu, int PhienBan);
public record PhienBanHoTroRequest(int PhienBan);
public record HoTroMember(string MaSV, string HoTen, string? Lop, string KetQua = "ChuaGhiNhan", string GhiChu = "", string? MaPhanBo = null, string? CongTy = null);
public record HoTroAudit(string Loai, string Nguoi, DateTimeOffset Luc, string Truoc, string Sau);

public class LanHoTroService(AppDbContext db, SinhVienTheoDotService roster, TimeProvider? clock = null)
{
    private readonly TimeProvider time = clock ?? TimeProvider.System;
    private DateTime Today => time.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).Date;
    internal static List<HoTroMember> Members(LanHoTroThucTap item) => JsonSerializer.Deserialize<List<HoTroMember>>(item.DanhSachJson)!;
    private static string Snapshot(LanHoTroThucTap item) => JsonSerializer.Serialize(new { item.TenLan, item.NgayHoTro, item.TrangThai, item.DanhSachJson });
    private static void Actor(string actor) { if (string.IsNullOrWhiteSpace(actor) || actor.Length > 20) throw new UnauthorizedAccessException(); }
    public static void CheckRound(DotThucTap round, DateTime today)
    {
        if (round.ThoiGianBD == default || round.ThoiGianKT < round.ThoiGianBD || today >= round.ThoiGianBD.Date)
            throw new InvalidOperationException("Đã đến ngày bắt đầu thực tập hoặc lịch đợt không hợp lệ; không bố trí/hỗ trợ thêm.");
        if (round.TrangThai is not ("ChuaBatDau" or "DangDienRa") || round.TrangThaiDanhSachNoi != "ChuaCongBo")
            throw new InvalidOperationException("Danh sách đã công bố/chốt hoặc đợt đã khóa; chỉ được xem các lần hỗ trợ.");
    }
    private async Task<DotThucTap> Round(string maDot, bool write)
    {
        if (string.IsNullOrWhiteSpace(maDot)) throw new ArgumentException("Chọn đợt thực tập.");
        if (write) await db.LockRoundsAsync(new[] { maDot });
        var round = await db.DotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaSo == maDot)
            ?? throw new KeyNotFoundException("Không tìm thấy đợt.");
        if (write)
        {
            CheckRound(round, Today);
            var state = await db.ChotDotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaDot == maDot);
            if (AppDbContext.LockStatus(state, time.GetUtcNow()) != "ChuaChot") throw new InvalidOperationException("Đợt đã chốt kết quả; chỉ được xem.");
        }
        return round;
    }
    private async Task<LanHoTroThucTap> Item(string maDot, string id, int version)
    {
        var item = await db.LanHoTroThucTaps.SingleOrDefaultAsync(x => x.MaDot == maDot && x.MaLan == id && x.TrangThai != "DaXoa")
            ?? throw new KeyNotFoundException("Không tìm thấy lần hỗ trợ trong đợt.");
        if (item.PhienBan != version) throw new InvalidOperationException("Dữ liệu đã thay đổi. Tải lại trước khi sửa.");
        return item;
    }
    private void Journal(LanHoTroThucTap item, string action, string actor, string before)
    {
        var history = JsonSerializer.Deserialize<List<HoTroAudit>>(item.NhatKyJson)!;
        history.Add(new(action, actor, time.GetUtcNow(), before, JsonSerializer.Serialize(new { item.TenLan, item.NgayHoTro, item.TrangThai, item.DanhSachJson })));
        item.NhatKyJson = JsonSerializer.Serialize(history); item.PhienBan++;
    }
    public async Task<object> GetAsync(string maDot)
    {
        var round = await Round(maDot, false); string? locked = null;
        try { CheckRound(round, Today); var state = await db.ChotDotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaDot == maDot);
            if (AppDbContext.LockStatus(state, time.GetUtcNow()) != "ChuaChot") locked = "Đợt đã chốt kết quả.";
        } catch (InvalidOperationException e) { locked = e.Message; }
        var rows = (await roster.GetAsync(maDot)).SinhViens;
        var sessions = await db.LanHoTroThucTaps.AsNoTracking().Where(x => x.MaDot == maDot && x.TrangThai != "DaXoa").OrderBy(x => x.NgayHoTro).ThenBy(x => x.MaLan).ToListAsync();
        return new { MaDot = maDot, CoTheSua = locked == null, LyDoKhoa = locked, NgayBatDau = round.ThoiGianBD.Date,
            UngViens = rows.Where(x => x.TrangThai is "ChuaDangKy" or "ChuaCoNoiTiepNhan").ToList(),
            CacLan = sessions.Select(x => new { x.MaLan, x.TenLan, x.NgayHoTro, x.TrangThai, x.MaLanTruoc, x.PhienBan,
                SinhViens = Members(x).Select(s => new { s.MaSV, s.HoTen, s.Lop, s.KetQua, s.GhiChu, s.MaPhanBo, s.CongTy,
                    HienTai = rows.FirstOrDefault(r => r.MaSV == s.MaSV)?.TenTrangThai,
                    CoTheBoTri = rows.Any(r => r.MaSV == s.MaSV && r.TrangThai is "ChuaDangKy" or "ChuaCoNoiTiepNhan") }),
                NhatKy = JsonSerializer.Deserialize<List<HoTroAudit>>(x.NhatKyJson) }) };
    }
    public async Task<string> SaveAsync(string maDot, string? id, LuuLanHoTroRequest request, string actor)
    {
        Actor(actor);
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var round = await Round(maDot, true);
        var name = request.TenLan?.Trim() ?? "";
        if (name.Length is < 1 or > 200 || request.NgayHoTro.Date < Today || request.NgayHoTro.Date >= round.ThoiGianBD.Date)
            throw new ArgumentException("Tên lần hỗ trợ bắt buộc (tối đa 200 ký tự); ngày từ hôm nay và trước ngày bắt đầu thực tập.");
        if (request.MaSinhViens == null || request.MaSinhViens.Count is < 1 or > 500 || request.MaSinhViens.Any(string.IsNullOrWhiteSpace))
            throw new ArgumentException("Chọn từ 1 đến 500 SV.");
        var ids = request.MaSinhViens.Select(x => x.Trim().ToUpperInvariant()).Distinct().ToArray();
        var rows = (await roster.GetAsync(maDot)).SinhViens;
        var candidates = rows.Where(x => ids.Contains(x.MaSV.ToUpperInvariant()) && x.TrangThai is "ChuaDangKy" or "ChuaCoNoiTiepNhan").ToList();
        if (candidates.Count != ids.Length) throw new InvalidOperationException("Có SV khác đợt, đã có nơi hoặc hồ sơ đang xử lý. Chưa lưu thay đổi nào.");
        if (request.MaLanTruoc != null)
        {
            var previous = await db.LanHoTroThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaLan == request.MaLanTruoc && x.MaDot == maDot && x.TrangThai == "DaThucHien")
                ?? throw new InvalidOperationException("Lần trước chưa có kết quả hoặc không thuộc đợt.");
            if (request.NgayHoTro.Date < previous.NgayHoTro.Date || ids.Any(s => !Members(previous).Any(m => m.MaSV.ToUpperInvariant() == s && m.KetQua == "CanHoTro")))
                throw new InvalidOperationException("Lần tiếp theo chỉ lấy SV đã ghi vẫn cần hỗ trợ ở lần trước và còn chưa có nơi; ngày không được trước lần cũ.");
        }
        LanHoTroThucTap item; string before;
        if (id == null) { item = new() { MaDot = maDot }; before = ""; db.LanHoTroThucTaps.Add(item); }
        else { item = await Item(maDot, id, request.PhienBan); before = Snapshot(item);
            if (item.TrangThai != "Nhap") throw new InvalidOperationException("Lần đã thực hiện chỉ ghi kết quả, không sửa danh sách/ngày hoặc xóa.");
            if (item.MaLanTruoc != request.MaLanTruoc) throw new InvalidOperationException("Không đổi liên kết lần trước."); }
        item.TenLan = name; item.NgayHoTro = request.NgayHoTro.Date; item.MaLanTruoc = request.MaLanTruoc;
        item.DanhSachJson = JsonSerializer.Serialize(candidates.Select(x => new HoTroMember(x.MaSV, x.HoTen, x.Lop)));
        Journal(item, id == null ? "Tao" : "SuaNhap", actor, before);
        await db.SaveChangesAsync(); if (tx != null) await tx.CommitAsync(); return item.MaLan;
    }
    public async Task DeleteAsync(string maDot, string id, int version, string actor)
    {
        Actor(actor); await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        await Round(maDot, true); var item = await Item(maDot, id, version);
        if (item.TrangThai != "Nhap") throw new InvalidOperationException("Chỉ xóa lần nháp chưa ghi kết quả.");
        var before = Snapshot(item); item.TrangThai = "DaXoa"; Journal(item, "XoaNhap", actor, before);
        await db.SaveChangesAsync(); if (tx != null) await tx.CommitAsync();
    }
    public async Task ResultAsync(string maDot, string id, string maSV, KetQuaHoTroRequest request, string actor)
    {
        Actor(actor); await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        await Round(maDot, true); var item = await Item(maDot, id, request.PhienBan);
        if (item.NgayHoTro.Date > Today) throw new InvalidOperationException("Chưa đến ngày hỗ trợ, chưa ghi kết quả.");
        if (request.KetQua is not ("CanHoTro" or "DaCoNoi") || string.IsNullOrWhiteSpace(request.GhiChu) || request.GhiChu.Length > 1000)
            throw new ArgumentException("Chọn kết quả và nhập căn cứ/ghi chú (tối đa 1000 ký tự).");
        var members = Members(item); var index = members.FindIndex(x => x.MaSV == maSV);
        if (index < 0) throw new KeyNotFoundException("SV không thuộc lần hỗ trợ.");
        var row = (await roster.GetAsync(maDot)).SinhViens.SingleOrDefault(x => x.MaSV == maSV);
        if (request.KetQua == "DaCoNoi" && row?.CoPhanBoChinhThuc != true)
            throw new InvalidOperationException("Cần có nơi thực tập được Khoa xác nhận trước khi ghi đã có công ty.");
        if (request.KetQua == "CanHoTro" && (row == null || row.TrangThai is not ("ChuaDangKy" or "ChuaCoNoiTiepNhan")))
            throw new InvalidOperationException("SV đã có nơi hoặc hồ sơ đang xử lý; rà lại trước khi ghi cần hỗ trợ.");
        var before = item.DanhSachJson;
        members[index] = members[index] with { KetQua = request.KetQua, GhiChu = request.GhiChu.Trim(),
            MaPhanBo = request.KetQua == "DaCoNoi" ? row?.MaPhanBo : null, CongTy = request.KetQua == "DaCoNoi" ? row?.TenCongTy : null };
        item.DanhSachJson = JsonSerializer.Serialize(members); item.TrangThai = "DaThucHien";
        Journal(item, "KetQua", actor, before); await db.SaveChangesAsync(); if (tx != null) await tx.CommitAsync();
    }
    // Gọi trong transaction bố trí hiện có: lưu nơi và kết quả hỗ trợ cùng một lần SaveChanges.
    public async Task AttachAllocationAsync(string maDot, string id, int version, string maSV, string placement, string company, string actor)
    {
        var item = await Item(maDot, id, version);
        if (item.NgayHoTro.Date > Today) throw new InvalidOperationException("Chưa đến ngày hỗ trợ.");
        var members = Members(item); var index = members.FindIndex(x => x.MaSV == maSV);
        if (index < 0 || members[index].KetQua == "DaCoNoi") throw new InvalidOperationException("SV không thuộc lần hỗ trợ hoặc đã có nơi.");
        var before = item.DanhSachJson;
        members[index] = members[index] with { KetQua = "DaCoNoi", MaPhanBo = placement, CongTy = company, GhiChu = "Khoa xác minh DN tiếp nhận qua luồng bố trí." };
        item.DanhSachJson = JsonSerializer.Serialize(members); item.TrangThai = "DaThucHien"; Journal(item, "BoTri", actor, before);
    }
}
