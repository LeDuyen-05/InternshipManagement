using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class TienDoThucTapRepository : GenericRepository<TienDoThucTap>, ITienDoThucTapRepository
{
    public TienDoThucTapRepository(AppDbContext context) : base(context) { }

    public async Task<IReadOnlyList<TienDoThucTap>> GetBySinhVienAsync(string maSV)
    {
        return await DbSet
            .AsNoTracking()
            .Include(t => t.DotThucTap)
            .Include(t => t.SinhVien)
            .Where(t => t.MaSV == maSV)
            .OrderBy(t => t.MocThoiGian)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<TienDoThucTap>> GetBySinhVienAndDotAsync(string maSV, string maDot)
    {
        return await DbSet
            .AsNoTracking()
            .Include(t => t.DotThucTap)
            .Include(t => t.SinhVien)
            .Where(t => t.MaSV == maSV && t.MaDot == maDot)
            .OrderBy(t => t.MocThoiGian)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<TienDoThucTap>> GetBaoCaoChoDuyetByGiangVienAsync(string maGV)
    {
        return await DbSet
            .AsNoTracking()
            .Include(t => t.SinhVien)
            .Include(t => t.DotThucTap)
            .Where(t => t.TrangThaiDuyet == "DaNop" &&
                        t.SinhVien.GVHuongDans.Any(h => h.MaGiangVien == maGV && h.TrangThai == "DangHuongDan"))
            .OrderByDescending(t => t.NgayNop)
            .ToListAsync();
    }

    public async Task<TienDoThucTap?> GetChiTietAsync(string maTienDo)
    {
        return await DbSet
            .AsNoTracking()
            .Include(t => t.SinhVien)
            .Include(t => t.DotThucTap)
            .FirstOrDefaultAsync(t => t.MaTienDo == maTienDo);
    }

    public async Task<bool> CapNhatTrangThaiDuyetAsync(string maTienDo, string trangThaiDuyet)
    {
        var record = await DbSet.FirstOrDefaultAsync(t => t.MaTienDo == maTienDo);
        if (record == null) return false;

        record.TrangThaiDuyet = trangThaiDuyet;
        await Context.SaveChangesAsync();
        return true;
    }
}
