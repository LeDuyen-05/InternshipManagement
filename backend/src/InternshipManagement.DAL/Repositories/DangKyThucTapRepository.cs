using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class DangKyThucTapRepository : GenericRepository<DangKyThucTap>, IDangKyThucTapRepository
{
    public DangKyThucTapRepository(AppDbContext context) : base(context) { }

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

    public async Task<IReadOnlyList<(string MaCongTy, string? KetQua, DateTime NgayPV)>> GetKetQuaPhongVanAsync(string maSV)
    {
        var rows = await Context.PhongVans.AsNoTracking()
            .Where(p => p.MaSinhVien == maSV)
            .Select(p => new { p.DaiDienDoanhNghiep.MaCongTy, p.KetQua, p.NgayPV })
            .ToListAsync();
        return rows.Select(r => (r.MaCongTy, r.KetQua, r.NgayPV)).ToList();
    }

    public async Task<bool> HasPriorityInDotAsync(string maSV, string maDot, int thuTuUuTien)
    {
        return await DbSet.AnyAsync(d => d.MaSV == maSV && d.MaDot == maDot && d.ThuTuUuTien == thuTuUuTien);
    }
}
