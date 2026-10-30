using System.Data;
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
        var offer = await Context.CongTyTheoDots.AsNoTracking().Include(x => x.CongTy)
            .SingleOrDefaultAsync(x => x.MaDot == registration.MaDot && x.MaCongTy == registration.MaCongTy);
        var now = _clock.GetUtcNow();
        if (offer == null || !offer.HoatDong || offer.CongTy.TrangThai != "DaDuyet" || offer.CongTy.ChiTiepNhanTuTim
            || now < offer.MoDangKy || now > offer.HanDangKy)
            throw new InvalidOperationException("DN chưa được Khoa đưa vào đợt, đang ngừng nhận hoặc ngoài thời hạn đăng ký của đợt này.");
        if (await CountDaTiepNhanAsync(registration.MaCongTy, registration.MaDot) >= offer.SoLuongNhan)
            throw new InvalidOperationException("DN đã đủ chỉ tiêu trong đợt được chọn.");
        var current = await DbSet.Where(d => d.MaSV == registration.MaSV && d.MaDot == registration.MaDot).ToListAsync();
        if (current.Count >= maximum) throw new InvalidOperationException($"Đã dùng đủ {maximum} lượt đăng ký trong đợt, liên hệ Khoa hỗ trợ bố trí.");
        if (current.Any(d => d.MaCongTy == registration.MaCongTy || d.ThuTuUuTien == registration.ThuTuUuTien))
            throw new InvalidOperationException("Công ty hoặc thứ tự ưu tiên đã có trong lịch sử đăng ký đợt này.");
        if (!await Context.DotThucTaps.AnyAsync(d => d.MaSo == registration.MaDot && d.TrangThai == "DangDienRa")
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
            .Where(p => p.MaSV == maSV && p.MaDot == maDot)
            .Select(p => new
            {
                p.TongDiem,
                SoTieuChiDaCham = p.ChiTietChamDiems.Count(c => c.TieuChi.NhomDanhGia != null)
            })
            .FirstOrDefaultAsync();
        if (phieu == null) return (null, false);
        var soTieuChi = await Context.TieuChis.CountAsync(t => t.NhomDanhGia != null);
        return (phieu.TongDiem, soTieuChi > 0 && phieu.SoTieuChiDaCham >= soTieuChi);
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
        return await DbSet.AnyAsync(d => d.MaSV == maSV && d.MaDot == maDot && d.ThuTuUuTien == thuTuUuTien);
    }
}
