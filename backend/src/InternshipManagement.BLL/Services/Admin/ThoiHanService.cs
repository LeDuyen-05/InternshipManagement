using System.Data;
using System.Text.Json;
using InternshipManagement.BLL.Common;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.Admin;

public record SaveGradingDeadlineRequest(DateTimeOffset MoChamGV, DateTimeOffset HanChamGV,
    DateTimeOffset HanChamDN, string LyDo, int PhienBanThoiHan);
public record ReopenProgressRequest(DateTimeOffset HanNopBoSung, string LyDo, bool DaTrinhBayTrucTiep,
    DateTimeOffset? HanNopBoSungCu = null);

public class ThoiHanService(AppDbContext db, TimeProvider clock)
{
    public async Task<object> ReportsAsync(string maDot) => await db.TienDoThucTaps.AsNoTracking()
        .Where(x => x.MaDot == maDot && x.MaPhanBoLuuTru == null && (x.TrangThaiDuyet == "ChuaNop" || x.TrangThaiDuyet == "YeuCauSua"))
        .OrderBy(x => x.MocThoiGian).ThenBy(x => x.MaSV)
        .Select(x => new { x.MaTienDo, x.MaSV, hoTen = x.SinhVien.HoTen, x.MaDot, x.MocThoiGian, x.HanNopBoSung, x.TrangThaiDuyet }).ToListAsync();

    public async Task ReopenAsync(string id, ReopenProgressRequest request, string actor)
    {
        if (string.IsNullOrWhiteSpace(actor)) throw new UnauthorizedAccessException("Thiếu tài khoản Khoa.");
        if (!request.DaTrinhBayTrucTiep || string.IsNullOrWhiteSpace(request.LyDo) || request.LyDo.Trim().Length > 1000)
            throw new ArgumentException("Khoa cần xác nhận đã tiếp nhận SV trình bày trực tiếp và ghi lý do chấp thuận (tối đa 1000 ký tự).");
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var report = await db.TienDoThucTaps.SingleOrDefaultAsync(x => x.MaTienDo == id)
            ?? throw new KeyNotFoundException("Không tìm thấy mốc báo cáo.");
        if (report.MaPhanBoLuuTru != null || report.TrangThaiDuyet is not ("ChuaNop" or "YeuCauSua"))
            throw new InvalidOperationException("Chỉ mở báo cáo chưa nộp/yêu cầu sửa, không mở lại báo cáo đã duyệt hoặc lưu trữ.");
        if (!await db.PhanBoThucTaps.AnyAsync(x => x.MaSinhVien == report.MaSV && x.MaDot == report.MaDot && x.DaDuocKhoaDuyet && x.TrangThai == "DangThucTap"))
            throw new InvalidOperationException("SV chưa có nơi thực tập chính thức đang hiệu lực.");
        if (report.HanNopBoSung != request.HanNopBoSungCu)
            throw new InvalidOperationException("Hạn bổ sung đã đổi; tải lại trước khi lưu.");
        if (clock.GetUtcNow() < InternshipDeadlinePolicy.StartOfDay(report.MocThoiGian.AddDays(1)))
            throw new InvalidOperationException("Mốc chưa quá hạn, chưa cần mở bổ sung.");
        if (request.HanNopBoSung <= clock.GetUtcNow() || (report.HanNopBoSung.HasValue && request.HanNopBoSung <= report.HanNopBoSung))
            throw new ArgumentException("Hạn bổ sung mới phải sau hiện tại và sau hạn bổ sung cũ.");
        var before = JsonSerializer.Serialize(new { report.MaTienDo, report.MaSV, report.HanNopBoSung });
        report.HanNopBoSung = request.HanNopBoSung.ToOffset(InternshipDeadlinePolicy.VietnamOffset);
        db.NhatKyThoiHans.Add(new NhatKyThoiHan { MaNhatKy = DAL.Common.IdGenerator.New("TH"), MaDot = report.MaDot,
            Loai = "MoNopBoSung", Truoc = before, Sau = JsonSerializer.Serialize(new { report.MaTienDo, report.MaSV, report.HanNopBoSung, request.DaTrinhBayTrucTiep }),
            LyDo = request.LyDo.Trim(), NguoiThucHien = actor, ThoiDiem = clock.GetUtcNow() });
        await db.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
    }
    public async Task<object> GetAsync(string maDot)
    {
        var dot = await db.DotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaSo == maDot)
            ?? throw new KeyNotFoundException("Không tìm thấy đợt thực tập.");
        var now = clock.GetUtcNow();
        return new {
            dot.MaSo, dot.MoChamGV, dot.HanChamGV, dot.HanChamDN, dot.PhienBanThoiHan,
            moChamDN = InternshipDeadlinePolicy.EnterpriseOpening(dot),
            lyDoKhoaGV = InternshipDeadlinePolicy.GradeBlock(dot, false, now),
            lyDoKhoaDN = InternshipDeadlinePolicy.GradeBlock(dot, true, now),
            gioMayChu = now.ToOffset(InternshipDeadlinePolicy.VietnamOffset)
        };
    }

    public async Task SaveAsync(string maDot, SaveGradingDeadlineRequest request, string actor)
    {
        if (string.IsNullOrWhiteSpace(actor)) throw new UnauthorizedAccessException("Thiếu tài khoản Khoa thực hiện.");
        if (string.IsNullOrWhiteSpace(request.LyDo) || request.LyDo.Trim().Length > 1000)
            throw new ArgumentException("Phải nhập lý do cấu hình/gia hạn, tối đa 1000 ký tự.");
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var dot = await db.DotThucTaps.SingleOrDefaultAsync(x => x.MaSo == maDot)
            ?? throw new KeyNotFoundException("Không tìm thấy đợt thực tập.");
        if (dot.PhienBanThoiHan != request.PhienBanThoiHan)
            throw new InvalidOperationException("Thời hạn đã được người khác thay đổi. Tải lại trước khi lưu.");
        if (request.MoChamGV < InternshipDeadlinePolicy.StartOfDay(dot.ThoiGianBD)
            || request.HanChamGV < request.MoChamGV
            || request.HanChamDN < InternshipDeadlinePolicy.EnterpriseOpening(dot))
            throw new ArgumentException("Hạn chấm phải từ thời điểm mở chấm; GV không mở trước ngày bắt đầu đợt, DN mở sau hết ngày kết thúc đợt.");
        if (((request.HanChamGV != dot.HanChamGV || request.MoChamGV != dot.MoChamGV) && request.HanChamGV <= clock.GetUtcNow())
            || (request.HanChamDN != dot.HanChamDN && request.HanChamDN <= clock.GetUtcNow()))
            throw new ArgumentException("Hạn chấm mới phải sau thời điểm hiện tại.");
        var before = JsonSerializer.Serialize(new { dot.MoChamGV, dot.HanChamGV, dot.HanChamDN });
        dot.MoChamGV = request.MoChamGV.ToOffset(InternshipDeadlinePolicy.VietnamOffset);
        dot.HanChamGV = request.HanChamGV.ToOffset(InternshipDeadlinePolicy.VietnamOffset);
        dot.HanChamDN = request.HanChamDN.ToOffset(InternshipDeadlinePolicy.VietnamOffset);
        dot.PhienBanThoiHan++;
        db.NhatKyThoiHans.Add(new NhatKyThoiHan {
            MaNhatKy = DAL.Common.IdGenerator.New("TH"), MaDot = maDot, Loai = "ChamDiem",
            Truoc = before, Sau = JsonSerializer.Serialize(new { dot.MoChamGV, dot.HanChamGV, dot.HanChamDN }),
            LyDo = request.LyDo.Trim(), NguoiThucHien = actor, ThoiDiem = clock.GetUtcNow()
        });
        await db.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
    }

    public async Task<object> HistoryAsync(string maDot) => await db.NhatKyThoiHans.AsNoTracking()
        .Where(x => x.MaDot == maDot).OrderByDescending(x => x.ThoiDiem).ToListAsync();
}
