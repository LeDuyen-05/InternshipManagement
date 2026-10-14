using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class DangKyThucTapRepository : GenericRepository<DangKyThucTap>, IDangKyThucTapRepository
{
    public DangKyThucTapRepository(AppDbContext context) : base(context) { }

    public async Task<IReadOnlyList<DangKyThucTap>> GetBySinhVienAsync(string maSV)
    {
        return await DbSet
            .Include(d => d.CongTy)
            .Include(d => d.DotThucTap)
            .Where(d => d.MaSV == maSV)
            .OrderBy(d => d.ThuTuUuTien)
            .ToListAsync();
    }

    public async Task<bool> HasRegisteredAsync(string maSV, string maCongTy, string maDot)
    {
        return await DbSet
            .AnyAsync(d => d.MaSV == maSV && d.MaCongTy == maCongTy && d.MaDot == maDot);
    }

    public async Task<DotThucTap?> GetDotAsync(string maDot)
    {
        return await Context.DotThucTaps.AsNoTracking().FirstOrDefaultAsync(d => d.MaSo == maDot);
    }

    public async Task<int> CountBySinhVienDotAsync(string maSV, string maDot)
    {
        return await DbSet.CountAsync(d => d.MaSV == maSV && d.MaDot == maDot);
    }

    public async Task<bool> HasApprovedRegistrationInDotAsync(string maSV, string maDot)
    {
        return await DbSet.AnyAsync(d => d.MaSV == maSV && d.MaDot == maDot && d.TrangThai == "DaDuyet");
    }

    public async Task<bool> HasPriorityInDotAsync(string maSV, string maDot, int thuTuUuTien)
    {
        return await DbSet.AnyAsync(d => d.MaSV == maSV && d.MaDot == maDot && d.ThuTuUuTien == thuTuUuTien);
    }
}
