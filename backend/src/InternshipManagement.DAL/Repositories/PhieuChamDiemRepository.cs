using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class PhieuChamDiemRepository : GenericRepository<PhieuChamDiem>, IPhieuChamDiemRepository
{
    public PhieuChamDiemRepository(AppDbContext context) : base(context) { }

    public async Task<IReadOnlyList<TieuChi>> GetDanhSachTieuChiAsync()
    {
        return await Context.TieuChis
            .AsNoTracking()
            .Where(t => t.NhomDanhGia != null)
            .OrderBy(t => t.ThuTu).ThenBy(t => t.MaTieuChi)
            .ToListAsync();
    }

    public async Task<PhieuChamDiem?> GetPhieuChamBySinhVienAndDotAsync(string maSV, string maDot)
    {
        return await DbSet
            .Include(p => p.SinhVien)
            .Include(p => p.DotThucTap)
            .Include(p => p.GVHuongDan)
            .Include(p => p.ChiTietChamDiems)
                .ThenInclude(c => c.TieuChi)
            .FirstOrDefaultAsync(p => p.MaSV == maSV && p.MaDot == maDot);
    }

    public Task<GVHuongDan?> GetActiveAssignmentAsync(string maSV) =>
        Context.GVHuongDans.AsNoTracking().FirstOrDefaultAsync(g => g.MaSinhVien == maSV && g.TrangThai == "DangHuongDan");

    public Task<DotThucTap?> GetDotThucTapAsync(string maDot) =>
        Context.DotThucTaps.AsNoTracking().FirstOrDefaultAsync(d => d.MaSo == maDot);

    public async Task<IReadOnlyList<PhieuChamDiem>> GetDanhSachPhieuChamByGiangVienAsync(string maGV, string maDot)
    {
        return await DbSet
            .Include(p => p.SinhVien)
            .Include(p => p.ChiTietChamDiems)
                .ThenInclude(c => c.TieuChi)
            .Where(p => p.MaDot == maDot && p.GVHuongDan != null && p.GVHuongDan.MaGiangVien == maGV)
            .ToListAsync();
    }

    public async Task<PhieuChamDiem> LuuPhieuChamDiemAsync(PhieuChamDiem phieu, IEnumerable<ChiTietChamDiem> chiTiets)
    {
        var activeIds = await Context.TieuChis.AsNoTracking()
            .Where(t => t.NhomDanhGia != null).Select(t => t.MaTieuChi).ToListAsync();

        var existing = await DbSet
            .Include(p => p.ChiTietChamDiems)
            .FirstOrDefaultAsync(p => p.MaSV == phieu.MaSV && p.MaDot == phieu.MaDot);

        if (existing == null)
        {
            if (string.IsNullOrWhiteSpace(phieu.MaPhieu))
                phieu.MaPhieu = DAL.Common.IdGenerator.New("PCD");
            phieu.NgayCham ??= DateTime.Now;
            await DbSet.AddAsync(phieu);
            existing = phieu;
        }
        else
        {
            existing.TongDiem = phieu.TongDiem;
            existing.NgayCham = phieu.NgayCham ?? DateTime.Now;
            if (!string.IsNullOrWhiteSpace(phieu.MaGVHuongDan)) existing.MaGVHuongDan = phieu.MaGVHuongDan;
            if (!string.IsNullOrWhiteSpace(phieu.MaDaiDien)) existing.MaDaiDien = phieu.MaDaiDien;
            if (phieu.NhanXetGV != null) existing.NhanXetGV = phieu.NhanXetGV;
            if (phieu.NhanXetDN != null) existing.NhanXetDN = phieu.NhanXetDN;

            // Chi tiết của bộ tiêu chí cũ không còn hiệu lực được loại bỏ khi phiếu được chấm lại.
            var legacy = existing.ChiTietChamDiems.Where(c => !activeIds.Contains(c.MaTieuChi)).ToList();
            Context.ChiTietChamDiems.RemoveRange(legacy);
        }

        foreach (var ct in chiTiets)
        {
            var detail = existing.ChiTietChamDiems.FirstOrDefault(c => c.MaTieuChi == ct.MaTieuChi);
            if (detail != null)
            {
                detail.DiemCham = ct.DiemCham;
                continue;
            }
            ct.MaSo = DAL.Common.IdGenerator.New("CT");
            ct.MaPhieu = existing.MaPhieu;
            await Context.ChiTietChamDiems.AddAsync(ct);
        }

        await Context.SaveChangesAsync();
        return existing;
    }

    public async Task<IReadOnlyList<BangDiemNguon>> GetBangDiemNguonAsync(string maDot, string? maGV)
    {
        var phanBos = await Context.PhanBoThucTaps.AsNoTracking()
            .Include(p => p.CongTy)
            .Where(p => p.MaDot == maDot && p.TrangThai != "Huy")
            .ToListAsync();
        var phieus = await DbSet.AsNoTracking()
            .Include(p => p.ChiTietChamDiems)
            .Include(p => p.GVHuongDan!).ThenInclude(g => g.GiangVien)
            .Where(p => p.MaDot == maDot)
            .ToListAsync();

        var maSVs = phanBos.Select(p => p.MaSinhVien).Concat(phieus.Select(p => p.MaSV)).Distinct().ToList();
        var sinhViens = await Context.SinhViens.AsNoTracking().Where(s => maSVs.Contains(s.MaSV)).ToListAsync();
        var phanCongs = await Context.GVHuongDans.AsNoTracking()
            .Include(g => g.GiangVien)
            .Where(g => maSVs.Contains(g.MaSinhVien) && g.TrangThai == "DangHuongDan")
            .ToListAsync();

        var result = new List<BangDiemNguon>();
        foreach (var sv in sinhViens.OrderBy(s => s.MaSV))
        {
            var phieu = phieus.FirstOrDefault(p => p.MaSV == sv.MaSV);
            var pc = phieu?.GVHuongDan ?? phanCongs.FirstOrDefault(g => g.MaSinhVien == sv.MaSV);
            if (!string.IsNullOrWhiteSpace(maGV) && !string.Equals(pc?.MaGiangVien, maGV, StringComparison.OrdinalIgnoreCase))
                continue;

            var congTy = phanBos.Where(p => p.MaSinhVien == sv.MaSV).OrderByDescending(p => p.NgayPhanBo).FirstOrDefault()?.CongTy?.TenCongTy;
            result.Add(new BangDiemNguon(sv, congTy, pc?.MaGiangVien, pc?.GiangVien?.HoTen, phieu));
        }
        return result;
    }
}
