using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class HoSoNangLucRepository : GenericRepository<HoSoNangLuc>, IHoSoNangLucRepository
{
    public HoSoNangLucRepository(AppDbContext context) : base(context) { }

    public async Task<HoSoNangLuc?> GetByMaSinhVienAsync(string maSV)
    {
        return await DbSet
            .Include(h => h.SinhVien)
            .FirstOrDefaultAsync(h => h.MaSV == maSV);
    }
}
