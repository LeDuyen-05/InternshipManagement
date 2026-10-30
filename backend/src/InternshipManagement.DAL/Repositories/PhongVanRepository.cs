using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class PhongVanRepository : IPhongVanRepository
{
    private readonly AppDbContext _context;

    public PhongVanRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<PhongVan>> GetBySinhVienAsync(string maSV)
    {
        return await _context.PhongVans.AsSplitQuery()
            .Include(p => p.CacBuoiThayThe).Include(p => p.NhatKy)
            .Include(p => p.DangKyThucTap)
            .Include(p => p.DaiDienDoanhNghiep)
                .ThenInclude(d => d.CongTy)
            .Where(p => p.MaSinhVien == maSV)
            .OrderByDescending(p => p.NgayPV)
            .ToListAsync();
    }
}
