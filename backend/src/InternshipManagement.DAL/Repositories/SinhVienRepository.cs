using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class SinhVienRepository : GenericRepository<SinhVien>, ISinhVienRepository
{
    public SinhVienRepository(AppDbContext context) : base(context) { }

    public async Task<SinhVien?> GetByIdWithHoSoAsync(string maSV)
        => await DbSet.Include(s => s.HoSoNangLuc).FirstOrDefaultAsync(s => s.MaSV == maSV);
}
