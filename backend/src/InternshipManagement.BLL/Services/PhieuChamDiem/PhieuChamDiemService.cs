using InternshipManagement.BLL.Common;
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

    public async Task<IReadOnlyList<TieuChiDto>> GetDanhSachTieuChiAsync(string? maDot = null, string? nhomDanhGia = null)
    {
        IReadOnlyList<TieuChi> tieuChis;
        if (!string.IsNullOrWhiteSpace(maDot))
        {
            tieuChis = await _repo.GetDanhSachTieuChiAsync(maDot);
            if (tieuChis == null || tieuChis.Count == 0)
                tieuChis = await _repo.GetDanhSachTieuChiAsync();
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
        if (tieuChis == null || tieuChis.Count == 0) tieuChis = await _repo.GetDanhSachTieuChiAsync();
        return MapToDto(entity, tieuChis);
    }

    public async Task<IReadOnlyList<PhieuChamDiemDto>> GetDanhSachPhieuChamByGiangVienAsync(string maGV, string maDot)
    {
        var entities = await _repo.GetDanhSachPhieuChamByGiangVienAsync(maGV, maDot);
        var tieuChis = await _repo.GetDanhSachTieuChiAsync(maDot);
        if (tieuChis == null || tieuChis.Count == 0) tieuChis = await _repo.GetDanhSachTieuChiAsync();
        return entities.Select(e => MapToDto(e, tieuChis)).ToList();
    }

    /// <summary>
    /// GVHD (hoặc Khoa) chấm phần của giảng viên: CLO1.1 → CLO3.4.
    /// Nếu đơn vị thực tập chưa chấm trên hệ thống, GVHD được nhập hộ CLO4.x từ Phiếu nhận xét bản giấy.
    /// </summary>
    public async Task<PhieuChamDiemDto> LuuPhieuChamDiemAsync(LuuPhieuChamRequest request, string? actorMaGV = null, bool isStaff = false)
    {
        if (string.IsNullOrWhiteSpace(request.MaSV))
            throw new ArgumentException("Mã sinh viên không được để trống.", nameof(request.MaSV));
        if (string.IsNullOrWhiteSpace(request.MaDot))
            throw new ArgumentException("Mã đợt thực tập không được để trống.", nameof(request.MaDot));
        if (request.ChiTiets == null || request.ChiTiets.Count == 0)
            throw new ArgumentException("Chi tiết điểm không được để trống.", nameof(request.ChiTiets));

        await EnsureDotChoPhepChamAsync(request.MaDot, isStaff);

        var gvhd = await _repo.GetActiveAssignmentAsync(request.MaSV);
        if (!isStaff)
        {
            if (gvhd == null || !string.Equals(gvhd.MaGiangVien, actorMaGV, StringComparison.OrdinalIgnoreCase))
                throw new UnauthorizedAccessException("Giảng viên không phụ trách hướng dẫn sinh viên này.");
        }

        var dot = await _repo.GetDotThucTapAsync(request.MaDot);
        var tieuChis = await _repo.GetDanhSachTieuChiAsync(request.MaDot);
        if (tieuChis == null || tieuChis.Count == 0)
            tieuChis = await _repo.GetDanhSachTieuChiAsync();

        var tieuChiDict = tieuChis.ToDictionary(t => t.MaTieuChi);

        var existing = await _repo.GetPhieuChamBySinhVienAndDotAsync(request.MaSV, request.MaDot);
        var dnDaChamTrenHeThong = !string.IsNullOrWhiteSpace(existing?.MaDaiDien);

        // Chỉ bắt buộc đối chiếu phiếu DN khi DN chưa chấm trên hệ thống và GV tự nhập thay CLO4.x
        if (dot != null && string.Equals(dot.MaRubric, "CNTT_CLO_V1", StringComparison.OrdinalIgnoreCase) && !dnDaChamTrenHeThong)
        {
            var coChamDN = request.ChiTiets.Any(c => tieuChiDict.TryGetValue(c.MaTieuChi, out var tc) && tc.NhomDanhGia == ThangDiem.NhomDoanhNghiep);
            if (coChamDN && !request.DaDoiChieuPhieuDN)
                throw new ArgumentException("Cần xác nhận đã đối chiếu phiếu nhận xét doanh nghiệp trước khi chốt CLO4.1 và CLO4.2.");
        }

        var chiTiets = new List<ChiTietChamDiem>();
        foreach (var (input, tc) in ValidateChiTiets(request.ChiTiets, tieuChis))
        {
            if (tc.NhomDanhGia == ThangDiem.NhomDoanhNghiep && dnDaChamTrenHeThong)
            {
                var diemDN = existing!.ChiTietChamDiems.FirstOrDefault(c => c.MaTieuChi == tc.MaTieuChi)?.DiemCham;
                if (diemDN == input.DiemCham) continue;
                if (!isStaff)
                    throw new InvalidOperationException(
                        $"Tiêu chí {tc.MaTieuChi} đã được đơn vị thực tập chấm trên hệ thống, giảng viên không được sửa.");
            }
            chiTiets.Add(new ChiTietChamDiem { MaTieuChi = tc.MaTieuChi, DiemCham = input.DiemCham });
        }

        var phieu = new DAL.Entities.PhieuChamDiem
        {
            MaSV = request.MaSV,
            MaDot = request.MaDot,
            MaGVHuongDan = gvhd?.MaSo ?? request.MaGVHuongDan,
            TongDiem = TinhTongSauKhiGop(existing, chiTiets, tieuChis),
            NgayCham = DateTime.Now,
            NhanXetGV = request.NhanXetGV?.Trim() ?? request.NhanXet?.Trim(),
            DaDoiChieuPhieuDN = request.DaDoiChieuPhieuDN,
            GhiChuPhieuDN = request.GhiChuPhieuDN?.Trim()
        };

        var saved = await _repo.LuuPhieuChamDiemAsync(phieu, chiTiets);
        var reloaded = await _repo.GetPhieuChamBySinhVienAndDotAsync(saved.MaSV, saved.MaDot);
        return MapToDto(reloaded ?? saved, tieuChis);
    }

    /// <summary>Đơn vị thực tập chấm Phiếu nhận xét: bắt buộc đủ các tiêu chí nhóm DN (CLO4.1, CLO4.2).</summary>
    public async Task<PhieuChamDiemDto> LuuDiemDoanhNghiepAsync(string maSV, string maDot, string maDaiDien,
        IReadOnlyList<ChiTietDiemInput> chiTietInputs, string? nhanXet, bool isStaff = false)
    {
        if (string.IsNullOrWhiteSpace(maSV))
            throw new ArgumentException("Mã sinh viên không được để trống.", nameof(maSV));
        if (string.IsNullOrWhiteSpace(maDot))
            throw new ArgumentException("Mã đợt thực tập không được để trống.", nameof(maDot));
        if (string.IsNullOrWhiteSpace(maDaiDien))
            throw new ArgumentException("Mã đại diện doanh nghiệp không được để trống.", nameof(maDaiDien));
        if (chiTietInputs == null || chiTietInputs.Count == 0)
            throw new ArgumentException("Chi tiết điểm không được để trống.", nameof(chiTietInputs));

        await EnsureDotChoPhepChamAsync(maDot, isStaff);

        var tieuChis = await _repo.GetDanhSachTieuChiAsync(maDot);
        if (tieuChis == null || tieuChis.Count == 0) tieuChis = await _repo.GetDanhSachTieuChiAsync();

        var dnTieuChis = tieuChis.Where(t => t.NhomDanhGia == ThangDiem.NhomDoanhNghiep).ToList();
        var dnIds = dnTieuChis.Select(t => t.MaTieuChi).ToHashSet();

        if (chiTietInputs.Any(c => !dnIds.Contains(c.MaTieuChi)))
            throw new ArgumentException("Đơn vị thực tập chỉ được chấm các tiêu chí thuộc nhóm Đơn vị thực tập (CLO4.x).");

        if (dnIds.Any(id => !chiTietInputs.Any(c => c.MaTieuChi == id)))
            throw new ArgumentException("Phiếu nhận xét doanh nghiệp phải chấm đủ tất cả các tiêu chí nhóm Đơn vị thực tập.");

        var existing = await _repo.GetPhieuChamBySinhVienAndDotAsync(maSV, maDot);
        var chiTiets = new List<ChiTietChamDiem>();
        foreach (var (input, tc) in ValidateChiTiets(chiTietInputs, dnTieuChis))
        {
            chiTiets.Add(new ChiTietChamDiem { MaTieuChi = tc.MaTieuChi, DiemCham = input.DiemCham });
        }

        var phieu = new DAL.Entities.PhieuChamDiem
        {
            MaSV = maSV,
            MaDot = maDot,
            MaDaiDien = maDaiDien,
            TongDiem = TinhTongSauKhiGop(existing, chiTiets, tieuChis),
            NgayCham = DateTime.Now,
            NhanXetDN = nhanXet?.Trim()
        };

        var saved = await _repo.LuuPhieuChamDiemAsync(phieu, chiTiets);
        var reloaded = await _repo.GetPhieuChamBySinhVienAndDotAsync(saved.MaSV, saved.MaDot);
        return MapToDto(reloaded ?? saved, tieuChis);
    }

        public async Task<BangDiemResponse> GetBangDiemAsync(string maDot, string? maGV = null)
    {
        if (string.IsNullOrWhiteSpace(maDot))
            throw new ArgumentException("Mã đợt thực tập không được để trống.");

        var dot = await _repo.GetDotThucTapAsync(maDot);
        var tieuChis = await _repo.GetDanhSachTieuChiAsync(maDot);
        if (tieuChis == null || tieuChis.Count == 0) tieuChis = await _repo.GetDanhSachTieuChiAsync();
        var nguon = await _repo.GetBangDiemNguonAsync(maDot, maGV);

        var rows = nguon.Select((x, i) =>
        {
            var (hoLot, ten) = TachHoTen(x.SinhVien.HoTen);
            var diem = tieuChis.ToDictionary(
                t => t.MaTieuChi,
                t => x.Phieu?.ChiTietChamDiems.FirstOrDefault(c => c.MaTieuChi == t.MaTieuChi)?.DiemCham);
            var daDu = diem.Values.All(v => v.HasValue);
            decimal? tong = x.Phieu == null ? null : diem.Values.Sum(v => v ?? 0);
            var ketQua = tong == null ? "Chưa chấm" : !daDu ? "Chưa đủ điểm" : ThangDiem.QuyDoi(tong.Value).Dat ? "Đạt" : "Không đạt";
            return new BangDiemRowDto(i + 1, x.SinhVien.MaSV, hoLot, ten, x.SinhVien.Lop, diem, tong,
                tong.HasValue && daDu ? ThangDiem.QuyDoi(tong.Value).DiemChu : null, ketQua, x.TenGV, x.TenCongTy);
        }).ToList();

        return new BangDiemResponse(maDot, dot?.TenDot, tieuChis.Select(ToDto).ToList(), rows);
    }

    private async Task EnsureDotChoPhepChamAsync(string maDot, bool isStaff)
    {
        var dot = await _repo.GetDotThucTapAsync(maDot)
            ?? throw new KeyNotFoundException($"Không tìm thấy đợt thực tập có mã {maDot}.");

        if (string.Equals(dot.TrangThai, "ChuaBatDau", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Đợt thực tập chưa bắt đầu, không thể chấm điểm.");

        if (string.Equals(dot.TrangThai, "DaKetThuc", StringComparison.OrdinalIgnoreCase) && !isStaff)
            throw new InvalidOperationException("Đợt thực tập đã kết thúc. Chỉ cán bộ Khoa mới có quyền cập nhật điểm.");
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
        var daDu = daChamGV && daChamDN;

        var tong = p.TongDiem ?? 0;
        var (diemChu, xepLoai, dat) = ThangDiem.QuyDoi(tong);

        return new PhieuChamDiemDto(
            MaPhieu: p.MaPhieu,
            MaSV: p.MaSV,
            HoTenSV: p.SinhVien?.HoTen,
            Lop: p.SinhVien?.Lop,
            MaDot: p.MaDot,
            TenDot: p.DotThucTap?.TenDot,
            MaGVHuongDan: p.MaGVHuongDan,
            TongDiem: p.TongDiem,
            NgayCham: p.NgayCham,
            XepLoai: daDu ? $"{xepLoai} ({diemChu})" : "Chưa đủ điểm thành phần",
            ChiTiets: chiTietDtos,
            DiemGV: chiTietDtos.Where(c => c.NhomDanhGia == ThangDiem.NhomGiangVien).Sum(c => c.DiemCham),
            DiemDN: chiTietDtos.Where(c => c.NhomDanhGia == ThangDiem.NhomDoanhNghiep).Sum(c => c.DiemCham),
            DaChamGV: daChamGV,
            DaChamDN: daChamDN,
            DoanhNghiepChamTrenHeThong: !string.IsNullOrWhiteSpace(p.MaDaiDien) && daChamDN,
            DaDuDiem: daDu,
            DiemChu: daDu ? diemChu : null,
            KetQua: daDu ? (dat ? "Đạt" : "Không đạt") : "Chưa đủ điểm",
            NhanXetGV: p.NhanXetGV,
            NhanXetDN: p.NhanXetDN,
            DaDoiChieuPhieuDN: p.DaDoiChieuPhieuDN,
            GhiChuPhieuDN: p.GhiChuPhieuDN
        );
    }
}
