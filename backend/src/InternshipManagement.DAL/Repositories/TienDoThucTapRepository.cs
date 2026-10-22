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

    public async Task<bool> CapNhatTrangThaiDuyetAsync(string maTienDo, string trangThaiDuyet, string? nhanXet = null)
    {
        var record = await DbSet.FirstOrDefaultAsync(t => t.MaTienDo == maTienDo);
        if (record == null) return false;

        record.TrangThaiDuyet = trangThaiDuyet;
        if (nhanXet != null)
        {
            record.NhanXet = nhanXet;
            record.NhanXetGV = nhanXet;
        }
        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> IsSupervisorAsync(string maGV, string maSV)
    {
        return await Context.GVHuongDans
            .AnyAsync(g => g.MaGiangVien == maGV && g.MaSinhVien == maSV && g.TrangThai == "DangHuongDan");
    }

    public Task<string?> GetTrangThaiPhanBoAsync(string maSV, string maDot) =>
        Context.PhanBoThucTaps
            .Where(p => p.MaSinhVien == maSV && p.MaDot == maDot && p.TrangThai != "Huy")
            .Select(p => p.TrangThai)
            .FirstOrDefaultAsync();

    public override async Task<TienDoThucTap?> GetByIdAsync(string maTienDo)
    {
        return await DbSet
            .Include(t => t.DotThucTap)
            .Include(t => t.SinhVien)
            .FirstOrDefaultAsync(t => t.MaTienDo == maTienDo);
    }

    public async Task<TienDoThucTap> CreateAsync(TienDoThucTap entity)
    {
        await DbSet.AddAsync(entity);
        await Context.SaveChangesAsync();
        return entity;
    }

    public async Task<TienDoThucTap> UpdateAsync(TienDoThucTap entity)
    {
        DbSet.Update(entity);
        await Context.SaveChangesAsync();
        return entity;
    }
}

