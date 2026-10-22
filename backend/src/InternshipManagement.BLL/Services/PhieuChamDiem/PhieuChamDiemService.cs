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

    public async Task<IReadOnlyList<TieuChiDto>> GetDanhSachTieuChiAsync(string maDot)
    {
        var tieuChis = await _repo.GetDanhSachTieuChiAsync(maDot);
        return tieuChis.Select(t => new TieuChiDto(t.MaTieuChi, t.MaCLO, t.TenTieuChi, t.DiemToiDa)).ToList();
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
        if (request.ChiTiets == null || request.ChiTiets.Count == 0)
            throw new ArgumentException("Chi tiết điểm không được để trống", nameof(request.ChiTiets));

        var dot = await _repo.GetDotThucTapAsync(request.MaDot)
            ?? throw new ArgumentException("Không tìm thấy đợt thực tập.", nameof(request.MaDot));
        var tieuChis = await _repo.GetDanhSachTieuChiAsync(request.MaDot);
        var tieuChiDict = tieuChis.ToDictionary(t => t.MaTieuChi);

        if (request.ChiTiets.Count != tieuChis.Count || request.ChiTiets.Select(x => x.MaTieuChi).Distinct().Count() != tieuChis.Count || request.ChiTiets.Any(x => !tieuChiDict.ContainsKey(x.MaTieuChi)))
            throw new ArgumentException("Phiếu chấm phải có đầy đủ các tiêu chí thuộc rubric của đợt thực tập.");

        if (string.Equals(dot.MaRubric, "CNTT_CLO_V1", StringComparison.OrdinalIgnoreCase) && !request.DaDoiChieuPhieuDN)
            throw new ArgumentException("Cần xác nhận đã đối chiếu phiếu nhận xét doanh nghiệp trước khi chốt CLO4.1 và CLO4.2.");

        decimal tongDiem = 0;
        var chiTiets = new List<ChiTietChamDiem>();

        if (request.ChiTiets.Count > 0)
        {
            decimal sum = 0;
            foreach (var ct in request.ChiTiets)
            {
                var tc = tieuChiDict[ct.MaTieuChi];
                if (ct.DiemCham < 0 || ct.DiemCham > tc.DiemToiDa)
                    throw new ArgumentException($"Điểm cho tiêu chí '{tc.TenTieuChi}' phải từ 0 đến {tc.DiemToiDa}.");
                sum += ct.DiemCham;
                chiTiets.Add(new ChiTietChamDiem { MaTieuChi = ct.MaTieuChi, DiemCham = ct.DiemCham });
            }
            tongDiem = sum;
        }

        var phieu = new DAL.Entities.PhieuChamDiem
        {
            MaSV = request.MaSV,
            MaDot = request.MaDot,
            MaGVHuongDan = request.MaGVHuongDan,
            TongDiem = tongDiem,
            NgayCham = DateTime.Now,
            NhanXetGV = request.NhanXetGV,
            DaDoiChieuPhieuDN = request.DaDoiChieuPhieuDN,
            GhiChuPhieuDN = request.GhiChuPhieuDN
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
            p.NhanXetGV,
            p.DaDoiChieuPhieuDN,
            p.GhiChuPhieuDN,
            chiTietDtos
        );
    }
}
