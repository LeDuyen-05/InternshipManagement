using System.Data;
using System.Text.Json;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class DangKyThucTapRepository : GenericRepository<DangKyThucTap>, IDangKyThucTapRepository
{
    private readonly TimeProvider _clock;
    public DangKyThucTapRepository(AppDbContext context, TimeProvider? clock = null) : base(context) { _clock = clock ?? TimeProvider.System; }

    public async Task AddWithinLimitAsync(DangKyThucTap registration, int maximum)
    {
        await using var tx = Context.Database.IsRelational() ? await Context.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        await Context.LockRoundsAsync([registration.MaDot]);
        var supportHistory = await Context.LanHoTroThucTaps.AsNoTracking().Where(x => x.MaDot == registration.MaDot && x.TrangThai != "DaXoa").ToListAsync();
        if (DAL.Common.SupportConsent.Latest(supportHistory, registration.MaSV)?.PhanHoi == "TuChoiHoTro")
            throw new InvalidOperationException("SV đã từ chối hỗ trợ; cần xác nhận nhận hỗ trợ lại trước khi đăng ký tiếp.");
        var offer = await Context.CongTyTheoDots.AsNoTracking().Include(x => x.CongTy)
            .SingleOrDefaultAsync(x => x.MaDot == registration.MaDot && x.MaCongTy == registration.MaCongTy);
        var now = _clock.GetUtcNow();
        if (offer == null || !offer.HoatDong || offer.CongTy.TrangThai != "DaDuyet" || offer.CongTy.ChiTiepNhanTuTim
            || now < offer.MoDangKy || now > offer.HanDangKy)
            throw new InvalidOperationException("DN chưa được Khoa đưa vào đợt, đang ngừng nhận hoặc ngoài thời hạn đăng ký của đợt này.");
        if (await CountDaTiepNhanAsync(registration.MaCongTy, registration.MaDot) >= offer.SoLuongNhan)
            throw new InvalidOperationException("DN đã đủ chỉ tiêu trong đợt được chọn.");
        var current = await DbSet.Where(d => d.MaSV == registration.MaSV && d.MaDot == registration.MaDot).ToListAsync();
        var supplementalSession = supportHistory.SingleOrDefault(s => s.MaLan == registration.MaLanHoTro);
        var extraRemaining = supplementalSession == null ? 0 : DAL.Common.SupplementalRegistration.Remaining(supplementalSession, registration.MaSV, current, now);
        if (current.Count >= maximum && extraRemaining == 0)
            throw new InvalidOperationException($"Đã dùng đủ {maximum} lượt đăng ký trong đợt, kể cả hồ sơ đã rút hoặc không đạt. Liên hệ Khoa để được hỗ trợ bố trí.");
        if (current.Any(d => d.MaCongTy == registration.MaCongTy))
            throw new InvalidOperationException("Sinh viên đã đăng ký công ty này trong đợt hiện tại.");
        var active = current.Where(d => d.TrangThai is "ChoDuyet" or "DaDuyet").ToList();
        if (active.Count > 0)
            throw new InvalidOperationException("Bạn đang có một hồ sơ ứng tuyển chờ xử lý trong đợt. Chỉ đăng ký công ty khác sau khi hồ sơ trước đã bị từ chối, không đạt hoặc được rút hợp lệ.");
        var sameSession = current.Where(x => x.MaLanHoTro == registration.MaLanHoTro).ToList();
        if (registration.MaLanHoTro == null && current.Any(x => x.MaLanHoTro != null)
            || extraRemaining == 0 && sameSession.Count > 0 && sameSession[0].LanDangKy < current.Max(x => x.LanDangKy))
            throw new InvalidOperationException("Không đăng ký quay lại lần cũ; chọn lần hỗ trợ hiện tại hoặc liên hệ Khoa.");
        if (sameSession.Count >= maximum && extraRemaining == 0)
            throw new InvalidOperationException("Đã dùng đủ lượt đăng ký của lần này; Khoa cần tạo lần hỗ trợ tiếp theo.");
        if (registration.MaLanHoTro != null)
        {
            var session = await Context.LanHoTroThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaLan == registration.MaLanHoTro && x.MaDot == registration.MaDot && x.TrangThai != "DaXoa")
                ?? throw new ArgumentException("Lần hỗ trợ không thuộc đợt đang đăng ký.");
            var round = await Context.DotThucTaps.AsNoTracking().SingleAsync(x => x.MaSo == registration.MaDot);
            var state = await Context.ChotDotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaDot == registration.MaDot);
            using var members = JsonDocument.Parse(session.DanhSachJson);
            var member = members.RootElement.EnumerateArray().FirstOrDefault(x => x.GetProperty("MaSV").GetString() == registration.MaSV);
            if (member.ValueKind == JsonValueKind.Undefined || member.GetProperty("KetQua").GetString() == "DaCoNoi"
                || session.NgayHoTro.Date > now.ToOffset(TimeSpan.FromHours(7)).Date
                || now.ToOffset(TimeSpan.FromHours(7)).Date >= round.ThoiGianBD.Date || round.TrangThaiDanhSachNoi != "ChuaCongBo"
                || AppDbContext.LockStatus(state, now) != "ChuaChot")
                throw new InvalidOperationException("SV không thuộc lần hỗ trợ, đã có nơi hoặc ngoài thời gian hỗ trợ được phép.");
        }
        registration.LanDangKy = sameSession.Count > 0 ? sameSession[0].LanDangKy : current.Count == 0 ? 1 : current.Max(x => x.LanDangKy) + 1;
        // Đây là lượt nối tiếp trong cả đợt, không phải xếp hạng các công ty đồng thời.
        registration.ThuTuUuTien = current.Count + 1;
        if (!await Context.DotThucTaps.AnyAsync(d => d.MaSo == registration.MaDot && d.TrangThai == "DangDienRa")
            || await Context.KhongHoanTatDots.AnyAsync(x => x.MaSV == registration.MaSV && x.MaDot == registration.MaDot && x.HieuLuc)
            || await Context.PhanBoThucTaps.AnyAsync(p => p.MaSinhVien == registration.MaSV && p.MaDot == registration.MaDot && p.TrangThai != "Huy"))
            throw new InvalidOperationException("Đợt đã đóng hoặc sinh viên vừa có nơi tiếp nhận; tải lại trước khi đăng ký.");
        var position = await DAL.Common.PositionCapacity.RequireRoomAsync(Context, registration.MaCongTy, registration.MaDot, registration.MaViTri);
        registration.MaViTri = position?.MaViTri;
        registration.ViTriDangKy = position?.TenViTri ?? offer.ViTriTuyen;
        registration.YeuCauDangKy = position?.YeuCau ?? offer.YeuCau;
        registration.NgayDangKy = now.ToOffset(TimeSpan.FromHours(7)).DateTime;
        await DbSet.AddAsync(registration);
        await Context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
    }

    public async Task<IReadOnlyList<DangKyThucTap>> GetBySinhVienAsync(string maSV)
    {
        return await DbSet
            .Include(d => d.CongTy)
            .Include(d => d.DotThucTap)
            .Where(d => d.MaSV == maSV)
            .OrderBy(d => d.ThuTuUuTien)
            .ToListAsync();
    }

    public async Task<bool> HasRegisteredAsync(string maSV, string maCongTy, string maDot)
    {
        return await DbSet
            .AnyAsync(d => d.MaSV == maSV && d.MaCongTy == maCongTy && d.MaDot == maDot);
    }

    public async Task<DotThucTap?> GetDotAsync(string maDot)
    {
        return await Context.DotThucTaps.AsNoTracking().FirstOrDefaultAsync(d => d.MaSo == maDot);
    }

    public async Task<int> CountBySinhVienDotAsync(string maSV, string maDot)
    {
        return await DbSet.CountAsync(d => d.MaSV == maSV && d.MaDot == maDot);
    }

    public async Task<bool> HasApprovedRegistrationInDotAsync(string maSV, string maDot)
    {
        return await DbSet.AnyAsync(d => d.MaSV == maSV && d.MaDot == maDot && d.TrangThai == "DaDuyet");
    }

    public Task<bool> HasActiveRegistrationInDotAsync(string maSV, string maDot) =>
        DbSet.AnyAsync(d => d.MaSV == maSV && d.MaDot == maDot && (d.TrangThai == "ChoDuyet" || d.TrangThai == "DaDuyet"));

    public Task<Common.ThamGiaDot> GetThamGiaDotAsync(string maSV, string maDot) => Common.DanhSachDot.ThamGiaAsync(Context, maSV, maDot);

    public Task<int> CountDaTiepNhanAsync(string maCongTy, string maDot) =>
        Context.PhanBoThucTaps.CountAsync(p => p.MaCongTy == maCongTy && p.MaDot == maDot && p.TrangThai != "Huy");

    public Task<bool> SinhVienDaDuocTiepNhanAsync(string maSV, string maDot) =>
        Context.PhanBoThucTaps.AnyAsync(p => p.MaSinhVien == maSV && p.MaDot == maDot && p.TrangThai != "Huy");

    public async Task<IReadOnlyList<PhanBoThucTap>> GetPhanBoConHieuLucAsync(string maSV) =>
        await Context.PhanBoThucTaps.AsNoTracking()
            .Include(p => p.CongTy)
            .Include(p => p.DotThucTap)
            .Where(p => p.MaSinhVien == maSV && p.TrangThai != "Huy")
            .ToListAsync();

    public async Task<(decimal? TongDiem, bool DaDuDiem)> GetKetQuaThucTapAsync(string maSV, string maDot)
    {
        var phieu = await Context.PhieuChamDiems.AsNoTracking()
            .Include(p => p.ChiTietChamDiems)
            .Where(p => p.MaSV == maSV && p.MaDot == maDot)
            .FirstOrDefaultAsync();
        if (phieu == null) return (null, false);
        var rubric = await Context.DotThucTaps.Where(x => x.MaSo == maDot).Select(x => x.MaRubric).SingleOrDefaultAsync();
        var criteria = await Context.TieuChis.Where(t => t.NhomDanhGia != null && t.MaRubric == rubric).ToListAsync();
        var complete = criteria.Any(x => x.NhomDanhGia == "GV") && criteria.Any(x => x.NhomDanhGia == "DN")
            && criteria.All(c => phieu.ChiTietChamDiems.Count(d => d.MaTieuChi == c.MaTieuChi && d.DiemCham >= 0 && d.DiemCham <= c.DiemToiDa
                && decimal.Round(d.DiemCham, 2) == d.DiemCham) == 1);
        return (complete ? phieu.ChiTietChamDiems.Where(d => criteria.Any(c => c.MaTieuChi == d.MaTieuChi)).Sum(d => d.DiemCham) : null, complete);
    }

    public async Task<IReadOnlyList<(string MaCongTy, string? KetQua, DateTime NgayPV, string? MaDK)>> GetKetQuaPhongVanAsync(string maSV)
    {
        var rows = await Context.PhongVans.AsNoTracking()
            .Where(p => p.MaSinhVien == maSV && !Context.PhongVans.Any(n => n.MaPVTruoc == p.MaPV))
            .Select(p => new { p.DaiDienDoanhNghiep.MaCongTy, p.KetQua, p.NgayPV, p.MaDK })
            .ToListAsync();
        return rows.Select(r => (r.MaCongTy, r.KetQua, r.NgayPV, r.MaDK)).ToList();
    }

    public async Task<bool> HasPriorityInDotAsync(string maSV, string maDot, int thuTuUuTien)
    {
        return await DbSet.AnyAsync(d => d.MaSV == maSV && d.MaDot == maDot && d.ThuTuUuTien == thuTuUuTien && (d.TrangThai == "ChoDuyet" || d.TrangThai == "DaDuyet"));
    }
}
