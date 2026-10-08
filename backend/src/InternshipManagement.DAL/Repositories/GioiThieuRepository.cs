using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class GioiThieuRepository : GenericRepository<GioiThieu>, IGioiThieuRepository
{
    public GioiThieuRepository(AppDbContext context) : base(context) { }

    public async Task<IReadOnlyList<GioiThieu>> GetWithDetailsAsync()
    {
        return await DbSet
            .AsNoTracking()
            .Include(g => g.GiangVien)
            .Include(g => g.CongTy)
            .OrderByDescending(g => g.NgayGioiThieu)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<GioiThieu>> GetByGiangVienAsync(string maGV)
    {
        return await DbSet
            .AsNoTracking()
            .Include(g => g.GiangVien)
            .Include(g => g.CongTy)
            .Where(g => g.MaGV == maGV)
            .OrderByDescending(g => g.NgayGioiThieu)
            .ToListAsync();
    }

    public async Task<bool> ExistsCongTyByNameAsync(string tenCongTy)
    {
        return await Context.CongTys.AsNoTracking().AnyAsync(c => c.TenCongTy.Trim().ToLower() == tenCongTy.Trim().ToLower());
    }

    public async Task<GioiThieu> DeXuatCongTyMoiAsync(string maGV, CongTy congTy)
    {
        await Context.CongTys.AddAsync(congTy);

        var gioiThieu = new GioiThieu
        {
            MaSo = "GT" + DateTime.UtcNow.ToString("yyMMddHHmmss"),
            MaGV = maGV,
            MaCongTy = congTy.MaCongTy,
            NgayGioiThieu = DateTime.Now,
            TrangThaiKetNoi = "DangXem"
        };
        await DbSet.AddAsync(gioiThieu);

        await Context.SaveChangesAsync();

        await Context.Entry(gioiThieu).Reference(g => g.CongTy).LoadAsync();
        await Context.Entry(gioiThieu).Reference(g => g.GiangVien).LoadAsync();

        return gioiThieu;
    }
}
