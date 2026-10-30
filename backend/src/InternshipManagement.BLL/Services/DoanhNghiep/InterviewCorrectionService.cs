using System.Data;
using PhongVanEntity = InternshipManagement.DAL.Entities.PhongVan;
using DangKyEntity = InternshipManagement.DAL.Entities.DangKyThucTap;
using System.Text.Json;
using InternshipManagement.BLL.Common;
using InternshipManagement.BLL.DTOs.DoanhNghiep;
using InternshipManagement.DAL.Common;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.DoanhNghiep;

public partial class DoanhNghiepService
{
    private static string InterviewSnapshot(PhongVanEntity p) => JsonSerializer.Serialize(new {
        p.MaPV, p.MaDK, p.MaPVTruoc, p.NgayPV, p.MaDaiDien, p.HinhThuc, p.KetQua, p.PhienBan,
        p.LyDoKetQua, p.NguonKetQua, p.NguoiGhiKetQua, p.ThoiDiemKetQua });

    private static void ValidateCorrection(DieuChinhPhongVanRequest request, string actor, string source, string? companyScope)
    {
        if (string.IsNullOrWhiteSpace(actor) || actor.Length > 20) throw new UnauthorizedAccessException();
        if (string.IsNullOrWhiteSpace(request.LyDo) || request.LyDo.Trim().Length > 1000
            || string.IsNullOrWhiteSpace(request.MaDot) || request.PhienBan is null or < 0)
            throw new ArgumentException("Cần đúng đợt, phiên bản hiện tại và lý do/căn cứ điều chỉnh (tối đa 1000 ký tự).");
        if (source is not ("DoanhNghiep" or "DNThongBao" or "SVTrinhBay")
            || (companyScope != null && source != "DoanhNghiep") || (companyScope == null && source == "DoanhNghiep"))
            throw new UnauthorizedAccessException("Nguồn điều chỉnh phải phù hợp vai trò và thông tin đã xác minh.");
    }

    private async Task<(PhongVanEntity Interview, DangKyEntity Application)> CorrectionTarget(string id, DieuChinhPhongVanRequest request, string? scope)
    {
        var pv = await _db.PhongVans.Include(x => x.DaiDienDoanhNghiep).ThenInclude(x => x.CongTy).SingleOrDefaultAsync(x => x.MaPV == id)
            ?? throw new KeyNotFoundException("Không tìm thấy buổi PV.");
        KiemTraPhamVi(scope, pv.DaiDienDoanhNghiep.MaCongTy);
        if (pv.MaDK != null && request.MaDK != null && pv.MaDK != request.MaDK) throw new InvalidOperationException("Không thay nguyện vọng/đợt của lịch PV.");
        var app = await ResolveApplicationAsync(pv.MaSinhVien, pv.DaiDienDoanhNghiep.MaCongTy, pv.MaDK ?? request.MaDK);
        if (app.MaDot != request.MaDot) throw new InvalidOperationException("Lịch PV không thuộc đợt đang xử lý.");
        return (pv, app);
    }

    private async Task RequireCorrectable(PhongVanEntity pv, DangKyEntity app, DieuChinhPhongVanRequest request)
    {
        if (pv.PhienBan != request.PhienBan) throw new DbUpdateConcurrencyException();
        if (pv.KetQua is not ("Dat" or "KhongDat" or "Vang")) throw new InvalidOperationException("Buổi chưa có kết quả; dùng ghi kết quả hoặc dời lịch thông thường.");
        if (!_interviewTime.HasStarted(pv.NgayPV)) throw new InvalidOperationException("Chưa đến giờ PV, chưa điều chỉnh kết quả.");
        if (await _db.PhongVans.AnyAsync(x => x.MaPVTruoc == pv.MaPV)) throw new InvalidOperationException("Buổi đã được thay thế. Chỉ xử lý buổi mới nhất trong nguyện vọng.");
        if (app.DotThucTap.TrangThai != "DangDienRa") throw new InvalidOperationException("Đợt không còn mở xử lý PV.");
        if (await _db.ChotDotThucTaps.AnyAsync(x => x.MaDot == app.MaDot && x.TrangThai != "ChuaChot"))
            throw new DAL.RoundLockedException("Đợt đã chốt/khóa; mở lại điểm không mở sửa PV hoặc tiếp nhận mới.");
        if (app.TrangThai == "TuChoi" && app.MaPVKetThuc != pv.MaPV)
            throw new InvalidOperationException("Hồ sơ đã kết thúc do rút/từ chối/chọn nơi khác hoặc chưa xác định rõ nguồn kết thúc; Khoa cần đối chiếu, không mở lại từ PV cũ.");
        var placements = await _db.PhanBoThucTaps.Where(x => x.MaSinhVien == app.MaSV && x.MaDot == app.MaDot).ToListAsync();
        if (placements.Any(x => x.NgayHuy != null || (x.TrangThai != "Huy" && (x.MaCongTy != app.MaCongTy
            || x.DaDuocKhoaDuyet || x.NgaySVXacNhan != null || x.TrangThai != "ChuaNhanViec")))
            || await _db.GVHuongDans.AnyAsync(x => x.MaSinhVien == app.MaSV && x.MaDot == app.MaDot && x.TrangThai == "DangHuongDan")
            || await _db.TienDoThucTaps.AnyAsync(x => x.MaSV == app.MaSV && x.MaDot == app.MaDot)
            || await _db.PhieuChamDiems.AnyAsync(x => x.MaSV == app.MaSV && x.MaDot == app.MaDot))
            throw new InvalidOperationException("SV đã xác nhận nơi, Khoa đã công nhận/chốt/điều chỉnh hoặc đã có GVHD, tiến độ, phiếu điểm. Khoa cần xử lý tại SV theo đợt & nơi thực tập; sửa PV không tự hủy quyết định học vụ.");
    }

    private async Task LockCorrection(PhongVanEntity pv, DangKyEntity app)
    {
        if (!_db.Database.IsRelational()) return;
        await _db.LockRoundsAsync(new[] { app.MaDot });
        await _db.Database.ExecuteSqlInterpolatedAsync($"SELECT [maPV] FROM [PHONGVAN] WITH (UPDLOCK,HOLDLOCK) WHERE [maPV]={pv.MaPV}");
        await _db.Entry(pv).ReloadAsync(); await _db.Entry(app).ReloadAsync(); await _db.Entry(app.DotThucTap).ReloadAsync();
    }

    public async Task<KetQuaPhongVanResult> SuaKetQuaPhongVanAsync(string id, DieuChinhPhongVanRequest request, string? scope, string actor, string source)
    {
        ValidateCorrection(request, actor, source, scope);
        var (pv, app) = await CorrectionTarget(id, request, scope);
        await using var tx = _db.Database.IsRelational() ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        await LockCorrection(pv, app);
        await RequireCorrectable(pv, app, request);
        if (request.KetQua == pv.KetQua) throw new ArgumentException("Kết quả mới phải khác kết quả hiện tại.");
        var result = await LuuKetQuaPhongVanAsync(id, request.KetQua ?? "", scope, request.LyDo, actor, source, app.MaDK, isCorrection: true);
        if (!result.ThanhCong) throw new InvalidOperationException(result.Message);
        if (tx != null) await tx.CommitAsync();
        return result with { Message = "Đã sửa kết quả nhập nhầm, lưu lịch sử trước/sau và cập nhật tiếp nhận tạm theo kết quả mới." };
    }

    public async Task<object> XepLaiPhongVanAsync(string id, DieuChinhPhongVanRequest request, string? scope, string actor, string source)
    {
        ValidateCorrection(request, actor, source, scope);
        if (!request.NgayPV.HasValue) throw new ArgumentException("Cần ngày giờ buổi PV mới.");
        var scheduled = _interviewTime.RequireFuture(request.NgayPV.Value);
        if (request.HinhThuc?.Trim().Length > 100) throw new ArgumentException("Hình thức PV quá dài.");
        var (pv, app) = await CorrectionTarget(id, request, scope);
        await using var tx = _db.Database.IsRelational() ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        await LockCorrection(pv, app);
        await RequireCorrectable(pv, app, request);
        if (pv.DaiDienDoanhNghiep.CongTy.TrangThai != "DaDuyet") throw new InvalidOperationException("DN chưa được duyệt hoặc đã bị ngừng hợp tác, không xếp buổi PV mới.");
        if (app.DotThucTap.ThoiGianKT == default || (app.DotThucTap.ThoiGianBD != default && app.DotThucTap.ThoiGianKT.Date < app.DotThucTap.ThoiGianBD.Date))
            throw new InvalidOperationException("Ngày kết thúc đợt thiếu hoặc không hợp lệ; Khoa cần kiểm tra trước khi xếp lại.");
        if (app.DotThucTap.ThoiGianKT != default && scheduled.Date > app.DotThucTap.ThoiGianKT.Date)
            throw new ArgumentException("Ngày PV mới không được sau ngày kết thúc đợt; có thể xếp trước ngày bắt đầu thực tập.");
        var repId = string.IsNullOrWhiteSpace(request.MaDaiDien) ? pv.MaDaiDien : request.MaDaiDien;
        var rep = await _db.DaiDienDoanhNghieps.SingleOrDefaultAsync(x => x.MaSo == repId)
            ?? throw new KeyNotFoundException("Không tìm thấy người PV.");
        if (rep.MaCongTy != app.MaCongTy) throw new UnauthorizedAccessException("Người PV phải thuộc đúng DN.");
        if (await _db.PhongVans.AnyAsync(x => x.MaDK == app.MaDK && x.KetQua == "ChuaCoKetQua"))
            throw new InvalidOperationException("Nguyện vọng đã có buổi đang chờ; tải lại trước khi xếp thêm.");
        var provisional = await _db.PhanBoThucTaps.SingleOrDefaultAsync(x => x.MaSinhVien == app.MaSV && x.MaDot == app.MaDot && x.TrangThai != "Huy");
        var quota = await GetChiTieuAsync(pv.DaiDienDoanhNghiep.CongTy, app.DotThucTap);
        if (quota.DaDuChiTieu && provisional == null) throw new InvalidOperationException("DN đã đủ chỉ tiêu, chưa xếp lại để tiếp nhận thêm.");
        await PositionCapacity.RequireRoomAsync(_db, app.MaCongTy, app.MaDot, app.MaViTri, provisional?.MaPhanBo, allowInactive: true);
        var before = InterviewSnapshot(pv);
        if (provisional != null) { provisional.TrangThai = "Huy"; provisional.LyDoHuy = "Hủy tiếp nhận tạm để xếp lại PV"; provisional.CanCuHuy = request.LyDo.Trim(); provisional.NguoiHuy = actor; }
        var next = new PhongVanEntity { MaPV = IdGenerator.New("PV"), MaPVTruoc = pv.MaPV, MaDK = app.MaDK,
            MaSinhVien = app.MaSV, MaDaiDien = rep.MaSo, NgayPV = scheduled, HinhThuc = string.IsNullOrWhiteSpace(request.HinhThuc) ? pv.HinhThuc : request.HinhThuc.Trim(), KetQua = "ChuaCoKetQua" };
        _db.PhongVans.Add(next); pv.MaDK = app.MaDK; pv.PhienBan++;
        app.TrangThai = "DaDuyet"; app.MaPVKetThuc = null; app.LyDoKetThuc = null;
        _db.NhatKyPhongVans.Add(new() { MaNhatKy = IdGenerator.New("NPV"), MaPV = pv.MaPV, MaPVMoi = next.MaPV, MaDK = app.MaDK,
            Loai = "XepLai", KetQuaCu = pv.KetQua, KetQuaMoi = pv.KetQua!, LyDo = request.LyDo.Trim(), Nguon = source,
            NguoiThucHien = actor, ThoiDiem = _clock.GetUtcNow(), NoiDungCu = before, NoiDungMoi = InterviewSnapshot(next) });
        await _db.SaveChangesAsync(); if (tx != null) await tx.CommitAsync();
        return new { message = "Đã tạo buổi PV thay thế, giữ kết quả buổi cũ và số lượt đăng ký. DN chủ động thông báo SV.", maPV = next.MaPV, maPVTruoc = pv.MaPV, maDK = app.MaDK };
    }

    public async Task<object> GetLichSuPhongVanAsync(string id, string? scope)
    {
        var pv = await _db.PhongVans.AsNoTracking().Include(x => x.DaiDienDoanhNghiep).SingleOrDefaultAsync(x => x.MaPV == id)
            ?? throw new KeyNotFoundException("Không tìm thấy buổi PV.");
        KiemTraPhamVi(scope, pv.DaiDienDoanhNghiep.MaCongTy);
        return await _db.NhatKyPhongVans.AsNoTracking().Where(x => x.MaPV == id || x.MaPVMoi == id).OrderBy(x => x.ThoiDiem).ThenBy(x => x.MaNhatKy).ToListAsync();
    }
}
