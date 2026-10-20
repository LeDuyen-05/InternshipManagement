using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class PhanBoThucTapRepository : IPhanBoThucTapRepository
{
    private readonly AppDbContext _context;

    public PhanBoThucTapRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<PhanBoThucTap?> GetForUpdateAsync(string maPhanBo) =>
        _context.PhanBoThucTaps.Include(p => p.DotThucTap).FirstOrDefaultAsync(p => p.MaPhanBo == maPhanBo);

    public Task SaveChangesAsync() => _context.SaveChangesAsync();

    public async Task<PhanBoThucTap?> GetBySinhVienAsync(string maSV)
    {
        return await _context.PhanBoThucTaps
            .AsSplitQuery()
            .Include(p => p.CongTy)
            .Include(p => p.DotThucTap)
            .Include(p => p.HuongDanDoanhNghieps)
                .ThenInclude(hd => hd.DaiDienDoanhNghiep)
            .Include(p => p.SinhVien)
                .ThenInclude(s => s.GVHuongDans.Where(g => g.TrangThai == "DangHuongDan"))
                    .ThenInclude(gvh => gvh.GiangVien)
            .OrderByDescending(p => p.NgayPhanBo)
            .FirstOrDefaultAsync(p => p.MaSinhVien == maSV && p.TrangThai != "Huy");
    }
}
