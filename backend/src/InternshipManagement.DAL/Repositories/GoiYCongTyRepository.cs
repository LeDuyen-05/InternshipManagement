using System.Data;
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
        var synthesizedText = string.Join(". ", new[] { sv.ChuyenNganh, sv.KyNang, sv.CongNghe, sv.DuAnDaThucHien }
            .Where(x => !string.IsNullOrWhiteSpace(x)));

        var newHoSo = new HoSoNangLuc
        {
            MaHoSo = DAL.Common.IdGenerator.New("HS"),
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
            .Where(c => c.TrangThai == "DaDuyet" && !c.ChiTiepNhanTuTim)
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
        // Giữ kiểm tra hồ sơ chưa tồn tại và lần ghi đầu tiên trong cùng transaction.
        await using var tx = _context.Database.IsRelational() && _context.Database.CurrentTransaction is null
            ? await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var sv = await _context.SinhViens
            .Include(s => s.HoSoNangLuc)
            .FirstOrDefaultAsync(s => s.MaSV == maSV);

        if (sv == null)
        {
            throw new ArgumentException($"Không tìm thấy sinh viên có mã '{maSV}'.");
        }

        if (kyNang is not null) sv.KyNang = string.IsNullOrWhiteSpace(kyNang) ? null : kyNang.Trim();
        if (congNghe is not null) sv.CongNghe = string.IsNullOrWhiteSpace(congNghe) ? null : congNghe.Trim();
        if (duAn is not null) sv.DuAnDaThucHien = string.IsNullOrWhiteSpace(duAn) ? null : duAn.Trim();

        if (sv.HoSoNangLuc == null)
        {
            sv.HoSoNangLuc = new HoSoNangLuc
            {
                MaHoSo = DAL.Common.IdGenerator.New("HS"),
                MaSV = sv.MaSV,
                NDHoSo = ndHoSo?.Trim() ?? "",
                NgayCapNhat = DateTime.Now,
            };
            await _context.HoSoNangLucs.AddAsync(sv.HoSoNangLuc);
        }
        else
        {
            if (ndHoSo is not null)
            {
                sv.HoSoNangLuc.NDHoSo = ndHoSo.Trim();
            }
            sv.HoSoNangLuc.NgayCapNhat = DateTime.Now;
        }

        await _context.SaveChangesAsync();
        if (tx is not null) await tx.CommitAsync();
    }
}
