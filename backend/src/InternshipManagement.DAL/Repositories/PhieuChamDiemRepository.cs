using System.Data;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class PhieuChamDiemRepository : GenericRepository<PhieuChamDiem>, IPhieuChamDiemRepository
{
    public PhieuChamDiemRepository(AppDbContext context) : base(context) { }

    public Task<bool> CanEnterpriseGradeAsync(string maSV, string maDot, string maDaiDien) =>
        Context.PhanBoThucTaps.AnyAsync(p => p.MaSinhVien == maSV && p.MaDot == maDot && p.DaDuocKhoaDuyet && (p.TrangThai == "DangThucTap" || p.TrangThai == "HoanThanh")
            && Context.DaiDienDoanhNghieps.Any(d => d.MaSo == maDaiDien && d.MaCongTy == p.MaCongTy));

    public async Task<IReadOnlyList<TieuChi>> GetDanhSachTieuChiAsync(string maDot)
    {
        var rubric = await Context.DotThucTaps.Where(d => d.MaSo == maDot)
            .Select(d => d.MaRubric).FirstOrDefaultAsync();
        if (rubric == null) return Array.Empty<TieuChi>();
        return await Context.TieuChis
            .AsNoTracking()
            .Where(t => t.NhomDanhGia != null && t.MaRubric == rubric)
            .OrderBy(t => t.MaCLO).ThenBy(t => t.ThuTu).ThenBy(t => t.MaTieuChi)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<TieuChi>> GetDanhSachTieuChiAsync()
    {
        return await Context.TieuChis
            .AsNoTracking()
            .Where(t => t.NhomDanhGia != null)
            .OrderBy(t => t.ThuTu).ThenBy(t => t.MaTieuChi)
            .ToListAsync();
    }

    public Task<DotThucTap?> GetDotThucTapAsync(string maDot) =>
        Context.DotThucTaps.AsNoTracking().FirstOrDefaultAsync(d => d.MaSo == maDot);

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

    public Task<GVHuongDan?> GetActiveAssignmentAsync(string maSV, string maDot) =>
        Context.GVHuongDans.AsNoTracking().FirstOrDefaultAsync(g => g.MaSinhVien == maSV && g.MaDot == maDot && g.TrangThai == "DangHuongDan"
            && Context.PhanBoThucTaps.Any(p => p.MaSinhVien == maSV && p.MaDot == maDot && p.TrangThai != "Huy" && p.DaDuocKhoaDuyet));

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
        await using var tx = Context.Database.IsRelational() ? await Context.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        if (await Context.PhanBoThucTaps.AnyAsync(p => p.MaSinhVien == phieu.MaSV && p.MaDot == phieu.MaDot && p.NgayHuy != null))
        {
            var current = await Context.PhanBoThucTaps.AsNoTracking().SingleOrDefaultAsync(p => p.MaSinhVien == phieu.MaSV
                && p.MaDot == phieu.MaDot && p.TrangThai != "Huy" && p.DaDuocKhoaDuyet);
            if (current == null || current.TrangThai is not ("DangThucTap" or "HoanThanh"))
                throw new InvalidOperationException("Nơi thực tập đã bị hủy/đang điều chỉnh. Không ghi điểm vào hồ sơ không còn hiệu lực.");
            if (phieu.MaDaiDien != null && !await Context.DaiDienDoanhNghieps.AnyAsync(d => d.MaSo == phieu.MaDaiDien && d.MaCongTy == current.MaCongTy))
                throw new UnauthorizedAccessException("Đại diện nơi cũ không được chấm cho nơi mới.");
        }
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
            existing.DaDoiChieuPhieuDN = phieu.DaDoiChieuPhieuDN;
            if (phieu.GhiChuPhieuDN != null) existing.GhiChuPhieuDN = phieu.GhiChuPhieuDN;

            // Giữ chi tiết rubric cũ làm lịch sử. Các service đọc/tính điểm lọc theo rubric đúng đợt;
            // lưu lại không được xóa lịch sử hoặc làm lần sửa trong cửa sổ mở lại bị chặn vì DELETE.
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
        if (tx != null) await tx.CommitAsync();
        return existing;
    }

    public async Task<IReadOnlyList<BangDiemNguon>> GetBangDiemNguonAsync(string maDot, string? maGV)
    {
        var phanBos = await Context.PhanBoThucTaps.AsNoTracking()
            .Include(p => p.CongTy)
            .Where(p => p.MaDot == maDot && p.DaDuocKhoaDuyet && (p.TrangThai == "DangThucTap" || p.TrangThai == "HoanThanh"))
            .ToListAsync();
        var phieus = await DbSet.AsNoTracking()
            .Include(p => p.ChiTietChamDiems)
            .Include(p => p.GVHuongDan!).ThenInclude(g => g.GiangVien)
            .Where(p => p.MaDot == maDot)
            .ToListAsync();

        var participantIds = await Context.SinhVienThamGiaDots.Where(x => x.MaDot == maDot && x.DangThamGia).Select(x => x.MaSV)
            .Union(Context.PhanBoThucTaps.Where(x => x.MaDot == maDot).Select(x => x.MaSinhVien))
            .Union(Context.DangKyThucTaps.Where(x => x.MaDot == maDot).Select(x => x.MaSV))
            .Union(Context.DeXuatThucTapTuTims.Where(x => x.MaDot == maDot).Select(x => x.MaSV))
            .Union(Context.GVHuongDans.Where(x => x.MaDot == maDot).Select(x => x.MaSinhVien))
            .Union(Context.TienDoThucTaps.Where(x => x.MaDot == maDot).Select(x => x.MaSV)).ToListAsync();
        var nonCompletion = (await Context.KhongHoanTatDots.AsNoTracking().Where(x => x.MaDot == maDot && x.HieuLuc).Select(x => x.MaSV).ToListAsync()).ToHashSet();
        var maSVs = participantIds.Concat(phieus.Select(p => p.MaSV)).Distinct().ToList();
        var sinhViens = await Context.SinhViens.AsNoTracking().Where(s => maSVs.Contains(s.MaSV)).ToListAsync();
        var phanCongs = await Context.GVHuongDans.AsNoTracking()
            .Include(g => g.GiangVien)
            .Where(g => maSVs.Contains(g.MaSinhVien) && g.MaDot == maDot && g.TrangThai == "DangHuongDan")
            .ToListAsync();

        var result = new List<BangDiemNguon>();
        foreach (var sv in sinhViens.OrderBy(s => s.MaSV))
        {
            var phieu = phieus.FirstOrDefault(p => p.MaSV == sv.MaSV);
            var pc = phieu?.GVHuongDan ?? phanCongs.FirstOrDefault(g => g.MaSinhVien == sv.MaSV);
            if (!string.IsNullOrWhiteSpace(maGV) && !string.Equals(pc?.MaGiangVien, maGV, StringComparison.OrdinalIgnoreCase))
                continue;

            var congTy = phanBos.Where(p => p.MaSinhVien == sv.MaSV).OrderByDescending(p => p.NgayPhanBo).FirstOrDefault()?.CongTy?.TenCongTy;
            result.Add(new BangDiemNguon(sv, congTy, pc?.MaGiangVien, pc?.GiangVien?.HoTen, phieu, nonCompletion.Contains(sv.MaSV)));
        }
        return result;
    }
}
