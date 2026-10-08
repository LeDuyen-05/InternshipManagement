using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace InternshipManagement.DAL.Repositories;

public class GVHuongDanRepository : GenericRepository<GVHuongDan>, IGVHuongDanRepository
{
    public GVHuongDanRepository(AppDbContext context) : base(context) { }

    public async Task<IReadOnlyList<GVHuongDan>> GetDanhSachSVTheoGiangVienAsync(string maGV, string? keyword = null)
    {
        var query = DbSet
            .AsNoTracking()
            .Include(g => g.SinhVien)
                .ThenInclude(s => s.PhanBoThucTaps)
                    .ThenInclude(pb => pb.CongTy)
            .Where(g => g.MaGiangVien == maGV && g.TrangThai == "DangHuongDan");

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim().ToLower();
            query = query.Where(g => g.SinhVien.HoTen.ToLower().Contains(kw)
                                  || g.SinhVien.MaSV.ToLower().Contains(kw)
                                  || (g.SinhVien.Lop != null && g.SinhVien.Lop.ToLower().Contains(kw)));
        }

        return await query.OrderByDescending(g => g.NgayPC).ToListAsync();
    }

    public async Task<IReadOnlyList<SinhVien>> GetDanhSachSVChuaPhanCongAsync(string? keyword = null)
    {
        var query = Context.SinhViens
            .AsNoTracking()
            .Include(s => s.PhanBoThucTaps)
                .ThenInclude(pb => pb.CongTy)
            .Where(s => !s.GVHuongDans.Any(h => h.TrangThai == "DangHuongDan"));

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim().ToLower();
            query = query.Where(s => s.HoTen.ToLower().Contains(kw)
                                  || s.MaSV.ToLower().Contains(kw)
                                  || (s.Lop != null && s.Lop.ToLower().Contains(kw)));
        }

        return await query.OrderBy(s => s.MaSV).ToListAsync();
    }

    public async Task<IReadOnlyList<GiangVien>> GetDanhSachGiangVienKemTaiAsync()
    {
        return await Context.GiangViens
            .AsNoTracking()
            .Include(gv => gv.GVHuongDans.Where(h => h.TrangThai == "DangHuongDan"))
            .OrderBy(gv => gv.HoTen)
            .ToListAsync();
    }

    public async Task<GiangVien?> GetGiangVienByIdAsync(string maGV)
    {
        return await Context.GiangViens
            .AsNoTracking()
            .FirstOrDefaultAsync(g => g.MaGV == maGV);
    }

    public async Task<bool> SinhVienTonTaiAsync(string maSV)
    {
        return await Context.SinhViens
            .AsNoTracking()
            .AnyAsync(s => s.MaSV == maSV);
    }

    public async Task<GVHuongDan?> GetChiTietPhanCongAsync(string maSo)
    {
        return await DbSet
            .AsNoTracking()
            .Include(g => g.GiangVien)
            .Include(g => g.SinhVien)
                .ThenInclude(s => s.PhanBoThucTaps)
                    .ThenInclude(pb => pb.CongTy)
            .FirstOrDefaultAsync(g => g.MaSo == maSo);
    }

    public async Task<bool> SinhVienDaCoGVHDAsync(string maSV)
    {
        return await DbSet
            .AsNoTracking()
            .AnyAsync(g => g.MaSinhVien == maSV && g.TrangThai == "DangHuongDan");
    }

    public async Task<int> CountSVHienTaiByGiangVienAsync(string maGV)
    {
        return await DbSet
            .AsNoTracking()
            .CountAsync(g => g.MaGiangVien == maGV && g.TrangThai == "DangHuongDan");
    }

    public async Task<GVHuongDan> PhanCongAsync(string maGV, string maSV)
    {
        var maSo = $"HD{Guid.NewGuid():N}"[..20];
        var record = new GVHuongDan
        {
            MaSo = maSo,
            MaGiangVien = maGV,
            MaSinhVien = maSV,
            NgayPC = DateTime.Today,
            TrangThai = "DangHuongDan"
        };

        await DbSet.AddAsync(record);
        await Context.SaveChangesAsync();

        await Context.Entry(record).Reference(r => r.GiangVien).LoadAsync();
        await Context.Entry(record).Reference(r => r.SinhVien).LoadAsync();

        return record;
    }

    public async Task<bool> DoiGiangVienAsync(string maSo, string maGVMoi)
    {
        var record = await DbSet.FirstOrDefaultAsync(h => h.MaSo == maSo);
        if (record == null) return false;

        record.MaGiangVien = maGVMoi;
        record.NgayPC = DateTime.Today;
        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> HuyPhanCongAsync(string maSo)
    {
        var record = await DbSet.FirstOrDefaultAsync(h => h.MaSo == maSo);
        if (record == null) return false;

        record.TrangThai = "HuyBo";
        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CapNhatChiTieuAsync(string maGV, int soLuongMoi)
    {
        var gv = await Context.GiangViens.FirstOrDefaultAsync(g => g.MaGV == maGV);
        if (gv == null) return false;

        gv.SoLuongSVHD = soLuongMoi;
        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> operation)
    {
        await using var transaction = await Context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        try
        {
            var result = await operation();
            await transaction.CommitAsync();
            return result;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}
