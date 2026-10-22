using InternshipManagement.BLL.Common;
using InternshipManagement.BLL.DTOs.DangKyThucTap;
using InternshipManagement.BLL.Exceptions;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;

namespace InternshipManagement.BLL.Services.DangKyThucTap;

public class DangKyThucTapService : IDangKyThucTapService
{
    private readonly IDangKyThucTapRepository _dangKyRepo;
    private readonly ICongTyRepository _congTyRepo;
    private readonly ISinhVienRepository _sinhVienRepo;

    public DangKyThucTapService(
        IDangKyThucTapRepository dangKyRepo,
        ICongTyRepository congTyRepo,
        ISinhVienRepository sinhVienRepo)
    {
        _dangKyRepo = dangKyRepo;
        _congTyRepo = congTyRepo;
        _sinhVienRepo = sinhVienRepo;
    }

    public async Task<IReadOnlyList<CongTyDto>> GetDanhSachCongTyTuyenDungAsync()
    {
        var list = await _congTyRepo.GetDanhSachTuyenDungAsync();
        var dot = await _congTyRepo.GetDotDangDienRaAsync();
        var daNhan = dot == null ? new Dictionary<string, int>() : await _congTyRepo.DemDaTiepNhanTheoCongTyAsync(dot.MaSo);
        return list.Select(c =>
        {
            var soDaNhan = daNhan.GetValueOrDefault(c.MaCongTy);
            var coGioiHan = (c.SoLuongNhan ?? 0) > 0;
            return new CongTyDto
            {
                MaCongTy = c.MaCongTy,
                TenCongTy = c.TenCongTy,
                ViTriTuyen = c.ViTriTuyen,
                ThoiGian = c.ThoiGian,
                SoLuongNhan = c.SoLuongNhan,
                YeuCau = c.YeuCau,
                TrangThai = c.TrangThai,
                MaDot = dot?.MaSo,
                DaTiepNhan = soDaNhan,
                ConLai = coGioiHan ? Math.Max(0, c.SoLuongNhan!.Value - soDaNhan) : null,
                DaDuChiTieu = coGioiHan && soDaNhan >= c.SoLuongNhan!.Value
            };
        })
        .OrderBy(c => c.DaDuChiTieu)
        .ThenBy(c => c.MaCongTy)
        .ToList();
    }

    public async Task<CongTyDto> DeXuatCongTyMoiAsync(DeXuatCongTyRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TenCongTy))
            throw new ArgumentException("Tên công ty không được để trống.");

        var dotHienTai = await _congTyRepo.GetDotDangDienRaAsync();
        if (dotHienTai != null && !string.IsNullOrWhiteSpace(request.MaSV))
            await KiemTraChuaTrungTuyenAsync(request.MaSV, dotHienTai.MaSo, "đề xuất doanh nghiệp mới");

        var trimmedName = request.TenCongTy.Trim();
        if (trimmedName.Length > 200)
            throw new ArgumentException("Tên công ty không được vượt quá 200 ký tự.");

        if (await _congTyRepo.ExistsByNameAsync(trimmedName))
            throw new ArgumentException($"Doanh nghiệp \"{trimmedName}\" đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.");

        var maCT = DAL.Common.IdGenerator.New("CT");
        var congTy = new CongTy
        {
            MaCongTy = maCT,
            TenCongTy = trimmedName,
            ViTriTuyen = request.ViTriTuyen?.Trim() ?? "Thực tập sinh",
            ThoiGian = request.ThoiGian?.Trim() ?? "3 tháng",
            SoLuongNhan = request.SoLuongNhan > 0 ? request.SoLuongNhan.Value : 1,
            YeuCau = request.YeuCau?.Trim() ?? "Theo thỏa thuận",
            TrangThai = "ChoDuyet",
            MaSVDeXuat = request.MaSV
        };

        await _congTyRepo.AddAsync(congTy);
        await _congTyRepo.SaveChangesAsync();

        return new CongTyDto
        {
            MaCongTy = congTy.MaCongTy,
            TenCongTy = congTy.TenCongTy,
            ViTriTuyen = congTy.ViTriTuyen,
            ThoiGian = congTy.ThoiGian,
            SoLuongNhan = congTy.SoLuongNhan,
            YeuCau = congTy.YeuCau,
            TrangThai = congTy.TrangThai
        };
    }

    public async Task<IReadOnlyList<CongTyDto>> GetDeXuatCuaSinhVienAsync(string maSV)
    {
        var list = await _congTyRepo.GetDeXuatCuaSinhVienAsync(maSV);
        return list.Select(c => new CongTyDto
        {
            MaCongTy = c.MaCongTy,
            TenCongTy = c.TenCongTy,
            ViTriTuyen = c.ViTriTuyen,
            ThoiGian = c.ThoiGian,
            SoLuongNhan = c.SoLuongNhan,
            YeuCau = c.YeuCau,
            TrangThai = c.TrangThai
        }).ToList();
    }

    public async Task<IReadOnlyList<DangKyThucTapDto>> GetDanhSachDangKyBySinhVienAsync(string maSV)
    {
        var list = await _dangKyRepo.GetBySinhVienAsync(maSV);
        var phanBos = await _dangKyRepo.GetPhanBoConHieuLucAsync(maSV);
        var phongVans = await _dangKyRepo.GetKetQuaPhongVanAsync(maSV);
        return list.Select(d => new DangKyThucTapDto
        {
            DaTiepNhan = phanBos.Any(p => p.MaCongTy == d.MaCongTy && p.MaDot == d.MaDot),
            KetQuaPhongVan = phongVans.Where(p => p.MaCongTy == d.MaCongTy)
                .OrderByDescending(p => p.NgayPV).Select(p => p.KetQua).FirstOrDefault(),
            MaDK = d.MaDK,
            MaSV = d.MaSV,
            MaCongTy = d.MaCongTy,
            TenCongTy = d.CongTy?.TenCongTy ?? d.MaCongTy,
            ViTriTuyen = d.CongTy?.ViTriTuyen,
            MaDot = d.MaDot,
            TenDot = d.DotThucTap?.TenDot,
            NgayDangKy = d.NgayDangKy,
            ThuTuUuTien = d.ThuTuUuTien,
            TrangThai = d.TrangThai
        }).ToList();
    }

    public const int MaxNguyenVong = 3;

    /// <summary>
    /// Điều kiện đăng ký nguyện vọng / đề xuất doanh nghiệp trong một đợt. Học phần thực tập tốt nghiệp chỉ học một lần:
    /// - đã trúng tuyển trong chính đợt này → không đăng ký thêm;
    /// - đang có quyết định thực tập (chờ xác nhận / đang thực tập) ở đợt khác → không đăng ký;
    /// - đã hoàn thành thực tập ở đợt trước và đạt (hoặc đang chờ kết quả) → không đăng ký lại;
    /// - đã hoàn thành nhưng KHÔNG ĐẠT (điểm F, &lt; 4.0) → được đăng ký học lại.
    /// Trả về null nếu đủ điều kiện, ngược lại là lý do.
    /// </summary>
    public async Task<string?> KiemTraDieuKienDangKyAsync(string maSV, string maDot, string hanhDong = "đăng ký thêm nguyện vọng")
    {
        var phanBos = await _dangKyRepo.GetPhanBoConHieuLucAsync(maSV) ?? Array.Empty<PhanBoThucTap>();
        foreach (var pb in phanBos.OrderByDescending(p => p.MaDot == maDot))
        {
            var tenCongTy = pb.CongTy?.TenCongTy ?? pb.MaCongTy;
            var tenDot = pb.DotThucTap?.TenDot ?? pb.MaDot;

            if (pb.MaDot == maDot)
                return $"Bạn đã trúng tuyển tại {tenCongTy} trong đợt này nên không thể {hanhDong}.";

            if (pb.TrangThai is "ChuaNhanViec" or "DangThucTap")
                return $"Bạn đang có quyết định thực tập tại {tenCongTy} ({tenDot}) nên không thể {hanhDong} ở đợt khác.";

            if (pb.TrangThai == "HoanThanh")
            {
                var (tongDiem, daDu) = await _dangKyRepo.GetKetQuaThucTapAsync(maSV, pb.MaDot);
                var khongDat = daDu && tongDiem.HasValue && !ThangDiem.QuyDoi(tongDiem.Value).Dat;
                if (!khongDat)
                    return daDu
                        ? $"Bạn đã hoàn thành và đạt học phần thực tập tốt nghiệp tại {tenCongTy} ({tenDot}) nên không thể {hanhDong}."
                        : $"Bạn đã hoàn thành thực tập tại {tenCongTy} ({tenDot}) và đang chờ kết quả đánh giá nên không thể {hanhDong}.";
            }
        }
        return null;
    }

    private async Task KiemTraChuaTrungTuyenAsync(string maSV, string maDot, string hanhDong = "đăng ký thêm nguyện vọng")
    {
        var lyDo = await KiemTraDieuKienDangKyAsync(maSV, maDot, hanhDong);
        if (lyDo != null) throw new InvalidOperationException(lyDo);
    }

    public async Task<DangKyThucTapDto> DangKyNguyenVongAsync(CreateDangKyThucTapRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.MaSV))
            throw new ArgumentException("Mã sinh viên không được để trống.", nameof(request.MaSV));
        if (string.IsNullOrWhiteSpace(request.MaCongTy))
            throw new ArgumentException("Mã công ty không được để trống.", nameof(request.MaCongTy));
        if (string.IsNullOrWhiteSpace(request.MaDot))
            throw new ArgumentException("Mã đợt thực tập không được để trống.", nameof(request.MaDot));

        var sv = await _sinhVienRepo.GetByIdAsync(request.MaSV)
            ?? throw new NotFoundException("SinhVien", request.MaSV);

        var congTy = await _congTyRepo.GetByIdAsync(request.MaCongTy)
            ?? throw new NotFoundException("CongTy", request.MaCongTy);

        if (congTy.TrangThai != "DaDuyet")
            throw new InvalidOperationException("Chỉ có thể đăng ký các doanh nghiệp đã được phê duyệt.");

        var dot = await _dangKyRepo.GetDotAsync(request.MaDot)
            ?? throw new NotFoundException("DotThucTap", request.MaDot);

        if (dot.TrangThai != "DangDienRa")
            throw new InvalidOperationException("Đợt thực tập không trong thời gian tiếp nhận đăng ký nguyện vọng.");

        if (request.ThuTuUuTien < 1 || request.ThuTuUuTien > MaxNguyenVong)
            throw new ArgumentException($"Thứ tự ưu tiên phải từ 1 đến {MaxNguyenVong}.");

        // Đã trúng tuyển (có quyết định tiếp nhận) thì không đăng ký thêm — kiểm tra trước để báo đúng lý do
        await KiemTraChuaTrungTuyenAsync(request.MaSV, request.MaDot);

        var count = await _dangKyRepo.CountBySinhVienDotAsync(request.MaSV, request.MaDot);
        if (count >= MaxNguyenVong)
            throw new InvalidOperationException($"Sinh viên chỉ được đăng ký tối đa {MaxNguyenVong} nguyện vọng trong một đợt.");

        var already = await _dangKyRepo.HasRegisteredAsync(request.MaSV, request.MaCongTy, request.MaDot);
        if (already)
            throw new InvalidOperationException("Sinh viên đã đăng ký công ty này trong đợt hiện tại.");

        var priorityUsed = await _dangKyRepo.HasPriorityInDotAsync(request.MaSV, request.MaDot, request.ThuTuUuTien);
        if (priorityUsed)
            throw new InvalidOperationException($"Thứ tự ưu tiên {request.ThuTuUuTien} đã được sử dụng cho một nguyện vọng khác.");

        var hasApproved = await _dangKyRepo.HasApprovedRegistrationInDotAsync(request.MaSV, request.MaDot);
        if (hasApproved)
            throw new InvalidOperationException("Sinh viên đã có một nguyện vọng được phê duyệt trong đợt này.");

        if ((congTy.SoLuongNhan ?? 0) > 0
            && await _dangKyRepo.CountDaTiepNhanAsync(congTy.MaCongTy, request.MaDot) >= congTy.SoLuongNhan)
            throw new InvalidOperationException($"Doanh nghiệp \"{congTy.TenCongTy}\" đã đủ chỉ tiêu tiếp nhận nên đã đóng tuyển trong đợt này.");

        var maDK = DAL.Common.IdGenerator.New("DK");
        var dangKy = new DAL.Entities.DangKyThucTap
        {
            MaDK = maDK,
            MaSV = request.MaSV,
            MaCongTy = request.MaCongTy,
            MaDot = request.MaDot,
            NgayDangKy = DateTime.Now,
            ThuTuUuTien = request.ThuTuUuTien,
            TrangThai = "ChoDuyet"
        };

        await _dangKyRepo.AddAsync(dangKy);
        await _dangKyRepo.SaveChangesAsync();

        return new DangKyThucTapDto
        {
            MaDK = dangKy.MaDK,
            MaSV = dangKy.MaSV,
            MaCongTy = dangKy.MaCongTy,
            TenCongTy = congTy.TenCongTy,
            ViTriTuyen = congTy.ViTriTuyen,
            MaDot = dangKy.MaDot,
            TenDot = dot.TenDot,
            NgayDangKy = dangKy.NgayDangKy,
            ThuTuUuTien = dangKy.ThuTuUuTien,
            TrangThai = dangKy.TrangThai
        };
    }

    public async Task<bool> HuyDangKyAsync(string maDK, string? requesterMaSV, bool isStaff)
    {
        var dangKy = await _dangKyRepo.GetByIdAsync(maDK);
        if (dangKy == null) return false;

        if (!isStaff)
        {
            if (!string.Equals(dangKy.MaSV, requesterMaSV, StringComparison.OrdinalIgnoreCase))
                throw new UnauthorizedAccessException("Bạn không có quyền hủy nguyện vọng của sinh viên khác.");
            if (dangKy.TrangThai != "ChoDuyet")
                throw new InvalidOperationException("Chỉ có thể hủy đăng ký khi ở trạng thái Chờ duyệt.");
            // Doanh nghiệp đã xếp lịch phỏng vấn → hủy nguyện vọng sẽ làm lịch phỏng vấn mất căn cứ
            var phongVans = await _dangKyRepo.GetKetQuaPhongVanAsync(dangKy.MaSV);
            if (phongVans.Any(p => p.MaCongTy == dangKy.MaCongTy))
                throw new InvalidOperationException("Doanh nghiệp đã xếp lịch phỏng vấn cho nguyện vọng này, không thể tự hủy. Vui lòng liên hệ doanh nghiệp hoặc Khoa.");
        }

        _dangKyRepo.Delete(dangKy);
        await _dangKyRepo.SaveChangesAsync();
        return true;
    }

    public Task<bool> HuyDangKyAsync(string maDK) => HuyDangKyAsync(maDK, null, true);
}
