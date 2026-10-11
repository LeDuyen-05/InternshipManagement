using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class TienDoThucTapRepository : ITienDoThucTapRepository
{
    private readonly AppDbContext _context;

    public TienDoThucTapRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<TienDoThucTap>> GetBySinhVienAsync(string maSV)
    {
        return await _context.TienDoThucTaps
            .Include(t => t.DotThucTap)
            .Where(t => t.MaSV == maSV)
            .OrderBy(t => t.MocThoiGian)
            .ToListAsync();
    }

    public async Task<TienDoThucTap?> GetByIdAsync(string maTienDo)
    {
        return await _context.TienDoThucTaps
            .Include(t => t.DotThucTap)
            .FirstOrDefaultAsync(t => t.MaTienDo == maTienDo);
    }

    public async Task<TienDoThucTap> CreateAsync(TienDoThucTap entity)
    {
        await _context.TienDoThucTaps.AddAsync(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<TienDoThucTap> UpdateAsync(TienDoThucTap entity)
    {
        _context.TienDoThucTaps.Update(entity);
        await _context.SaveChangesAsync();
        return entity;
    }
}
