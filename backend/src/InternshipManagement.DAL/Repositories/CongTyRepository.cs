using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class CongTyRepository : GenericRepository<CongTy>, ICongTyRepository
{
    public CongTyRepository(AppDbContext context) : base(context) { }

    public async Task<IReadOnlyList<CongTy>> GetDanhSachTuyenDungAsync()
    {
        return await DbSet
            .Where(c => c.TrangThai == "DaDuyet")
            .ToListAsync();
    }

    public async Task<bool> ExistsByNameAsync(string tenCongTy)
    {
        var name = tenCongTy.Trim();
        return await DbSet.AnyAsync(c => c.TenCongTy.Trim().ToLower() == name.ToLower());
    }
}
