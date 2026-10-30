using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class CongTyRepository : GenericRepository<CongTy>, ICongTyRepository
{
    public CongTyRepository(AppDbContext context) : base(context) { }

    public async Task<IReadOnlyList<CongTy>> GetDanhSachTuyenDungAsync()
    {
        return await DbSet
            .Where(c => c.TrangThai == "DaDuyet" && !c.ChiTiepNhanTuTim)
            .ToListAsync();
    }

    public Task<DotThucTap?> GetDotDangDienRaAsync() =>
        Context.DotThucTaps.AsNoTracking()
            .Where(d => d.TrangThai == "DangDienRa")
            .OrderByDescending(d => d.ThoiGianBD)
            .FirstOrDefaultAsync();

    public Task<Dictionary<string, int>> DemDaTiepNhanTheoCongTyAsync(string maDot) =>
        Context.PhanBoThucTaps.AsNoTracking()
            .Where(p => p.MaDot == maDot && p.TrangThai != "Huy")
            .GroupBy(p => p.MaCongTy)
            .ToDictionaryAsync(g => g.Key, g => g.Count());

    public async Task<IReadOnlyList<CongTy>> GetDeXuatCuaSinhVienAsync(string maSV) =>
        await DbSet.AsNoTracking().Where(c => c.MaSVDeXuat == maSV && !c.ChiTiepNhanTuTim).OrderBy(c => c.TenCongTy).ToListAsync();

    public async Task<bool> ExistsByNameAsync(string tenCongTy)
    {
        var name = tenCongTy.Trim();
        return await DbSet.AnyAsync(c => c.TenCongTy.Trim().ToLower() == name.ToLower());
    }
}
