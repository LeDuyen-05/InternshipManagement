using System.Data;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class TienDoThucTapRepository : GenericRepository<TienDoThucTap>, ITienDoThucTapRepository
{
    public TienDoThucTapRepository(AppDbContext context) : base(context) { }

    public async Task<IReadOnlyList<TienDoThucTap>> GetBySinhVienAsync(string maSV)
    {
        return await DbSet
            .AsNoTracking()
            .Include(t => t.DotThucTap)
            .Include(t => t.SinhVien)
            .Where(t => t.MaSV == maSV)
            .OrderBy(t => t.MocThoiGian)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<TienDoThucTap>> GetBySinhVienAndDotAsync(string maSV, string maDot)
    {
        return await DbSet
            .AsNoTracking()
            .Include(t => t.DotThucTap)
            .Include(t => t.SinhVien)
            .Where(t => t.MaSV == maSV && t.MaDot == maDot)
            .OrderBy(t => t.MocThoiGian)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<TienDoThucTap>> GetBaoCaoChoDuyetByGiangVienAsync(string maGV)
    {
        return await DbSet
            .AsNoTracking()
            .Include(t => t.SinhVien)
            .Include(t => t.DotThucTap)
            .Where(t => t.MaPhanBoLuuTru == null && t.TrangThaiDuyet == "DaNop" &&
                        t.SinhVien.GVHuongDans.Any(h => h.MaGiangVien == maGV && h.MaDot == t.MaDot && h.TrangThai == "DangHuongDan"))
            .OrderByDescending(t => t.NgayNop)
            .ToListAsync();
    }

    public async Task<TienDoThucTap?> GetChiTietAsync(string maTienDo)
    {
        return await DbSet
            .AsNoTracking()
            .Include(t => t.SinhVien)
            .Include(t => t.DotThucTap)
            .FirstOrDefaultAsync(t => t.MaTienDo == maTienDo);
    }

    public async Task<bool> CapNhatTrangThaiDuyetAsync(string maTienDo, string trangThaiDuyet, string? nhanXet = null)
    {
        var record = await DbSet.FirstOrDefaultAsync(t => t.MaTienDo == maTienDo);
        if (record == null) return false;
        if (record.MaPhanBoLuuTru != null) throw new InvalidOperationException("Báo cáo đã lưu trữ khi điều chỉnh nơi thực tập.");

        record.TrangThaiDuyet = trangThaiDuyet;
        if (nhanXet != null)
        {
            record.NhanXet = nhanXet;
            record.NhanXetGV = nhanXet;
        }
        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> IsSupervisorAsync(string maGV, string maSV, string maDot)
    {
        return await Context.GVHuongDans
            .AnyAsync(g => g.MaGiangVien == maGV && g.MaSinhVien == maSV && g.MaDot == maDot && g.TrangThai == "DangHuongDan");
    }

    public Task<string?> GetTrangThaiPhanBoAsync(string maSV, string maDot) =>
        Context.PhanBoThucTaps
            .Where(p => p.MaSinhVien == maSV && p.MaDot == maDot && p.TrangThai != "Huy")
            .Select(p => p.DaDuocKhoaDuyet ? p.TrangThai : "ChoKhoaDuyet")
            .FirstOrDefaultAsync();

    public Task<PhanBoThucTap?> GetActivePlacementAsync(string maSV, string maDot) => Context.PhanBoThucTaps.AsNoTracking()
        .Include(x => x.HoSoTuTim).FirstOrDefaultAsync(x => x.MaSinhVien == maSV && x.MaDot == maDot && x.DaDuocKhoaDuyet && x.TrangThai == "DangThucTap");

    public override async Task<TienDoThucTap?> GetByIdAsync(string maTienDo)
    {
        return await DbSet
            .Include(t => t.DotThucTap)
            .Include(t => t.SinhVien)
            .FirstOrDefaultAsync(t => t.MaTienDo == maTienDo);
    }

    public async Task<TienDoThucTap> CreateAsync(TienDoThucTap entity)
    {
        await DbSet.AddAsync(entity);
        await Context.SaveChangesAsync();
        return entity;
    }

    public async Task<TienDoThucTap> UpdateAsync(TienDoThucTap entity)
    {
        await using var tx = Context.Database.IsRelational() ? await Context.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        if (entity.MaPhanBoLuuTru != null) throw new InvalidOperationException("Không sửa đè báo cáo đã lưu trữ khi đổi nơi thực tập.");
        if (await Context.PhanBoThucTaps.AnyAsync(x => x.MaSinhVien == entity.MaSV && x.MaDot == entity.MaDot && x.NgayHuy != null)
            && !await Context.PhanBoThucTaps.AnyAsync(x => x.MaSinhVien == entity.MaSV && x.MaDot == entity.MaDot && x.DaDuocKhoaDuyet && x.TrangThai == "DangThucTap"))
            throw new InvalidOperationException("Nơi thực tập đã bị hủy/đang điều chỉnh, chưa được nộp báo cáo mới.");
        DbSet.Update(entity);
        await Context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
        return entity;
    }
}

