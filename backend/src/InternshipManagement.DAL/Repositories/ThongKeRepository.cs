using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class ThongKeRepository : IThongKeRepository
{
    public Task<ChotDotThucTap?> GetChotDotAsync(string maDot) => _context.ChotDotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaDot == maDot);
    public async Task<IReadOnlyList<KhongHoanTatDot>> GetKhongHoanTatAsync(string maDot)
        => await _context.KhongHoanTatDots.AsNoTracking().Where(x => x.MaDot == maDot && x.HieuLuc).ToListAsync();
    public async Task<IReadOnlyList<TieuChi>> GetTieuChisAsync(string maDot) => await _context.TieuChis.AsNoTracking()
        .Where(x => x.NhomDanhGia != null && _context.DotThucTaps.Any(d => d.MaSo == maDot && d.MaRubric == x.MaRubric)).ToListAsync();
    private readonly AppDbContext _context;

    public ThongKeRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DotThucTap?> GetDotThucTapAsync(string? maDot)
    {
        if (string.IsNullOrWhiteSpace(maDot))
        {
            return await _context.DotThucTaps
                .AsNoTracking()
                .OrderByDescending(d => d.TrangThai)
                .ThenByDescending(d => d.ThoiGianBD)
                .FirstOrDefaultAsync();
        }

        return await _context.DotThucTaps
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.MaSo == maDot);
    }

    public async Task<IReadOnlyList<DotThucTap>> GetAllDotThucTapAsync()
    {
        return await _context.DotThucTaps
            .AsNoTracking()
            .OrderByDescending(d => d.ThoiGianBD)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<SinhVien>> GetSinhViensAsync(string? maDot)
    {
        var query = _context.SinhViens
            .AsNoTracking()
            .Include(s => s.PhanBoThucTaps)
                .ThenInclude(pb => pb.CongTy)
            .Include(s => s.GVHuongDans)
                .ThenInclude(h => h.GiangVien);

        if (!string.IsNullOrWhiteSpace(maDot))
        {
            var ids = _context.SinhVienThamGiaDots.Where(x => x.MaDot == maDot && x.DangThamGia).Select(x => x.MaSV)
                .Union(_context.DangKyThucTaps.Where(x => x.MaDot == maDot).Select(x => x.MaSV))
                .Union(_context.PhanBoThucTaps.Where(x => x.MaDot == maDot).Select(x => x.MaSinhVien))
                .Union(_context.DeXuatThucTapTuTims.Where(x => x.MaDot == maDot).Select(x => x.MaSV))
                .Union(_context.GVHuongDans.Where(x => x.MaDot == maDot).Select(x => x.MaSinhVien))
                .Union(_context.TienDoThucTaps.Where(x => x.MaDot == maDot).Select(x => x.MaSV))
                .Union(_context.PhieuChamDiems.Where(x => x.MaDot == maDot).Select(x => x.MaSV));
            return await query.Where(x => ids.Contains(x.MaSV)).OrderBy(x => x.MaSV).ToListAsync();
        }

        return Array.Empty<SinhVien>();
    }

    public async Task<IReadOnlyList<GVHuongDan>> GetGVHuongDansAsync()
    {
        return await _context.GVHuongDans
            .AsNoTracking()
            .Include(g => g.GiangVien)
            .Include(g => g.SinhVien)
            .Where(g => g.TrangThai == "DangHuongDan")
            .ToListAsync();
    }

    public async Task<IReadOnlyList<GiangVien>> GetGiangViensKemTaiAsync()
    {
        return await _context.GiangViens
            .AsNoTracking()
            .Include(gv => gv.GVHuongDans.Where(h => h.TrangThai == "DangHuongDan"))
            .OrderBy(gv => gv.HoTen)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<TienDoThucTap>> GetTienDoThucTapsAsync(string? maDot)
    {
        var query = _context.TienDoThucTaps.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(maDot))
        {
            query = query.Where(t => t.MaDot == maDot);
        }

        return await query.ToListAsync();
    }

    public async Task<IReadOnlyList<PhieuChamDiem>> GetPhieuChamDiemsAsync(string? maDot)
    {
        IQueryable<PhieuChamDiem> query = _context.PhieuChamDiems
            .AsNoTracking()
            .Include(p => p.SinhVien)
            .Include(p => p.GVHuongDan)
                .ThenInclude(h => h!.GiangVien)
            .Include(p => p.ChiTietChamDiems)
                .ThenInclude(c => c.TieuChi);

        if (!string.IsNullOrWhiteSpace(maDot))
        {
            query = query.Where(p => p.MaDot == maDot);
        }

        return await query.ToListAsync();
    }
}
