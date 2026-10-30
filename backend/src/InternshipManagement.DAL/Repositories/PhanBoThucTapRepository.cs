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

    public async Task<PhanBoThucTap> ConfirmAsync(string id, string maSV, TimeProvider clock)
    {
        // Read only the round key before locking, then load fresh state under the shared round lock.
        var key = await _context.PhanBoThucTaps.AsNoTracking().Where(x => x.MaPhanBo == id)
            .Select(x => new { x.MaDot, x.MaSinhVien }).SingleOrDefaultAsync() ?? throw new KeyNotFoundException("Không tìm thấy tiếp nhận.");
        if (!string.Equals(key.MaSinhVien, maSV, StringComparison.OrdinalIgnoreCase)) throw new UnauthorizedAccessException();
        await using var tx = _context.Database.IsRelational()
            ? await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable) : null;
        await _context.LockRoundsAsync(new[] { key.MaDot });
        var pb = await GetForUpdateAsync(id) ?? throw new KeyNotFoundException();
        await _context.Entry(pb).ReloadAsync();
        if (pb.MaDot != key.MaDot) throw new DbUpdateConcurrencyException();
        await _context.Entry(pb.DotThucTap).ReloadAsync();
        if (await _context.ChotDotThucTaps.AnyAsync(x => x.MaDot == pb.MaDot && x.TrangThai != "ChuaChot"))
            throw new RoundLockedException("Đợt đã chốt/khóa; mở lại điểm không mở xác nhận nơi thực tập.");
        Common.ConfirmationDeadlinePolicy.RequireConfirmation(pb, maSV, clock.GetUtcNow());
        pb.NgaySVXacNhan = clock.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).DateTime;
        pb.TrangThai = pb.DaDuocKhoaDuyet ? "DangThucTap" : "ChoKhoaDuyet";
        await SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
        return pb;
    }

    public async Task SaveChangesAsync()
    {
        var chosen = _context.ChangeTracker.Entries<PhanBoThucTap>().Where(e => e.State == EntityState.Modified
            && e.Entity.NgaySVXacNhan != null && e.Property(p => p.NgaySVXacNhan).IsModified).Select(e => e.Entity).ToList();
        foreach (var pb in chosen)
        {
            var others = await _context.DangKyThucTaps.Where(d => d.MaSV == pb.MaSinhVien && d.MaDot == pb.MaDot && d.MaCongTy != pb.MaCongTy
                && (d.TrangThai == "ChoDuyet" || d.TrangThai == "DaDuyet")).ToListAsync();
            others.ForEach(d => { d.MaPVKetThuc = null; d.TrangThai = "TuChoi"; d.LyDoKetThuc = "Sinh viên đã xác nhận chọn nơi thực tập khác; không phải phỏng vấn không đạt."; });
        }
        await _context.SaveChangesAsync();
    }

    public async Task<PhanBoThucTap?> GetBySinhVienAsync(string maSV, string? maDot = null)
    {
        return await _context.PhanBoThucTaps
            .AsSplitQuery()
            .Include(p => p.CongTy)
            .Include(p => p.HoSoTuTim)
            .Include(p => p.ViTri)
            .Include(p => p.DotThucTap)
            .Include(p => p.HuongDanDoanhNghieps)
                .ThenInclude(hd => hd.DaiDienDoanhNghiep)
            .Include(p => p.SinhVien)
                .ThenInclude(s => s.GVHuongDans.Where(g => g.TrangThai == "DangHuongDan"))
                    .ThenInclude(gvh => gvh.GiangVien)
            .OrderByDescending(p => p.NgayPhanBo)
            .ThenByDescending(p => p.MaPhanBo)
            .FirstOrDefaultAsync(p => p.MaSinhVien == maSV && p.TrangThai != "Huy" && (maDot == null || p.MaDot == maDot));
    }
}
