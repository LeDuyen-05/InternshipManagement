using System.Data;
using System.Text.Json;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Common;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.PhanBo;

public record SaveConfirmationDeadlineRequest(DateTimeOffset HanXacNhanSV, int PhienBanXacNhan, string LyDo);
public record ReviewConfirmationRequest(string MaDot, int PhienBanXacNhan, string LyDo);

public class ConfirmationDeadlineService(AppDbContext db, TimeProvider clock)
{
    private static void Evidence(string actor, string reason)
    {
        if (string.IsNullOrWhiteSpace(actor) || actor.Length > 20) throw new UnauthorizedAccessException();
        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length > 1000) throw new ArgumentException("Cần lý do/căn cứ, tối đa 1000 ký tự.");
    }
    private async Task<DotThucTap> Round(string id, bool write = false)
    {
        if (string.IsNullOrWhiteSpace(id)) throw new ArgumentException("Cần chọn đợt thực tập.");
        if (write) await db.LockRoundsAsync(new[] { id });
        var round = await db.DotThucTaps.SingleOrDefaultAsync(x => x.MaSo == id) ?? throw new KeyNotFoundException("Không tìm thấy đợt.");
        if (write)
        {
            await db.Entry(round).ReloadAsync();
            if (await db.ChotDotThucTaps.AnyAsync(x => x.MaDot == id && x.TrangThai != "ChuaChot")) throw new RoundLockedException("Đợt đã chốt/khóa, không mở lại xác nhận bằng gia hạn.");
            if (round.TrangThai is not ("ChuaBatDau" or "DangDienRa")) throw new InvalidOperationException("Đợt không còn mở xử lý xác nhận.");
        }
        return round;
    }
    public async Task<object> GetAsync(string id)
    {
        var round = await Round(id);
        return new { maDot = id, round.HanXacNhanSV, round.PhienBanXacNhan, gioMayChu = clock.GetUtcNow() };
    }
    public async Task SaveAsync(string id, SaveConfirmationDeadlineRequest request, string actor)
    {
        Evidence(actor, request.LyDo);
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var round = await Round(id, true);
        if (round.PhienBanXacNhan != request.PhienBanXacNhan) throw new DbUpdateConcurrencyException();
        if (request.HanXacNhanSV <= clock.GetUtcNow()) throw new ArgumentException("Hạn mới phải sau hiện tại.");
        if (round.HanXacNhanSV == request.HanXacNhanSV) throw new ArgumentException("Hạn mới phải khác hạn hiện tại.");
        var before = JsonSerializer.Serialize(new { round.HanXacNhanSV, round.PhienBanXacNhan });
        round.HanXacNhanSV = request.HanXacNhanSV.ToOffset(TimeSpan.FromHours(7));
        round.PhienBanXacNhan++;
        Audit(id, "HanXacNhanSV", before, JsonSerializer.Serialize(new { round.HanXacNhanSV, round.PhienBanXacNhan }), request.LyDo, actor);
        await db.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
    }
    public async Task<object> OverdueAsync(string id)
    {
        var round = await Round(id);
        var now = clock.GetUtcNow();
        // Read-only projection: time passing never cancels a placement or frees quota.
        return await db.PhanBoThucTaps.AsNoTracking().Where(x => x.MaDot == id && !x.DaDuocKhoaDuyet
            && x.TrangThai == "ChuaNhanViec" && x.NgaySVXacNhan == null && x.HoSoTuTim == null
            && round.HanXacNhanSV != null && now >= round.HanXacNhanSV)
            .OrderBy(x => x.MaSinhVien).Select(x => new { x.MaPhanBo, x.MaDot, x.MaSinhVien,
                sinhVien = x.SinhVien.HoTen, x.SinhVien.Lop, x.MaCongTy, congTy = x.CongTy.TenCongTy,
                viTri = x.ViTri == null ? null : x.ViTri.TenViTri, round.HanXacNhanSV, round.PhienBanXacNhan }).ToListAsync();
    }
    public async Task ReviewAsync(string id, ReviewConfirmationRequest request, string actor)
    {
        Evidence(actor, request.LyDo);
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var round = await Round(request.MaDot, true);
        if (round.PhienBanXacNhan != request.PhienBanXacNhan) throw new DbUpdateConcurrencyException();
        var placement = await db.PhanBoThucTaps.Include(x => x.DotThucTap).Include(x => x.HoSoTuTim).SingleOrDefaultAsync(x => x.MaPhanBo == id)
            ?? throw new KeyNotFoundException("Không tìm thấy tiếp nhận.");
        if (placement.MaDot != request.MaDot) throw new InvalidOperationException("Hồ sơ không thuộc đợt đang chọn.");
        await db.Entry(placement).ReloadAsync();
        if (placement.HoSoTuTim != null || !ConfirmationDeadlinePolicy.Overdue(placement, clock.GetUtcNow()))
            throw new InvalidOperationException("Hồ sơ không còn chờ xác nhận quá hạn; tải lại danh sách.");
        var snapshot = JsonSerializer.Serialize(new { placement.MaPhanBo, placement.MaSinhVien, placement.MaCongTy,
            placement.TrangThai, round.HanXacNhanSV, round.PhienBanXacNhan });
        Audit(request.MaDot, "RaSoatXacNhanSV", snapshot, snapshot, request.LyDo, actor);
        await db.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
    }
    public async Task<object> HistoryAsync(string id)
    {
        await Round(id);
        return await db.NhatKyThoiHans.AsNoTracking().Where(x => x.MaDot == id && (x.Loai == "HanXacNhanSV" || x.Loai == "RaSoatXacNhanSV"))
            .OrderByDescending(x => x.ThoiDiem).ThenByDescending(x => x.MaNhatKy).ToListAsync();
    }
    private void Audit(string round, string type, string before, string after, string reason, string actor) => db.NhatKyThoiHans.Add(new NhatKyThoiHan {
        MaNhatKy = IdGenerator.New("XN"), MaDot = round, Loai = type, Truoc = before, Sau = after,
        LyDo = reason.Trim(), NguoiThucHien = actor, ThoiDiem = clock.GetUtcNow() });
}
