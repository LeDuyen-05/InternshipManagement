using System.Data;
using System.Text.Json;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.SinhVienTheoDot;

public record GhiNhanChuaCoNoiRequest(int PhienBan, string LyDo, string CanCu, bool DaXacMinh, bool ThuHoi = false);
public record DongRaSoatNoi(string MaSV, string HoTen, string? Lop, string Nhom, string TinhTrang,
    bool CoTheXacNhan, bool DaGhiNhan, bool CoTheThuHoi, string? LyDo, string? CanCu);
public record RaSoatNoiDto(string MaDot, int PhienBan, bool CoTheSua, int TongSV, int DaCoNoi,
    int ChoXuLy, int ChuaCoNoi, int DaGhiNhanKhongHoanTat, List<DongRaSoatNoi> SinhViens)
{
    public bool DaRaSoatHet => TongSV > 0 && SinhViens.All(x => x.Nhom is "DaCoNoi" or "DaGhiNhan");
}

// Rà trước chốt danh sách: đọc nguồn thực, không suy thiếu nơi từ nhãn hiển thị hoặc thiếu ngày tại DN.
public class RaSoatNoiService(AppDbContext db, SinhVienTheoDotService roster, TimeProvider clock)
{
    private DateTimeOffset Now => clock.GetUtcNow();
    public async Task<RaSoatNoiDto> GetAsync(string maDot)
    {
        var round = await db.DotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaSo == maDot) ?? throw new KeyNotFoundException("Không tìm thấy đợt.");
        var state = await db.ChotDotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaDot == maDot);
        var editable = round.TrangThaiDanhSachNoi != "ChinhThuc" && !await db.DanhSachThucTapChinhThucs.AnyAsync(x => x.MaDot == maDot)
            && round.TrangThai is ("ChuaBatDau" or "DangDienRa") && round.ThoiGianBD != default && Now.ToOffset(TimeSpan.FromHours(7)).Date < round.ThoiGianBD.Date
            && AppDbContext.LockStatus(state, Now) == "ChuaChot";
        var students = (await roster.GetAsync(maDot)).SinhViens;
        var places = await db.PhanBoThucTaps.AsNoTracking().Where(x => x.MaDot == maDot && x.TrangThai != "Huy").ToListAsync();
        var apps = await db.DangKyThucTaps.AsNoTracking().Where(x => x.MaDot == maDot && (x.TrangThai == "ChoDuyet" || x.TrangThai == "DaDuyet")).ToListAsync();
        var outside = await db.DeXuatThucTapTuTims.AsNoTracking().Where(x => x.MaDot == maDot && (x.TrangThai == "ChoDuyet" || x.TrangThai == "DaDuyet")).ToListAsync();
        var records = await db.GVHuongDans.Where(x => x.MaDot == maDot).Select(x => x.MaSinhVien)
            .Union(db.TienDoThucTaps.Where(x => x.MaDot == maDot).Select(x => x.MaSV))
            .Union(db.PhieuChamDiems.Where(x => x.MaDot == maDot).Select(x => x.MaSV)).ToListAsync();
        var decisions = await db.KhongHoanTatDots.AsNoTracking().Where(x => x.MaDot == maDot && x.HieuLuc).ToListAsync();
        var rows = students.Select(s =>
        {
            var own = places.Where(p => p.MaSinhVien == s.MaSV).ToList();
            var official = own.Count == 1 && own[0].DaDuocKhoaDuyet && own[0].TrangThai is ("DangThucTap" or "HoanThanh");
            var pending = apps.Any(a => a.MaSV == s.MaSV && !own.Any(p => p.DaDuocKhoaDuyet && p.MaCongTy == a.MaCongTy && p.TrangThai is ("DangThucTap" or "HoanThanh")))
                || outside.Any(t => t.MaSV == s.MaSV && (t.TrangThai == "ChoDuyet" || !own.Any(p => p.DaDuocKhoaDuyet && p.MaPhanBo == t.MaPhanBo)));
            var missing = own.Count == 0 && !pending && !records.Contains(s.MaSV);
            var decision = decisions.SingleOrDefault(d => d.MaSV == s.MaSV);
            var settled = missing && decision?.TruocChotDanhSach == true;
            var group = decision != null ? settled ? "DaGhiNhan" : "ChoXuLy" : official && !pending ? "DaCoNoi" : missing ? "ChuaCoNoi" : "ChoXuLy";
            return new DongRaSoatNoi(s.MaSV, s.HoTen, s.Lop, group,
                group switch { "DaCoNoi" => "Đã có nơi được Khoa công nhận", "ChuaCoNoi" => "Chưa có nơi; cần hỗ trợ hoặc xác nhận có căn cứ. " + s.LyDo, "DaGhiNhan" => "Đã xác nhận Không hoàn tất vì chưa có nơi", _ => "Còn hồ sơ chờ/mâu thuẫn cần xử lý: " + s.TenTrangThai + ". " + s.LyDo },
                editable && missing && decision == null, settled, editable && decision?.TruocChotDanhSach == true, decision?.LyDo, decision?.CanCu);
        }).ToList();
        return new(maDot, state?.PhienBan ?? 0, editable, rows.Count, rows.Count(x => x.Nhom == "DaCoNoi"), rows.Count(x => x.Nhom == "ChoXuLy"),
            rows.Count(x => x.Nhom == "ChuaCoNoi"), rows.Count(x => x.Nhom == "DaGhiNhan"), rows);
    }

    public async Task ConfirmAsync(string maDot, string maSV, GhiNhanChuaCoNoiRequest request, string actor)
    {
        if (string.IsNullOrWhiteSpace(actor) || actor.Length > 20) throw new UnauthorizedAccessException();
        var reason = request.LyDo?.Trim(); var evidence = request.CanCu?.Trim();
        if (string.IsNullOrWhiteSpace(reason) || reason.Length > 1000 || string.IsNullOrWhiteSpace(evidence) || evidence.Length > 1000 || !request.ThuHoi && !request.DaXacMinh)
            throw new ArgumentException("Nhập lý do/căn cứ (tối đa 1.000 ký tự) và xác nhận đã kiểm tra SV thực sự chưa có nơi.");
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        await db.LockRoundsAsync([maDot]);
        var data = await GetAsync(maDot);
        if (!data.CoTheSua) throw new InvalidOperationException("Chỉ rà/xác nhận trước chốt danh sách chính thức và trước ngày bắt đầu thực tập.");
        if (data.PhienBan != request.PhienBan) throw new DbUpdateConcurrencyException("Kết quả rà soát đã thay đổi. Tải lại.");
        var row = data.SinhViens.SingleOrDefault(x => x.MaSV == maSV) ?? throw new KeyNotFoundException("SV không thuộc đợt.");
        if (request.ThuHoi ? !row.CoTheThuHoi : !row.CoTheXacNhan) throw new InvalidOperationException("SV còn hồ sơ chờ/có nơi hoặc xác nhận không phù hợp. Rà hồ sơ trước khi xử lý.");
        var item = await db.KhongHoanTatDots.SingleOrDefaultAsync(x => x.MaDot == maDot && x.MaSV == maSV);
        var before = item == null ? null : JsonSerializer.Serialize(item);
        if (item == null) { item = new() { MaDot = maDot, MaSV = maSV }; db.KhongHoanTatDots.Add(item); }
        item.TruocChotDanhSach = true; item.HieuLuc = !request.ThuHoi; item.LyDo = reason; item.CanCu = evidence; item.NguoiXacNhan = actor; item.NgayXacNhan = Now;
        var state = await db.ChotDotThucTaps.SingleOrDefaultAsync(x => x.MaDot == maDot);
        if (state == null) { state = new() { MaDot = maDot }; db.ChotDotThucTaps.Add(state); }
        state.PhienBan++; state.NguoiCapNhat = actor; state.NgayCapNhat = Now; state.LyDo = reason;
        db.NhatKyChotDots.Add(new() { MaDot = maDot, PhienBan = state.PhienBan, Loai = request.ThuHoi ? "ThuHoiChuaCoNoi" : "XacNhanChuaCoNoi",
            NguoiThucHien = actor, ThoiDiem = Now, LyDo = reason, NoiDung = JsonSerializer.Serialize(new { MaSV = maSV, Truoc = before, Sau = item }) });
        await db.SaveRoundControlAsync(); if (tx != null) await tx.CommitAsync();
    }
}
