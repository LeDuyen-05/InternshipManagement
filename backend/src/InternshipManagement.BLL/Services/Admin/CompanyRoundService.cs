using System.Data;
using System.Text.Json;
using InternshipManagement.BLL.Common;
using InternshipManagement.BLL.DTOs.DangKyThucTap;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.Admin;

public record SaveCompanyRoundRequest(string ViTriTuyen, string YeuCau, int SoLuongNhan,
    DateTimeOffset MoDangKy, DateTimeOffset HanDangKy, bool HoatDong, int PhienBan, string LyDo, IReadOnlyList<SavePositionRequest>? ViTris = null);
public record SavePositionRequest(string? MaViTri, string TenViTri, string YeuCau, int SoLuongNhan, bool HoatDong = true);
public record ConfirmRoundLecturerRequest(string? MaGV, int PhienBan, string LyDo);

public class CompanyRoundService(AppDbContext db, TimeProvider clock)
{
    public async Task ConfirmLecturerAsync(string maDot, string company, ConfirmRoundLecturerRequest request, string actor)
    {
        if (string.IsNullOrWhiteSpace(actor) || actor.Length > 20) throw new UnauthorizedAccessException();
        if (string.IsNullOrWhiteSpace(request.LyDo) || request.LyDo.Trim().Length > 1000) throw new ArgumentException("Khoa phải ghi lý do xác nhận/đổi/bỏ GV đầu mối, tối đa 1000 ký tự.");
        var teacher = string.IsNullOrWhiteSpace(request.MaGV) ? null : request.MaGV.Trim();
        if (teacher != null && !await db.GiangViens.AnyAsync(x => x.MaGV == teacher)) throw new ArgumentException("Giảng viên không có trong danh mục.");
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var row = await db.CongTyTheoDots.Include(x => x.DotThucTap).SingleOrDefaultAsync(x => x.MaDot == maDot && x.MaCongTy == company)
            ?? throw new KeyNotFoundException("Khoa cần có kế hoạch DN trong đúng đợt trước khi xác nhận GV.");
        if (row.DotThucTap.TrangThai == "DaKetThuc") throw new InvalidOperationException("Đợt đã kết thúc, chỉ xem lịch sử GV đầu mối.");
        if (row.PhienBan != request.PhienBan) throw new InvalidOperationException("Kế hoạch đã đổi. Tải lại trước khi xác nhận GV.");
        var before = JsonSerializer.Serialize(new { companyId = company, row.MaGVGioiThieu });
        row.MaGVGioiThieu = teacher; row.PhienBan++;
        db.NhatKyThoiHans.Add(new() { MaNhatKy = DAL.Common.IdGenerator.New("TH"), MaDot = maDot, Loai = "GVGioiThieuTheoDot",
            Truoc = before, Sau = JsonSerializer.Serialize(new { companyId = company, row.MaGVGioiThieu }), LyDo = request.LyDo.Trim(), NguoiThucHien = actor, ThoiDiem = clock.GetUtcNow() });
        await db.SaveChangesAsync(); if (tx != null) await tx.CommitAsync();
    }
    public async Task<object> HistoryAsync(string maDot) => await db.NhatKyThoiHans.AsNoTracking()
        .Where(x => x.MaDot == maDot && (x.Loai == "CongTyTheoDot" || x.Loai == "GVGioiThieuTheoDot")).OrderByDescending(x => x.ThoiDiem).ToListAsync();
    public async Task<object> ForRepresentativeAsync(string? representative, string? maDot = null)
    {
        var now = clock.GetUtcNow();
        var company = await db.DaiDienDoanhNghieps.Where(x => x.MaSo == representative).Select(x => x.MaCongTy).FirstOrDefaultAsync()
            ?? throw new UnauthorizedAccessException("Tài khoản chưa gắn đại diện DN.");
        if (maDot != null && !await db.DotThucTaps.AnyAsync(x => x.MaSo == maDot)) throw new KeyNotFoundException("Không tìm thấy đợt.");
        return await db.CongTyTheoDots.AsNoTracking().Where(x => x.MaCongTy == company && (maDot == null || x.MaDot == maDot))
            .OrderByDescending(x => x.DotThucTap.ThoiGianBD).Select(x => new { x.MaDot, x.DotThucTap.TenDot,
                x.ViTriTuyen, x.YeuCau, x.SoLuongNhan, x.MoDangKy, x.HanDangKy, x.HoatDong,
                ViTris = x.ViTris.OrderBy(v => v.TenViTri).Select(v => new { v.MaViTri, v.TenViTri, v.YeuCau, v.SoLuongNhan, v.HoatDong,
                    daTiepNhan = db.PhanBoThucTaps.Count(p => p.MaDot == x.MaDot && p.MaCongTy == x.MaCongTy && p.MaViTri == v.MaViTri && p.TrangThai != "Huy") }).ToList(),
                trangThaiTuyen = db.ChotDotThucTaps.Any(c => c.MaDot == x.MaDot && c.TrangThai != "ChuaChot") ? "DotDaKhoa" : RecruitmentStatus.Resolve(x, x.CongTy.TrangThai, x.DotThucTap.TrangThai,
                    db.PhanBoThucTaps.Count(p => p.MaDot == x.MaDot && p.MaCongTy == company && p.TrangThai != "Huy"), now, null, x.ViTris.Any() && x.ViTris.All(v => db.PhanBoThucTaps.Count(p => p.MaDot == x.MaDot && p.MaCongTy == x.MaCongTy && p.MaViTri == v.MaViTri && p.TrangThai != "Huy") >= v.SoLuongNhan)),
                daTiepNhan = db.PhanBoThucTaps.Count(p => p.MaDot == x.MaDot && p.MaCongTy == company && p.TrangThai != "Huy") }).ToListAsync();
    }
    public async Task<object> GetAsync(string maDot)
    {
        var now = clock.GetUtcNow();
        if (!await db.DotThucTaps.AnyAsync(x => x.MaSo == maDot)) throw new KeyNotFoundException("Không tìm thấy đợt.");
        return await db.CongTyTheoDots.AsNoTracking().Where(x => x.MaDot == maDot).OrderBy(x => x.CongTy.TenCongTy)
            .Select(x => new { x.MaDot, x.MaCongTy, x.CongTy.TenCongTy, x.ViTriTuyen, x.YeuCau, x.SoLuongNhan,
                x.MoDangKy, x.HanDangKy, x.HoatDong, x.PhienBan, x.CongTy.TrangThai,
                ViTris = x.ViTris.OrderBy(v => v.TenViTri).Select(v => new { v.MaViTri, v.TenViTri, v.YeuCau, v.SoLuongNhan, v.HoatDong,
                    daTiepNhan = db.PhanBoThucTaps.Count(p => p.MaDot == x.MaDot && p.MaCongTy == x.MaCongTy && p.MaViTri == v.MaViTri && p.TrangThai != "Huy") }).ToList(),
                x.MaGVGioiThieu, tenGVGioiThieu = x.GiangVienGioiThieu == null ? null : x.GiangVienGioiThieu.HoTen,
                trangThaiTuyen = db.ChotDotThucTaps.Any(c => c.MaDot == x.MaDot && c.TrangThai != "ChuaChot") ? "DotDaKhoa" : RecruitmentStatus.Resolve(x, x.CongTy.TrangThai, x.DotThucTap.TrangThai,
                    db.PhanBoThucTaps.Count(p => p.MaDot == maDot && p.MaCongTy == x.MaCongTy && p.TrangThai != "Huy"), now, null, x.ViTris.Any() && x.ViTris.All(v => db.PhanBoThucTaps.Count(p => p.MaDot == x.MaDot && p.MaCongTy == x.MaCongTy && p.MaViTri == v.MaViTri && p.TrangThai != "Huy") >= v.SoLuongNhan)),
                daTiepNhan = db.PhanBoThucTaps.Count(p => p.MaDot == maDot && p.MaCongTy == x.MaCongTy && p.TrangThai != "Huy") }).ToListAsync();
    }

    public async Task<IReadOnlyList<CongTyDto>> AvailableAsync(string? maDot)
    {
        if (string.IsNullOrWhiteSpace(maDot)) return Array.Empty<CongTyDto>();
        var now = clock.GetUtcNow();
        if (await db.ChotDotThucTaps.AnyAsync(x => x.MaDot == maDot && x.TrangThai != "ChuaChot")) return Array.Empty<CongTyDto>();
        var plans = await db.CongTyTheoDots.AsNoTracking().Include(x => x.CongTy).Include(x => x.DotThucTap).Include(x => x.ViTris)
            .Where(x => x.MaDot == maDot && x.HoatDong && x.DotThucTap.TrangThai == "DangDienRa"
                && x.CongTy.TrangThai == "DaDuyet" && !x.CongTy.ChiTiepNhanTuTim && x.MoDangKy <= now && x.HanDangKy >= now).ToListAsync();
        var placements = await db.PhanBoThucTaps.AsNoTracking().Where(x => x.MaDot == maDot && x.TrangThai != "Huy")
            .Select(x => new { x.MaCongTy, x.MaViTri }).ToListAsync();
        var result = new List<CongTyDto>();
        foreach (var plan in plans)
        {
            var totalRemaining = plan.SoLuongNhan - placements.Count(x => x.MaCongTy == plan.MaCongTy);
            if (totalRemaining <= 0) continue;
            var positions = plan.ViTris.Count > 0 ? plan.ViTris : new[] { new ViTriTheoDot { TenViTri = plan.ViTriTuyen, YeuCau = plan.YeuCau, SoLuongNhan = plan.SoLuongNhan } };
            foreach (var position in positions.Where(x => x.HoatDong))
            {
                var count = position.MaViTri == null ? placements.Count(x => x.MaCongTy == plan.MaCongTy)
                    : placements.Count(x => x.MaCongTy == plan.MaCongTy && x.MaViTri == position.MaViTri);
                if (count >= position.SoLuongNhan) continue;
                result.Add(new CongTyDto { MaCongTy = plan.MaCongTy, MaDot = maDot, MaViTri = position.MaViTri,
                    TenCongTy = plan.CongTy.TenCongTy, ViTriTuyen = position.TenViTri, YeuCau = position.YeuCau,
                    SoLuongNhan = position.SoLuongNhan, DaTiepNhan = count, ConLai = Math.Min(totalRemaining, position.SoLuongNhan - count),
                    TrangThai = plan.CongTy.TrangThai, ThoiGian = plan.CongTy.ThoiGian, MoDangKy = plan.MoDangKy, HanDangKy = plan.HanDangKy });
            }
        }
        return result.OrderBy(x => x.TenCongTy).ThenBy(x => x.ViTriTuyen).ToList();
    }

    public async Task SaveAsync(string maDot, string companyId, SaveCompanyRoundRequest request, string actor)
    {
        if (string.IsNullOrWhiteSpace(actor)) throw new UnauthorizedAccessException();
        if (string.IsNullOrWhiteSpace(request.ViTriTuyen) || request.ViTriTuyen.Trim().Length > 500
            || string.IsNullOrWhiteSpace(request.YeuCau) || request.YeuCau.Length > 20000
            || string.IsNullOrWhiteSpace(request.LyDo) || request.LyDo.Trim().Length > 1000 || request.SoLuongNhan <= 0)
            throw new ArgumentException("Cần vị trí (tối đa 500 ký tự), JD (20000), chỉ tiêu dương và lý do (1000).");
        if (request.HanDangKy <= request.MoDangKy || (request.HoatDong && request.HanDangKy <= clock.GetUtcNow()))
            throw new ArgumentException("Hạn nhận đăng ký phải sau thời điểm mở; khi mở hoạt động, hạn phải còn hiệu lực.");
        if (request.ViTris is { } inputs && (inputs.Count is < 1 or > 30 || inputs.Any(x => x == null || string.IsNullOrWhiteSpace(x.TenViTri) || x.TenViTri.Trim().Length > 500
            || string.IsNullOrWhiteSpace(x.YeuCau) || x.YeuCau.Length > 20000 || x.SoLuongNhan <= 0)
            || inputs.Where(x => x.MaViTri != null).GroupBy(x => x.MaViTri).Any(g => g.Count() > 1)))
            throw new ArgumentException("Cần 1–30 vị trí, mỗi vị trí có tên, JD, chỉ tiêu dương và mã không trùng.");
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var dot = await db.DotThucTaps.SingleOrDefaultAsync(x => x.MaSo == maDot) ?? throw new KeyNotFoundException("Không tìm thấy đợt.");
        if (dot.TrangThai == "DaKetThuc") throw new InvalidOperationException("Đợt đã kết thúc, chỉ xem danh sách giới thiệu.");
        var company = await db.CongTys.SingleOrDefaultAsync(x => x.MaCongTy == companyId) ?? throw new KeyNotFoundException("Không tìm thấy DN.");
        if (company.TrangThai != "DaDuyet" || company.ChiTiepNhanTuTim) throw new InvalidOperationException("Chỉ đưa DN đã duyệt thuộc danh mục giới thiệu vào đợt; DN chỉ tiếp nhận tự tìm dùng hồ sơ riêng.");
        var row = await db.CongTyTheoDots.Include(x => x.ViTris).SingleOrDefaultAsync(x => x.MaDot == maDot && x.MaCongTy == companyId);
        if (row != null && request.PhienBan == 0) throw new InvalidOperationException("DN đã có kế hoạch trong đợt; dùng Sửa / ngừng nhận tại dòng hiện có.");
        if ((row?.PhienBan ?? 0) != request.PhienBan) throw new InvalidOperationException("Thông tin đã đổi; tải lại trước khi lưu.");
        var accepted = await db.PhanBoThucTaps.CountAsync(x => x.MaDot == maDot && x.MaCongTy == companyId && x.TrangThai != "Huy");
        if (request.SoLuongNhan < accepted) throw new InvalidOperationException("Chỉ tiêu không thể nhỏ hơn số đã tiếp nhận trong đợt.");
        var oldPositions = row?.ViTris.ToList() ?? new List<ViTriTheoDot>();
        if (request.ViTris == null && oldPositions.Count > 1) throw new InvalidOperationException("Cần gửi đầy đủ danh sách vị trí khi sửa kế hoạch nhiều JD.");
        var requested = request.ViTris ?? new[] { new SavePositionRequest(oldPositions.SingleOrDefault()?.MaViTri, request.ViTriTuyen, request.YeuCau, request.SoLuongNhan) };
        if (requested.Any(x => x.MaViTri != null && oldPositions.All(p => p.MaViTri != x.MaViTri))
            || oldPositions.Any(x => requested.All(p => p.MaViTri != x.MaViTri)))
            throw new InvalidOperationException("Mã vị trí không thuộc kế hoạch hoặc đã bị bỏ khỏi danh sách. Hãy ngừng nhận thay vì xóa vị trí cũ.");
        foreach (var input in requested.Where(x => x.MaViTri != null))
            if (input.SoLuongNhan < await db.PhanBoThucTaps.CountAsync(p => p.MaViTri == input.MaViTri && p.MaCongTy == companyId && p.MaDot == maDot && p.TrangThai != "Huy"))
                throw new InvalidOperationException("Chỉ tiêu vị trí không thể nhỏ hơn số đã tiếp nhận.");
        var before = JsonSerializer.Serialize(row == null ? null : new { row.ViTriTuyen, row.YeuCau, row.SoLuongNhan, row.MoDangKy, row.HanDangKy, row.HoatDong, row.MaGVGioiThieu, ViTris = oldPositions.Select(x => new { x.MaViTri, x.TenViTri, x.YeuCau, x.SoLuongNhan, x.HoatDong }) });
        if (row == null) { row = new() { MaDot = maDot, MaCongTy = companyId }; db.CongTyTheoDots.Add(row); }
        row.ViTriTuyen = request.ViTriTuyen.Trim(); row.YeuCau = request.YeuCau.Trim(); row.SoLuongNhan = request.SoLuongNhan;
        row.MoDangKy = request.MoDangKy.ToOffset(InternshipDeadlinePolicy.VietnamOffset);
        row.HanDangKy = request.HanDangKy.ToOffset(InternshipDeadlinePolicy.VietnamOffset); row.HoatDong = request.HoatDong; row.PhienBan++;
        foreach (var input in requested)
        {
            var position = oldPositions.SingleOrDefault(x => x.MaViTri == input.MaViTri);
            if (position == null) { position = new() { MaViTri = Guid.NewGuid().ToString(), MaCongTy = companyId, MaDot = maDot }; row.ViTris.Add(position); }
            position.TenViTri = input.TenViTri.Trim(); position.YeuCau = input.YeuCau.Trim(); position.SoLuongNhan = input.SoLuongNhan; position.HoatDong = input.HoatDong;
        }
        db.NhatKyThoiHans.Add(new() { MaNhatKy = DAL.Common.IdGenerator.New("TH"), MaDot = maDot, Loai = "CongTyTheoDot",
            Truoc = before, Sau = JsonSerializer.Serialize(new { companyId, row.ViTriTuyen, row.YeuCau, row.SoLuongNhan, row.MoDangKy, row.HanDangKy, row.HoatDong, row.MaGVGioiThieu, ViTris = row.ViTris.Select(x => new { x.MaViTri, x.TenViTri, x.YeuCau, x.SoLuongNhan, x.HoatDong }) }),
            LyDo = request.LyDo.Trim(), NguoiThucHien = actor, ThoiDiem = clock.GetUtcNow() });
        await db.SaveChangesAsync(); if (tx != null) await tx.CommitAsync();
    }
}
