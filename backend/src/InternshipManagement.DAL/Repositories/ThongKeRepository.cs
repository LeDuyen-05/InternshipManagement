using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class ThongKeRepository : IThongKeRepository
{
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
            // Kiểm tra xem có sinh viên nào có phân bổ trong đợt này không
            var hasPhanBoInDot = await _context.PhanBoThucTaps.AnyAsync(pb => pb.MaDot == maDot);
            if (hasPhanBoInDot)
            {
                return await query
                    .Where(s => s.PhanBoThucTaps.Any(pb => pb.MaDot == maDot))
                    .OrderBy(s => s.MaSV)
                    .ToListAsync();
            }
        }

        // Nếu đợt chưa phân bổ cụ thể hoặc không truyền mã đợt, lấy toàn bộ sinh viên
        return await query.OrderBy(s => s.MaSV).ToListAsync();
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
