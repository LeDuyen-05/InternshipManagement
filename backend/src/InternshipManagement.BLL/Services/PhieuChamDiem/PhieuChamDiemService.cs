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

    public async Task<PhieuChamDiemDto> LuuPhieuChamDiemAsync(LuuPhieuChamRequest request, string? actorMaGV = null, bool isStaff = false)
    {
        if (string.IsNullOrWhiteSpace(request.MaSV))
            throw new ArgumentException("Mã sinh viên không được để trống.", nameof(request.MaSV));
        if (string.IsNullOrWhiteSpace(request.MaDot))
            throw new ArgumentException("Mã đợt thực tập không được để trống.", nameof(request.MaDot));
        if (request.ChiTiets == null || request.ChiTiets.Count == 0)
            throw new ArgumentException("Chi tiết điểm không được để trống.", nameof(request.ChiTiets));

        var dot = await _repo.GetDotThucTapAsync(request.MaDot);
        if (dot != null && string.Equals(dot.TrangThai, "DaKetThuc", StringComparison.OrdinalIgnoreCase) && !isStaff)
        {
            throw new InvalidOperationException("Đợt thực tập đã kết thúc, không thể chấm hoặc sửa điểm.");
        }

        var gvhd = await _repo.GetActiveAssignmentAsync(request.MaSV);
        if (!isStaff)
        {
            if (gvhd == null || !string.Equals(gvhd.MaGiangVien, actorMaGV, StringComparison.OrdinalIgnoreCase))
            {
                throw new UnauthorizedAccessException("Giảng viên không phụ trách hướng dẫn sinh viên này.");
            }
        }

        var tieuChis = await _repo.GetDanhSachTieuChiAsync();
        var tieuChiDict = tieuChis.ToDictionary(t => t.MaTieuChi);

        var seenTieuChi = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var chiTiets = new List<ChiTietChamDiem>();

        foreach (var ct in request.ChiTiets)
        {
            if (string.IsNullOrWhiteSpace(ct.MaTieuChi) || !tieuChiDict.TryGetValue(ct.MaTieuChi, out var tc))
            {
                throw new ArgumentException($"Tiêu chí {ct.MaTieuChi} không tồn tại.");
            }

            if (!seenTieuChi.Add(ct.MaTieuChi))
            {
                throw new ArgumentException($"Trùng lặp tiêu chí chấm điểm: {ct.MaTieuChi}.");
            }

            if (ct.DiemCham < 0 || ct.DiemCham > tc.DiemToiDa)
            {
                throw new ArgumentException($"Điểm cho tiêu chí '{tc.TenTieuChi}' phải từ 0 đến {tc.DiemToiDa}. Điểm gửi lên: {ct.DiemCham}.");
            }

            chiTiets.Add(new ChiTietChamDiem
            {
                MaTieuChi = ct.MaTieuChi,
                DiemCham = ct.DiemCham
            });
        }

        decimal tongDiem = chiTiets.Sum(c => c.DiemCham);

        var phieu = new DAL.Entities.PhieuChamDiem
        {
            MaSV = request.MaSV,
            MaDot = request.MaDot,
            MaGVHuongDan = gvhd?.MaSo,
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
