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

    public async Task<IReadOnlyList<TieuChiDto>> GetDanhSachTieuChiAsync(string? nhomDanhGia = null)
    {
        var tieuChis = await _repo.GetDanhSachTieuChiAsync();
        return tieuChis
            .Where(t => string.IsNullOrWhiteSpace(nhomDanhGia) || string.Equals(t.NhomDanhGia, nhomDanhGia, StringComparison.OrdinalIgnoreCase))
            .Select(ToDto)
            .ToList();
    }

    public async Task<PhieuChamDiemDto?> GetPhieuChamBySinhVienAndDotAsync(string maSV, string maDot)
    {
        var entity = await _repo.GetPhieuChamBySinhVienAndDotAsync(maSV, maDot);
        if (entity == null) return null;

        var tieuChis = await _repo.GetDanhSachTieuChiAsync();
        return MapToDto(entity, tieuChis);
    }

    public async Task<IReadOnlyList<PhieuChamDiemDto>> GetDanhSachPhieuChamByGiangVienAsync(string maGV, string maDot)
    {
        var entities = await _repo.GetDanhSachPhieuChamByGiangVienAsync(maGV, maDot);
        var tieuChis = await _repo.GetDanhSachTieuChiAsync();
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

        var tieuChis = await _repo.GetDanhSachTieuChiAsync();
        var existing = await _repo.GetPhieuChamBySinhVienAndDotAsync(request.MaSV, request.MaDot);
        var dnDaChamTrenHeThong = !string.IsNullOrWhiteSpace(existing?.MaDaiDien);

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
            MaGVHuongDan = gvhd?.MaSo,
            TongDiem = TinhTongSauKhiGop(existing, chiTiets, tieuChis),
            NgayCham = DateTime.Now,
            NhanXetGV = request.NhanXet?.Trim()
        };

        var saved = await _repo.LuuPhieuChamDiemAsync(phieu, chiTiets);
        var reloaded = await _repo.GetPhieuChamBySinhVienAndDotAsync(saved.MaSV, saved.MaDot);
        return MapToDto(reloaded ?? saved, tieuChis);
    }

    /// <summary>Đơn vị thực tập chấm Phiếu nhận xét: bắt buộc đủ các tiêu chí nhóm DN (CLO4.1, CLO4.2).</summary>
    public async Task<PhieuChamDiemDto> LuuDiemDoanhNghiepAsync(string maSV, string maDot, string maDaiDien,
        IReadOnlyList<ChiTietDiemInput> chiTietInputs, string? nhanXet, bool isStaff = false)
    {
        if (string.IsNullOrWhiteSpace(maDaiDien))
            throw new ArgumentException("Thiếu người đại diện doanh nghiệp chấm điểm.");
        if (chiTietInputs == null || chiTietInputs.Count == 0)
            throw new ArgumentException("Chi tiết điểm không được để trống.");

        await EnsureDotChoPhepChamAsync(maDot, isStaff);

        var tieuChis = await _repo.GetDanhSachTieuChiAsync();
        var tieuChiDN = tieuChis.Where(t => t.NhomDanhGia == ThangDiem.NhomDoanhNghiep).ToList();

        var chiTiets = new List<ChiTietChamDiem>();
        foreach (var (input, tc) in ValidateChiTiets(chiTietInputs, tieuChis))
        {
            if (tc.NhomDanhGia != ThangDiem.NhomDoanhNghiep)
                throw new ArgumentException($"Doanh nghiệp chỉ chấm các tiêu chí của Phiếu nhận xét, không chấm {tc.MaTieuChi}.");
            chiTiets.Add(new ChiTietChamDiem { MaTieuChi = tc.MaTieuChi, DiemCham = input.DiemCham });
        }

        var thieu = tieuChiDN.Where(t => chiTiets.All(c => c.MaTieuChi != t.MaTieuChi)).Select(t => t.MaTieuChi).ToList();
        if (thieu.Count > 0)
            throw new ArgumentException($"Vui lòng chấm đủ các tiêu chí: {string.Join(", ", thieu)}.");

        var gvhd = await _repo.GetActiveAssignmentAsync(maSV);
        var existing = await _repo.GetPhieuChamBySinhVienAndDotAsync(maSV, maDot);
        var phieu = new DAL.Entities.PhieuChamDiem
        {
            MaSV = maSV,
            MaDot = maDot,
            MaGVHuongDan = gvhd?.MaSo,
            MaDaiDien = maDaiDien,
            TongDiem = TinhTongSauKhiGop(existing, chiTiets, tieuChis),
            NgayCham = DateTime.Now,
            NhanXetDN = nhanXet?.Trim() ?? string.Empty
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
        var tieuChis = await _repo.GetDanhSachTieuChiAsync();
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
            ?? throw new KeyNotFoundException($"Không tìm thấy đợt thực tập {maDot}.");
        if (string.Equals(dot.TrangThai, "DaKetThuc", StringComparison.OrdinalIgnoreCase) && !isStaff)
            throw new InvalidOperationException("Đợt thực tập đã kết thúc, không thể chấm hoặc sửa điểm.");
    }

    private static IEnumerable<(ChiTietDiemInput Input, TieuChi TieuChi)> ValidateChiTiets(
        IEnumerable<ChiTietDiemInput> inputs, IReadOnlyList<TieuChi> tieuChis)
    {
        var dict = tieuChis.ToDictionary(t => t.MaTieuChi, StringComparer.OrdinalIgnoreCase);
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var result = new List<(ChiTietDiemInput, TieuChi)>();
        foreach (var ct in inputs)
        {
            if (string.IsNullOrWhiteSpace(ct.MaTieuChi) || !dict.TryGetValue(ct.MaTieuChi, out var tc))
                throw new ArgumentException($"Tiêu chí {ct.MaTieuChi} không tồn tại hoặc không còn được sử dụng.");
            if (!seen.Add(tc.MaTieuChi))
                throw new ArgumentException($"Trùng lặp tiêu chí chấm điểm: {tc.MaTieuChi}.");
            if (ct.DiemCham < 0 || ct.DiemCham > tc.DiemToiDa)
                throw new ArgumentException($"Điểm cho tiêu chí '{tc.TenTieuChi}' phải từ 0 đến {tc.DiemToiDa}. Điểm gửi lên: {ct.DiemCham}.");
            result.Add((ct, tc));
        }
        return result;
    }

    private static decimal TinhTongSauKhiGop(DAL.Entities.PhieuChamDiem? existing, List<ChiTietChamDiem> moi, IReadOnlyList<TieuChi> tieuChis)
    {
        var active = tieuChis.Select(t => t.MaTieuChi).ToHashSet();
        var gop = (existing?.ChiTietChamDiems ?? new List<ChiTietChamDiem>())
            .Where(c => active.Contains(c.MaTieuChi))
            .ToDictionary(c => c.MaTieuChi, c => c.DiemCham);
        foreach (var c in moi) gop[c.MaTieuChi] = c.DiemCham;
        return gop.Values.Sum();
    }

    /// <summary>Tách "Trần Thành Danh" → ("Trần Thành", "Danh") theo cột "Họ và" / "Tên" của file Khoa.</summary>
    internal static (string HoLot, string Ten) TachHoTen(string? hoTen)
    {
        var parts = (hoTen ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return (string.Empty, string.Empty);
        return (string.Join(' ', parts[..^1]), parts[^1]);
    }

    private static TieuChiDto ToDto(TieuChi t) => new(t.MaTieuChi, t.TenTieuChi, t.DiemToiDa, t.NhomDanhGia, t.ThuTu);

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
            p.MaPhieu,
            p.MaSV,
            p.SinhVien?.HoTen,
            p.SinhVien?.Lop,
            p.MaDot,
            p.DotThucTap?.TenDot,
            p.MaGVHuongDan,
            p.TongDiem,
            p.NgayCham,
            daDu ? $"{xepLoai} ({diemChu})" : "Chưa đủ điểm thành phần",
            chiTietDtos,
            DiemGV: chiTietDtos.Where(c => c.NhomDanhGia == ThangDiem.NhomGiangVien).Sum(c => c.DiemCham),
            DiemDN: chiTietDtos.Where(c => c.NhomDanhGia == ThangDiem.NhomDoanhNghiep).Sum(c => c.DiemCham),
            DaChamGV: daChamGV,
            DaChamDN: daChamDN,
            DoanhNghiepChamTrenHeThong: !string.IsNullOrWhiteSpace(p.MaDaiDien) && daChamDN,
            DaDuDiem: daDu,
            DiemChu: daDu ? diemChu : null,
            KetQua: daDu ? (dat ? "Đạt" : "Không đạt") : "Chưa đủ điểm",
            NhanXetGV: p.NhanXetGV,
            NhanXetDN: p.NhanXetDN);
    }
}
