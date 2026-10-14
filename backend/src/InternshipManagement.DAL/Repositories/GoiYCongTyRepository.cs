using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class GoiYCongTyRepository : IGoiYCongTyRepository
{
    private readonly AppDbContext _context;

    public GoiYCongTyRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<SinhVien?> GetSinhVienWithHoSoAsync(string maSV)
    {
        return await _context.SinhViens
            .AsNoTracking()
            .Include(s => s.HoSoNangLuc)
            .FirstOrDefaultAsync(s => s.MaSV == maSV);
    }

    public async Task<HoSoNangLuc> EnsureHoSoNangLucAsync(string maSV)
    {
        var sv = await _context.SinhViens
            .Include(s => s.HoSoNangLuc)
            .FirstOrDefaultAsync(s => s.MaSV == maSV);

        if (sv == null)
        {
            throw new ArgumentException($"Không tìm thấy sinh viên có mã '{maSV}'.");
        }

        if (sv.HoSoNangLuc != null)
        {
            return sv.HoSoNangLuc;
        }

        // Tạo mới hồ sơ năng lực nếu chưa tồn tại
        var synthesizedText = $"Sinh viên: {sv.HoTen}, Chuyên ngành: {sv.ChuyenNganh ?? "Công nghệ thông tin"}, " +
                              $"Kỹ năng: {sv.KyNang ?? ""}, Công nghệ: {sv.CongNghe ?? ""}, " +
                              $"Dự án đã làm: {sv.DuAnDaThucHien ?? ""}, GPA: {sv.Gpa ?? 3.0m}.";

        var newHoSo = new HoSoNangLuc
        {
            MaHoSo = $"HS_{sv.MaSV}",
            MaSV = sv.MaSV,
            NDHoSo = synthesizedText,
            NgayCapNhat = DateTime.Now,
        };

        await _context.HoSoNangLucs.AddAsync(newHoSo);
        await _context.SaveChangesAsync();

        return newHoSo;
    }

    public async Task<IReadOnlyList<GoiYCongTy>> GetGoiYByHoSoAsync(string maHoSo, int topK = 5)
    {
        return await _context.GoiYCongTys
            .AsNoTracking()
            .Include(g => g.CongTy)
            .Where(g => g.MaHoSo == maHoSo)
            .OrderByDescending(g => g.TyLeTuongThich)
            .Take(topK)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<CongTy>> GetCongTyDaDuyetAsync()
    {
        return await _context.CongTys
            .AsNoTracking()
            .Where(c => c.TrangThai == "DaDuyet")
            .ToListAsync();
    }

    public async Task LuuGoiYAsync(string maHoSo, IEnumerable<GoiYCongTy> danhSachGoiY)
    {
        var existing = await _context.GoiYCongTys
            .Where(g => g.MaHoSo == maHoSo)
            .ToListAsync();

        if (existing.Any())
        {
            _context.GoiYCongTys.RemoveRange(existing);
        }

        await _context.GoiYCongTys.AddRangeAsync(danhSachGoiY);
        await _context.SaveChangesAsync();
    }

    public async Task CapNhatHoSoAsync(string maSV, string? ndHoSo, string? kyNang, string? congNghe, string? duAn)
    {
        var sv = await _context.SinhViens
            .Include(s => s.HoSoNangLuc)
            .FirstOrDefaultAsync(s => s.MaSV == maSV);

        if (sv == null)
        {
            throw new ArgumentException($"Không tìm thấy sinh viên có mã '{maSV}'.");
        }

        if (!string.IsNullOrWhiteSpace(kyNang)) sv.KyNang = kyNang;
        if (!string.IsNullOrWhiteSpace(congNghe)) sv.CongNghe = congNghe;
        if (!string.IsNullOrWhiteSpace(duAn)) sv.DuAnDaThucHien = duAn;

        if (sv.HoSoNangLuc == null)
        {
            sv.HoSoNangLuc = new HoSoNangLuc
            {
                MaHoSo = $"HS_{sv.MaSV}",
                MaSV = sv.MaSV,
                NDHoSo = ndHoSo ?? $"{sv.KyNang} {sv.CongNghe} {sv.DuAnDaThucHien}",
                NgayCapNhat = DateTime.Now,
            };
            await _context.HoSoNangLucs.AddAsync(sv.HoSoNangLuc);
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(ndHoSo))
            {
                sv.HoSoNangLuc.NDHoSo = ndHoSo;
            }
            sv.HoSoNangLuc.NgayCapNhat = DateTime.Now;
        }

        await _context.SaveChangesAsync();
    }
}
