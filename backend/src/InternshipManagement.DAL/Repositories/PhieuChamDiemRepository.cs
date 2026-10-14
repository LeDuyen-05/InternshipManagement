using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class PhieuChamDiemRepository : GenericRepository<PhieuChamDiem>, IPhieuChamDiemRepository
{
    public PhieuChamDiemRepository(AppDbContext context) : base(context) { }

    public async Task<IReadOnlyList<TieuChi>> GetDanhSachTieuChiAsync()
    {
        return await Context.TieuChis
            .AsNoTracking()
            .OrderBy(t => t.MaTieuChi)
            .ToListAsync();
    }

    public async Task<PhieuChamDiem?> GetPhieuChamBySinhVienAndDotAsync(string maSV, string maDot)
    {
        return await DbSet
            .Include(p => p.SinhVien)
            .Include(p => p.DotThucTap)
            .Include(p => p.GVHuongDan)
            .Include(p => p.ChiTietChamDiems)
                .ThenInclude(c => c.TieuChi)
            .FirstOrDefaultAsync(p => p.MaSV == maSV && p.MaDot == maDot);
    }

    public Task<GVHuongDan?> GetActiveAssignmentAsync(string maSV) =>
        Context.GVHuongDans.AsNoTracking().FirstOrDefaultAsync(g => g.MaSinhVien == maSV && g.TrangThai == "DangHuongDan");

    public Task<DotThucTap?> GetDotThucTapAsync(string maDot) =>
        Context.DotThucTaps.AsNoTracking().FirstOrDefaultAsync(d => d.MaSo == maDot);

    public async Task<IReadOnlyList<PhieuChamDiem>> GetDanhSachPhieuChamByGiangVienAsync(string maGV, string maDot)
    {
        return await DbSet
            .Include(p => p.SinhVien)
            .Include(p => p.ChiTietChamDiems)
                .ThenInclude(c => c.TieuChi)
            .Where(p => p.MaDot == maDot && p.GVHuongDan != null && p.GVHuongDan.MaGiangVien == maGV)
            .ToListAsync();
    }

    public async Task<PhieuChamDiem> LuuPhieuChamDiemAsync(PhieuChamDiem phieu, IEnumerable<ChiTietChamDiem> chiTiets)
    {
        var existing = await DbSet
            .Include(p => p.ChiTietChamDiems)
            .FirstOrDefaultAsync(p => p.MaSV == phieu.MaSV && p.MaDot == phieu.MaDot);

        if (existing == null)
        {
            if (string.IsNullOrWhiteSpace(phieu.MaPhieu))
            {
                phieu.MaPhieu = DAL.Common.IdGenerator.New("PCD");
            }

            phieu.NgayCham = DateTime.Now;
            await DbSet.AddAsync(phieu);

            foreach (var ct in chiTiets)
            {
                if (string.IsNullOrWhiteSpace(ct.MaSo))
                {
                    ct.MaSo = DAL.Common.IdGenerator.New("CT");
                }
                ct.MaPhieu = phieu.MaPhieu;
                await Context.ChiTietChamDiems.AddAsync(ct);
            }
        }
        else
        {
            existing.TongDiem = phieu.TongDiem;
            existing.NgayCham = DateTime.Now;
            if (!string.IsNullOrWhiteSpace(phieu.MaGVHuongDan))
                existing.MaGVHuongDan = phieu.MaGVHuongDan;

            Context.ChiTietChamDiems.RemoveRange(existing.ChiTietChamDiems);

            foreach (var ct in chiTiets)
            {
                ct.MaSo = DAL.Common.IdGenerator.New("CT");
                ct.MaPhieu = existing.MaPhieu;
                await Context.ChiTietChamDiems.AddAsync(ct);
            }
            phieu = existing;
        }

        await Context.SaveChangesAsync();
        return phieu;
    }
}
