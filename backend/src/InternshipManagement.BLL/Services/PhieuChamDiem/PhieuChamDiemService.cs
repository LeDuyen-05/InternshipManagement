using InternshipManagement.BLL.Common;
using InternshipManagement.BLL.DTOs.PhieuChamDiem;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;

namespace InternshipManagement.BLL.Services.PhieuChamDiem;

public class PhieuChamDiemService : IPhieuChamDiemService
{
    private readonly IPhieuChamDiemRepository _repo;
    private readonly TimeProvider _clock;

    public PhieuChamDiemService(IPhieuChamDiemRepository repo, TimeProvider? clock = null)
    {
        _repo = repo;
        _clock = clock ?? TimeProvider.System;
    }

    public async Task<IReadOnlyList<TieuChiDto>> GetDanhSachTieuChiAsync(string? maDot = null, string? nhomDanhGia = null)
    {
        IReadOnlyList<TieuChi> tieuChis;
        if (!string.IsNullOrWhiteSpace(maDot))
        {
            tieuChis = await _repo.GetDanhSachTieuChiAsync(maDot);
        }
        else
        {
            tieuChis = await _repo.GetDanhSachTieuChiAsync();
        }

        return tieuChis
            .Where(t => string.IsNullOrWhiteSpace(nhomDanhGia) || string.Equals(t.NhomDanhGia, nhomDanhGia, StringComparison.OrdinalIgnoreCase))
            .Select(ToDto)
            .ToList();
    }

    public async Task<PhieuChamDiemDto?> GetPhieuChamBySinhVienAndDotAsync(string maSV, string maDot)
    {
        var entity = await _repo.GetPhieuChamBySinhVienAndDotAsync(maSV, maDot);
        if (entity == null) return null;

        var tieuChis = await _repo.GetDanhSachTieuChiAsync(maDot);
        return MapToDto(entity, tieuChis);
    }

    public async Task<IReadOnlyList<PhieuChamDiemDto>> GetDanhSachPhieuChamByGiangVienAsync(string maGV, string maDot)
    {
        var entities = await _repo.GetDanhSachPhieuChamByGiangVienAsync(maGV, maDot);
        var tieuChis = await _repo.GetDanhSachTieuChiAsync(maDot);
        return entities.Select(e => MapToDto(e, tieuChis)).ToList();
    }

    /// <summary>
    /// GVHD (hoặc Khoa) chấm phần của giảng viên: CLO1.1 → CLO3.4.
    /// Điểm doanh nghiệp chỉ do doanh nghiệp cập nhật.
    /// </summary>
    public async Task<PhieuChamDiemDto> LuuPhieuChamDiemAsync(LuuPhieuChamRequest request, string? actorMaGV = null, bool isStaff = false)
    {
        if (string.IsNullOrWhiteSpace(request.MaSV))
            throw new ArgumentException("Mã sinh viên không được để trống.", nameof(request.MaSV));
        if (string.IsNullOrWhiteSpace(request.MaDot))
            throw new ArgumentException("Mã đợt thực tập không được để trống.", nameof(request.MaDot));
        if (request.ChiTiets == null || request.ChiTiets.Count == 0)
            throw new ArgumentException("Chi tiết điểm không được để trống.", nameof(request.ChiTiets));

        var gvhd = await _repo.GetActiveAssignmentAsync(request.MaSV, request.MaDot);
        if (!isStaff)
        {
            if (gvhd == null || !string.Equals(gvhd.MaGiangVien, actorMaGV, StringComparison.OrdinalIgnoreCase))
                throw new UnauthorizedAccessException("Giảng viên không phụ trách hướng dẫn sinh viên này.");
        }

        var tieuChis = await _repo.GetDanhSachTieuChiAsync(request.MaDot);
        if (tieuChis == null || tieuChis.Count == 0)
            throw new InvalidOperationException("Đợt thực tập chưa cấu hình tiêu chí chấm điểm.");

        var tieuChiDict = tieuChis.ToDictionary(t => t.MaTieuChi);

        var existing = await _repo.GetPhieuChamBySinhVienAndDotAsync(request.MaSV, request.MaDot);
        var coChamDN = request.ChiTiets.Any(c => tieuChiDict.TryGetValue(c.MaTieuChi, out var tc)
            && tc.NhomDanhGia == ThangDiem.NhomDoanhNghiep);
        if (coChamDN)
            throw new UnauthorizedAccessException("Điểm doanh nghiệp chỉ do doanh nghiệp cập nhật. GVHD chỉ được xem.");
        await EnsureDotChoPhepChamAsync(request.MaDot, false);

        var chiTiets = new List<ChiTietChamDiem>();
        foreach (var (input, tc) in ValidateChiTiets(request.ChiTiets, tieuChis))
            chiTiets.Add(new ChiTietChamDiem { MaTieuChi = tc.MaTieuChi, DiemCham = input.DiemCham });

        var phieu = new DAL.Entities.PhieuChamDiem
        {
            MaSV = request.MaSV,
            MaDot = request.MaDot,
            MaGVHuongDan = gvhd?.MaSo ?? request.MaGVHuongDan,
            TongDiem = TinhTongSauKhiGop(existing, chiTiets, tieuChis),
            NgayCham = _clock.GetUtcNow().ToOffset(InternshipDeadlinePolicy.VietnamOffset).DateTime,
            NhanXetGV = request.NhanXetGV?.Trim() ?? request.NhanXet?.Trim(),
            DaDoiChieuPhieuDN = coChamDN ? request.DaDoiChieuPhieuDN : existing?.DaDoiChieuPhieuDN ?? false,
            GhiChuPhieuDN = coChamDN ? request.GhiChuPhieuDN?.Trim() : existing?.GhiChuPhieuDN
        };

        var saved = await _repo.LuuPhieuChamDiemAsync(phieu, chiTiets);
        var reloaded = await _repo.GetPhieuChamBySinhVienAndDotAsync(saved.MaSV, saved.MaDot);
        return MapToDto(reloaded ?? saved, tieuChis);
    }

    public async Task<PhieuChamDiemDto> LuuDiemDoanhNghiepAsync(string maSV, string maDot, string maDaiDien,
        IReadOnlyList<ChiTietDiemInput> chiTietInputs, string? nhanXet, bool isStaff = false)
    {
        if (!await _repo.CanEnterpriseGradeAsync(maSV, maDot, maDaiDien))
            throw new UnauthorizedAccessException("Doanh nghiệp không phụ trách sinh viên trong đợt này.");
        var criteria = await _repo.GetDanhSachTieuChiAsync(maDot);
        var details = ValidateChiTiets(chiTietInputs, criteria).ToList();
        if (details.Count == 0 || details.Any(x => x.TieuChi.NhomDanhGia != ThangDiem.NhomDoanhNghiep))
            throw new ArgumentException("Doanh nghiệp chỉ được chấm tiêu chí thuộc phần doanh nghiệp.");
        await EnsureDotChoPhepChamAsync(maDot, true);
        var existing = await _repo.GetPhieuChamBySinhVienAndDotAsync(maSV, maDot);
        var scores = details.Select(x => new ChiTietChamDiem { MaTieuChi = x.TieuChi.MaTieuChi, DiemCham = x.Input.DiemCham }).ToList();
        var saved = await _repo.LuuPhieuChamDiemAsync(new DAL.Entities.PhieuChamDiem
        {
            MaSV = maSV, MaDot = maDot, MaDaiDien = maDaiDien,
            NhanXetDN = nhanXet?.Trim(), NgayCham = _clock.GetUtcNow().ToOffset(InternshipDeadlinePolicy.VietnamOffset).DateTime,
            TongDiem = TinhTongSauKhiGop(existing, scores, criteria),
            DaDoiChieuPhieuDN = existing?.DaDoiChieuPhieuDN ?? false
        }, scores);
        return MapToDto(await _repo.GetPhieuChamBySinhVienAndDotAsync(maSV, maDot) ?? saved, criteria);
    }

    public async Task<BangDiemResponse> GetBangDiemAsync(string maDot, string? maGV = null)
    {
        if (string.IsNullOrWhiteSpace(maDot))
            throw new ArgumentException("Mã đợt thực tập không được để trống.");

        var dot = await _repo.GetDotThucTapAsync(maDot);
        var tieuChis = await _repo.GetDanhSachTieuChiAsync(maDot);
        var nguon = await _repo.GetBangDiemNguonAsync(maDot, maGV);

        var rows = nguon.Select((x, i) =>
        {
            var (hoLot, ten) = TachHoTen(x.SinhVien.HoTen);
            var diem = tieuChis.ToDictionary(
                t => t.MaTieuChi,
                t => x.Phieu?.ChiTietChamDiems.FirstOrDefault(c => c.MaTieuChi == t.MaTieuChi)?.DiemCham);
            var result = CloResult.Evaluate(tieuChis, x.Phieu?.ChiTietChamDiems);
            if (x.KhongHoanTat) result = result with { Complete = false, Total = null, Status = "Không hoàn tất đợt" };
            return new BangDiemRowDto(i + 1, x.SinhVien.MaSV, hoLot, ten, x.SinhVien.Lop, diem, result.Total,
                result.Complete ? ThangDiem.QuyDoi(result.Total!.Value).DiemChu : null, result.Outcome, x.TenGV, x.TenCongTy);
        }).ToList();

        return new BangDiemResponse(maDot, dot?.TenDot, tieuChis.Select(ToDto).ToList(), rows);
    }

    private async Task EnsureDotChoPhepChamAsync(string maDot, bool enterprise)
    {
        var dot = await _repo.GetDotThucTapAsync(maDot)
            ?? throw new KeyNotFoundException($"Không tìm thấy đợt thực tập có mã {maDot}.");

        var block = InternshipDeadlinePolicy.GradeBlock(dot, enterprise, _clock.GetUtcNow());
        if (block != null) throw new InvalidOperationException(block);
    }

    private static IEnumerable<(ChiTietDiemInput Input, TieuChi TieuChi)> ValidateChiTiets(
        IEnumerable<ChiTietDiemInput> inputs, IReadOnlyList<TieuChi> tieuChis)
    {
        var dict = tieuChis.ToDictionary(t => t.MaTieuChi);
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var item in inputs)
        {
            if (string.IsNullOrWhiteSpace(item.MaTieuChi))
                throw new ArgumentException("Mã tiêu chí không được để trống.");

            if (!dict.TryGetValue(item.MaTieuChi, out var tc))
                throw new KeyNotFoundException($"Không tìm thấy tiêu chí có mã {item.MaTieuChi}.");

            if (!seen.Add(item.MaTieuChi))
                throw new ArgumentException($"Tiêu chí {item.MaTieuChi} bị lặp trong danh sách chấm điểm.");

            if (decimal.Round(item.DiemCham, 2) != item.DiemCham)
                throw new ArgumentException("Điểm chỉ được có tối đa hai chữ số thập phân.");

            if (item.DiemCham < 0)
                throw new ArgumentException(
                    $"Điểm tiêu chí {tc.TenTieuChi} không được âm ({item.DiemCham}).");

            if (item.DiemCham > tc.DiemToiDa)
                throw new ArgumentException(
                    $"Điểm tiêu chí {tc.TenTieuChi} ({item.DiemCham}) vượt quá điểm tối đa ({tc.DiemToiDa}).");

            yield return (item, tc);
        }
    }

    private static decimal TinhTongSauKhiGop(DAL.Entities.PhieuChamDiem? existing,
        IEnumerable<ChiTietChamDiem> newChiTiets, IReadOnlyList<TieuChi> tieuChis)
    {
        var activeIds = tieuChis.Select(t => t.MaTieuChi).ToHashSet();
        var map = existing?.ChiTietChamDiems
            .Where(c => activeIds.Contains(c.MaTieuChi))
            .ToDictionary(c => c.MaTieuChi, c => c.DiemCham)
            ?? new Dictionary<string, decimal>();

        foreach (var item in newChiTiets)
            map[item.MaTieuChi] = item.DiemCham;

        return map.Values.Sum();
    }

    internal static (string HoLot, string Ten) TachHoTen(string? hoTen)
    {
        var parts = (hoTen ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return (string.Empty, string.Empty);
        return (string.Join(' ', parts[..^1]), parts[^1]);
    }

    private static TieuChiDto ToDto(TieuChi t) => new(t.MaTieuChi, t.MaCLO ?? t.MaTieuChi, t.TenTieuChi, t.DiemToiDa, t.NhomDanhGia, t.ThuTu);

    private static PhieuChamDiemDto MapToDto(DAL.Entities.PhieuChamDiem p, IReadOnlyList<TieuChi> tieuChis)
    {
        var nhom = tieuChis.ToDictionary(t => t.MaTieuChi, t => t.NhomDanhGia);
        var chiTietDtos = p.ChiTietChamDiems
            .Where(c => nhom.ContainsKey(c.MaTieuChi))
            .Select(c => new ChiTietChamDiemDto(
                c.MaSo,
                c.MaTieuChi,
                c.TieuChi?.TenTieuChi ?? c.MaTieuChi,
                c.DiemCham,
                c.TieuChi?.DiemToiDa ?? tieuChis.First(t => t.MaTieuChi == c.MaTieuChi).DiemToiDa,
                nhom[c.MaTieuChi]))
            .OrderBy(c => tieuChis.First(t => t.MaTieuChi == c.MaTieuChi).ThuTu)
            .ToList();

        var tieuChiGV = tieuChis.Where(t => t.NhomDanhGia == ThangDiem.NhomGiangVien).Select(t => t.MaTieuChi).ToList();
        var tieuChiDN = tieuChis.Where(t => t.NhomDanhGia == ThangDiem.NhomDoanhNghiep).Select(t => t.MaTieuChi).ToList();
        var daChamGV = tieuChiGV.Count > 0 && tieuChiGV.All(m => chiTietDtos.Any(c => c.MaTieuChi == m));
        var daChamDN = tieuChiDN.Count > 0 && tieuChiDN.All(m => chiTietDtos.Any(c => c.MaTieuChi == m));
        var evaluation = CloResult.Evaluate(tieuChis, p.ChiTietChamDiems);
        daChamGV = evaluation.LecturerComplete; daChamDN = evaluation.EnterpriseComplete;
        var daDu = evaluation.Complete;

        var tong = evaluation.Partial;
        var (diemChu, xepLoai, dat) = ThangDiem.QuyDoi(tong);

        return new PhieuChamDiemDto(
            MaPhieu: p.MaPhieu,
            MaSV: p.MaSV,
            HoTenSV: p.SinhVien?.HoTen,
            Lop: p.SinhVien?.Lop,
            MaDot: p.MaDot,
            TenDot: p.DotThucTap?.TenDot,
            MaGVHuongDan: p.MaGVHuongDan,
            TongDiem: evaluation.Total,
            NgayCham: p.NgayCham,
            XepLoai: daDu ? $"{xepLoai} ({diemChu})" : "Chưa đủ điểm thành phần",
            ChiTiets: chiTietDtos,
            DiemGV: chiTietDtos.Where(c => c.NhomDanhGia == ThangDiem.NhomGiangVien).Sum(c => c.DiemCham),
            DiemDN: chiTietDtos.Where(c => c.NhomDanhGia == ThangDiem.NhomDoanhNghiep).Sum(c => c.DiemCham),
            DaChamGV: daChamGV,
            DaChamDN: daChamDN,
            DoanhNghiepChamTrenHeThong: !string.IsNullOrWhiteSpace(p.MaDaiDien),
            DaDuDiem: daDu,
            DiemChu: daDu ? diemChu : null,
            KetQua: daDu ? (dat ? "Đạt" : "Không đạt") : "Chưa đủ điểm",
            NhanXetGV: p.NhanXetGV,
            NhanXetDN: p.NhanXetDN,
            DaDoiChieuPhieuDN: p.DaDoiChieuPhieuDN,
            GhiChuPhieuDN: p.GhiChuPhieuDN,
            DiemTamTinh: evaluation.Partial
        );
    }
}
