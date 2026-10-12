using InternshipManagement.BLL.DTOs.PhieuChamDiem;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;

namespace InternshipManagement.BLL.Services.PhieuChamDiem;

public class PhieuChamDiemService : IPhieuChamDiemService
{
    private readonly IPhieuChamDiemRepository _repo;

    public PhieuChamDiemService(IPhieuChamDiemRepository repo)
    {
        _repo = repo;
    }

    public async Task<IReadOnlyList<TieuChiDto>> GetDanhSachTieuChiAsync()
    {
        var tieuChis = await _repo.GetDanhSachTieuChiAsync();
        return tieuChis.Select(t => new TieuChiDto(t.MaTieuChi, t.TenTieuChi, t.DiemToiDa)).ToList();
    }

    public async Task<PhieuChamDiemDto?> GetPhieuChamBySinhVienAndDotAsync(string maSV, string maDot)
    {
        var entity = await _repo.GetPhieuChamBySinhVienAndDotAsync(maSV, maDot);
        if (entity == null) return null;

        return MapToDto(entity);
    }

    public async Task<IReadOnlyList<PhieuChamDiemDto>> GetDanhSachPhieuChamByGiangVienAsync(string maGV, string maDot)
    {
        var entities = await _repo.GetDanhSachPhieuChamByGiangVienAsync(maGV, maDot);
        return entities.Select(MapToDto).ToList();
    }

    public async Task<PhieuChamDiemDto> LuuPhieuChamDiemAsync(LuuPhieuChamRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.MaSV))
            throw new ArgumentException("Mã sinh viên không được để trống", nameof(request.MaSV));
        if (string.IsNullOrWhiteSpace(request.MaDot))
            throw new ArgumentException("Mã đợt thực tập không được để trống", nameof(request.MaDot));

        var tieuChis = await _repo.GetDanhSachTieuChiAsync();
        var tieuChiDict = tieuChis.ToDictionary(t => t.MaTieuChi);

        decimal tongDiem = request.TongDiem ?? 0;
        var chiTiets = new List<ChiTietChamDiem>();

        if (request.ChiTiets != null && request.ChiTiets.Count > 0)
        {
            decimal sum = 0;
            foreach (var ct in request.ChiTiets)
            {
                if (tieuChiDict.TryGetValue(ct.MaTieuChi, out var tc))
                {
                    var diem = Math.Min(ct.DiemCham, tc.DiemToiDa);
                    diem = Math.Max(diem, 0);
                    sum += diem;

                    chiTiets.Add(new ChiTietChamDiem
                    {
                        MaTieuChi = ct.MaTieuChi,
                        DiemCham = diem
                    });
                }
            }
            if (request.TongDiem == null || request.TongDiem == 0)
            {
                tongDiem = sum;
            }
        }

        var phieu = new DAL.Entities.PhieuChamDiem
        {
            MaSV = request.MaSV,
            MaDot = request.MaDot,
            MaGVHuongDan = request.MaGVHuongDan,
            TongDiem = tongDiem,
            NgayCham = DateTime.Now
        };

        var saved = await _repo.LuuPhieuChamDiemAsync(phieu, chiTiets);
        var reloaded = await _repo.GetPhieuChamBySinhVienAndDotAsync(saved.MaSV, saved.MaDot);
        return MapToDto(reloaded ?? saved);
    }

    private static PhieuChamDiemDto MapToDto(DAL.Entities.PhieuChamDiem p)
    {
        var tong = p.TongDiem ?? 0;
        string xepLoai = tong switch
        {
            >= 8.5m => "Xuất sắc (A)",
            >= 8.0m => "Giỏi (B+)",
            >= 7.0m => "Khá (B)",
            >= 6.5m => "Trung bình khá (C+)",
            >= 5.5m => "Trung bình (C)",
            >= 4.0m => "Yếu (D)",
            _ => "Không đạt (F)"
        };

        var chiTietDtos = p.ChiTietChamDiems.Select(c => new ChiTietChamDiemDto(
            c.MaSo,
            c.MaTieuChi,
            c.TieuChi?.TenTieuChi ?? c.MaTieuChi,
            c.DiemCham,
            c.TieuChi?.DiemToiDa ?? 10
        )).ToList();

        return new PhieuChamDiemDto(
            p.MaPhieu,
            p.MaSV,
            p.SinhVien?.HoTen,
            p.SinhVien?.Lop,
            p.MaDot,
            p.DotThucTap?.TenDot,
            p.MaGVHuongDan,
            p.TongDiem,
            p.NgayCham,
            xepLoai,
            chiTietDtos
        );
    }
}
