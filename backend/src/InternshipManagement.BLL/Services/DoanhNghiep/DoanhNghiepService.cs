using System.Data;

using InternshipManagement.BLL.Common;

using InternshipManagement.BLL.DTOs.DoanhNghiep;

using InternshipManagement.BLL.Services.PhieuChamDiem;

using InternshipManagement.DAL;

using InternshipManagement.DAL.Common;

using InternshipManagement.DAL.Entities;

using Microsoft.EntityFrameworkCore;



namespace InternshipManagement.BLL.Services.DoanhNghiep;



/// <summary>

/// Nghiệp vụ phân hệ Doanh nghiệp: tin tuyển dụng, xét hồ sơ, phỏng vấn, tiếp nhận và đánh giá thực tập sinh.

/// Tham số <c>phamViCongTy</c>: null = Khoa/Quản trị (không giới hạn); khác null = tài khoản đại diện DN

/// chỉ được thao tác trên dữ liệu của công ty mình.

/// </summary>

public partial class DoanhNghiepService

{

    private static readonly string[] TrangThaiDangKyHopLe = { "ChoDuyet", "DaDuyet", "TuChoi" };

    private static readonly string[] KetQuaPhongVanHopLe = { "Dat", "KhongDat", "Vang" };



    private readonly AppDbContext _db;

    private readonly IPhieuChamDiemService _phieuChamDiem;

    private readonly InterviewTimePolicy _interviewTime;

    private readonly TimeProvider _clock;

    private readonly bool _allowAbsenceRecording;



    public DoanhNghiepService(AppDbContext db, IPhieuChamDiemService phieuChamDiem, TimeProvider? clock = null, bool allowAbsenceRecording = true)

    {

        _db = db;

        _phieuChamDiem = phieuChamDiem;

        _clock = clock ?? TimeProvider.System;

        _interviewTime = new InterviewTimePolicy(_clock);

        _allowAbsenceRecording = allowAbsenceRecording;

    }



    // ------------------------------------------------------------------ Chỉ tiêu tiếp nhận



    /// <summary>Đợt đang tiếp nhận: đợt "DangDienRa" bắt đầu gần nhất.</summary>

    public Task<DotThucTap?> GetDotDangDienRaAsync() =>

        _db.DotThucTaps.AsNoTracking()

            .Where(d => d.TrangThai == "DangDienRa")

            .OrderByDescending(d => d.ThoiGianBD)

            .FirstOrDefaultAsync();



    public Task<int> DemDaTiepNhanAsync(string maCongTy, string maDot) =>

        _db.PhanBoThucTaps.CountAsync(p => p.MaCongTy == maCongTy && p.MaDot == maDot && p.TrangThai != "Huy");



    public async Task<ChiTieuTiepNhanDto> GetChiTieuAsync(CongTy congTy, DotThucTap? dot = null)

    {

        dot ??= await GetDotDangDienRaAsync();

        var soLuongNhan = dot == null ? congTy.SoLuongNhan ?? 0

            : await CompanyRoundCapacity.LimitAsync(_db, congTy.MaCongTy, dot.MaSo, congTy.SoLuongNhan) ?? 0;

        if (dot == null)

            return new ChiTieuTiepNhanDto(null, null, soLuongNhan, 0, soLuongNhan, false, "KhongCoDot");



        var daNhan = await DemDaTiepNhanAsync(congTy.MaCongTy, dot.MaSo);

        // soLuongNhan <= 0 được hiểu là không giới hạn chỉ tiêu

        var positions = _db.ViTriTheoDots.Where(v => v.MaCongTy == congTy.MaCongTy && v.MaDot == dot.MaSo);

        var allPositionsFull = await positions.AnyAsync() && !await positions.AnyAsync(v =>

            _db.PhanBoThucTaps.Count(p => p.MaCongTy == v.MaCongTy && p.MaDot == v.MaDot && p.MaViTri == v.MaViTri && p.TrangThai != "Huy") < v.SoLuongNhan);

        var daDu = (soLuongNhan > 0 && daNhan >= soLuongNhan) || allPositionsFull;

        var plan = await _db.CongTyTheoDots.AsNoTracking().SingleOrDefaultAsync(x => x.MaCongTy == congTy.MaCongTy && x.MaDot == dot.MaSo);

        var trangThai = RecruitmentStatus.Resolve(plan, congTy.TrangThai, dot.TrangThai, daNhan, _clock.GetUtcNow(), congTy.SoLuongNhan, allPositionsFull);

        return new ChiTieuTiepNhanDto(dot.MaSo, dot.TenDot, soLuongNhan, daNhan,

            daDu ? 0 : soLuongNhan > 0 ? Math.Max(0, soLuongNhan - daNhan) : int.MaxValue, daDu, trangThai);

    }



    // ------------------------------------------------------------------ Phạm vi dữ liệu



    public async Task<string?> GetMaCongTyCuaDaiDienAsync(string? maDaiDien)

    {

        if (string.IsNullOrWhiteSpace(maDaiDien)) return null;

        return await _db.DaiDienDoanhNghieps.AsNoTracking()

            .Where(d => d.MaSo == maDaiDien).Select(d => d.MaCongTy).FirstOrDefaultAsync();

    }



    private static void KiemTraPhamVi(string? phamViCongTy, string maCongTy)

    {

        if (phamViCongTy != null && !string.Equals(phamViCongTy, maCongTy, StringComparison.OrdinalIgnoreCase))

            throw new UnauthorizedAccessException("Tài khoản doanh nghiệp chỉ được thao tác trên dữ liệu của công ty mình.");

    }



    private async Task<CongTy> GetCongTyAsync(string maCongTy, string? phamViCongTy)

    {

        KiemTraPhamVi(phamViCongTy, maCongTy);

        return await _db.CongTys.FirstOrDefaultAsync(c => c.MaCongTy == maCongTy)

               ?? throw new KeyNotFoundException($"Không tìm thấy doanh nghiệp có mã {maCongTy}");

    }



    // ------------------------------------------------------------------ Danh sách / tổng quan



    public async Task<object> GetDanhSachAsync(string? phamViCongTy)

    {

        var query = _db.CongTys.AsNoTracking();

        if (phamViCongTy != null) query = query.Where(c => c.MaCongTy == phamViCongTy);

        return await query

            .OrderBy(c => c.MaCongTy)

            .Select(c => new

            {

                c.MaCongTy,

                c.TenCongTy,

                c.ViTriTuyen,

                c.SoLuongNhan,

                c.TrangThai,

                DaiDienChinh = _db.DaiDienDoanhNghieps

                    .Where(d => d.MaCongTy == c.MaCongTy)

                    .OrderBy(d => d.MaSo)

                    .Select(d => new { d.MaSo, d.HoTen, d.ChucVu, d.Email })

                    .FirstOrDefault()

            })

            .ToListAsync();

    }



    public async Task<object> GetByDaiDienAsync(string maDaiDien)

    {

        var dd = await _db.DaiDienDoanhNghieps.AsNoTracking()

            .Include(d => d.CongTy)

            .FirstOrDefaultAsync(d => d.MaSo == maDaiDien)

            ?? throw new KeyNotFoundException($"Không tìm thấy đại diện {maDaiDien}");



        return new

        {

            dd.MaSo,

            dd.HoTen,

            dd.ChucVu,

            dd.Email,

            congTy = new

            {

                dd.CongTy.MaCongTy,

                dd.CongTy.TenCongTy,

                dd.CongTy.ViTriTuyen,

                dd.CongTy.ThoiGian,

                dd.CongTy.SoLuongNhan,

                dd.CongTy.YeuCau,

                dd.CongTy.TrangThai

            }

        };

    }



    private async Task<DotThucTap> GetReadRoundAsync(string? maDot)

    {

        if (string.IsNullOrWhiteSpace(maDot)) throw new ArgumentException("Chọn đợt thực tập để xem dữ liệu doanh nghiệp.");

        return await _db.DotThucTaps.AsNoTracking().SingleOrDefaultAsync(d => d.MaSo == maDot.Trim())

            ?? throw new KeyNotFoundException("Không tìm thấy đợt thực tập.");

    }



    private async Task<ChiTieuTiepNhanDto> GetReadQuotaAsync(CongTy company, DotThucTap round)

    {

        var quota = await GetChiTieuAsync(company, round);

        if (await _db.ChotDotThucTaps.AnyAsync(x => x.MaDot == round.MaSo && x.TrangThai != "ChuaChot"))

            quota = quota with { TrangThaiTuyen = "DotDaKhoa", ConLai = 0 };

        // Nơi tiếp nhận bên ngoài vẫn giữ hồ sơ, nhưng không có chỉ tiêu tuyển công khai nếu thiếu kế hoạch.

        return await _db.CongTyTheoDots.AnyAsync(p => p.MaCongTy == company.MaCongTy && p.MaDot == round.MaSo)

            ? quota : quota with { SoLuongNhan = 0, ConLai = 0, DaDuChiTieu = false };

    }



    public async Task<object> GetTongQuanAsync(string maCongTy, string? phamViCongTy, string? maDot = null)

    {

        var congTy = await GetCongTyAsync(maCongTy, phamViCongTy);

        var dot = await GetReadRoundAsync(maDot);

        var chiTieu = await GetReadQuotaAsync(congTy, dot);



        var daiDiens = await _db.DaiDienDoanhNghieps.AsNoTracking()

            .Where(d => d.MaCongTy == maCongTy)

            .OrderBy(d => d.MaSo)

            .Select(d => new { d.MaSo, d.HoTen, d.ChucVu, d.Email })

            .ToListAsync();



        var dangKy = _db.DangKyThucTaps.AsNoTracking().Where(d => d.MaCongTy == maCongTy

            && !_db.PhanBoThucTaps.Any(p => p.MaSinhVien == d.MaSV && p.MaDot == d.MaDot

                && p.MaCongTy != maCongTy && p.TrangThai != "Huy"));

        if (chiTieu.MaDot != null) dangKy = dangKy.Where(d => d.MaDot == chiTieu.MaDot);



        var maSVTrongDot = await dangKy.Select(d => d.MaSV).Distinct().ToListAsync();

        var phongVanTrongDot = _db.PhongVans.AsNoTracking()

            .Where(p => p.DaiDienDoanhNghiep.MaCongTy == maCongTy && maSVTrongDot.Contains(p.MaSinhVien)

                && p.DangKyThucTap != null && p.DangKyThucTap.MaDot == dot.MaSo);

        var maRubric = await _db.DotThucTaps.Where(d => d.MaSo == chiTieu.MaDot)

            .Select(d => d.MaRubric).FirstOrDefaultAsync() ?? "LEGACY_4TC";

        var tieuChiDNIds = await _db.TieuChis.Where(t => t.NhomDanhGia == ThangDiem.NhomDoanhNghiep && t.MaRubric == maRubric)

            .Select(t => t.MaTieuChi).ToListAsync();

        var soTieuChiDN = tieuChiDNIds.Count;

        var soDaDanhGia = chiTieu.MaDot == null || soTieuChiDN == 0 ? 0 : await _db.PhanBoThucTaps.AsNoTracking()

            .Where(p => p.MaCongTy == maCongTy && p.MaDot == chiTieu.MaDot && p.TrangThai != "Huy")

            .CountAsync(p => _db.PhieuChamDiems.Any(pc => pc.MaSV == p.MaSinhVien && pc.MaDot == p.MaDot

                && pc.ChiTietChamDiems.Count(c => tieuChiDNIds.Contains(c.MaTieuChi)) == soTieuChiDN));



        var ungVienMoiNhat = await dangKy

            .OrderByDescending(d => d.NgayDangKy)

            .Take(5)

            .Select(d => new

            {

                d.MaDK, d.MaViTri, ViTriDangKy = d.ViTriDangKy, YeuCauDangKy = d.YeuCauDangKy,

                d.MaSV,

                HoTen = d.SinhVien.HoTen,

                ChuyenNganh = d.SinhVien.ChuyenNganh,

                d.NgayDangKy,

                d.TrangThai

            })

            .ToListAsync();



        return new

        {

            congTy = new

            {

                congTy.MaCongTy,

                congTy.TenCongTy,

                congTy.ViTriTuyen,

                congTy.ThoiGian,

                congTy.SoLuongNhan,

                congTy.YeuCau,

                congTy.TrangThai

            },

            daiDiens,

            chiTieu,

            thongKe = new

            {

                soViTriTuyen = chiTieu.MaDot == null ? 0 : await _db.ViTriTheoDots.CountAsync(v => v.MaCongTy == maCongTy && v.MaDot == chiTieu.MaDot && v.HoatDong),

                soLuongNhan = chiTieu.SoLuongNhan,

                soUngVien = await dangKy.CountAsync(),

                soChoDuyet = await dangKy.CountAsync(d => d.TrangThai == "ChoDuyet"),

                soDaDuyet = await dangKy.CountAsync(d => d.TrangThai == "DaDuyet"),

                soPhongVan = await phongVanTrongDot.CountAsync(),

                soPhongVanChoKetQua = await phongVanTrongDot.CountAsync(p => p.KetQua == "ChuaCoKetQua"),

                soThucTapSinh = chiTieu.DaTiepNhan,

                soDaDanhGia

            },

            ungVienMoiNhat

        };

    }



    // ------------------------------------------------------------------ Tin tuyển dụng



    public async Task<object> GetTinTuyenDungAsync(string maCongTy, string? phamViCongTy, string? maDot = null)
    {
        var congTy = await GetCongTyAsync(maCongTy, phamViCongTy);
        var dot = await GetReadRoundAsync(maDot);
        var chiTieu = await GetReadQuotaAsync(congTy, dot);
        var soUngVien = await _db.DangKyThucTaps.CountAsync(d =>
            d.MaCongTy == maCongTy && (chiTieu.MaDot == null || d.MaDot == chiTieu.MaDot));

        var viTris = await _db.ViTriTheoDots.AsNoTracking()
            .Where(v => v.MaCongTy == maCongTy && (dot == null || v.MaDot == dot.MaSo))
            .OrderBy(v => v.TenViTri)
            .Select(v => new
            {
                v.MaViTri,
                v.MaCongTy,
                v.MaDot,
                v.TenViTri,
                v.YeuCau,
                v.SoLuongNhan,
                v.HoatDong,
                SoDaTiepNhan = _db.PhanBoThucTaps.Count(p => p.MaCongTy == v.MaCongTy && p.MaDot == v.MaDot && p.MaViTri == v.MaViTri && p.TrangThai != "Huy"),
                SoUngVien = _db.DangKyThucTaps.Count(d => d.MaCongTy == v.MaCongTy && d.MaDot == v.MaDot && d.MaViTri == v.MaViTri)
            })
            .ToListAsync();

        return new
        {
            congTy.MaCongTy,
            congTy.TenCongTy,
            congTy.ViTriTuyen,
            congTy.ThoiGian,
            congTy.SoLuongNhan,
            congTy.YeuCau,
            congTy.TrangThai,
            soUngVienDaNop = soUngVien,
            soDaTiepNhan = chiTieu.DaTiepNhan,
            chiTieu,
            viTris
        };
    }

    public async Task<object> ThemViTriAsync(ThemViTriRequest request, string? phamViCongTy)
    {
        if (string.IsNullOrWhiteSpace(request.MaCongTy)) throw new ArgumentException("Mã công ty không được để trống.");
        if (string.IsNullOrWhiteSpace(request.TenViTri)) throw new ArgumentException("Tên vị trí tuyển dụng không được để trống.");
        var congTy = await GetCongTyAsync(request.MaCongTy, phamViCongTy);
        var dot = await GetReadRoundAsync(request.MaDot);
        if (dot == null) throw new InvalidOperationException("Không tìm thấy đợt thực tập phù hợp.");

        var plan = await _db.CongTyTheoDots.SingleOrDefaultAsync(p => p.MaCongTy == congTy.MaCongTy && p.MaDot == dot.MaSo);
        if (plan == null)
        {
            plan = new CongTyTheoDot
            {
                MaCongTy = congTy.MaCongTy,
                MaDot = dot.MaSo,
                ViTriTuyen = request.TenViTri.Trim(),
                YeuCau = request.YeuCau?.Trim() ?? "",
                SoLuongNhan = request.SoLuongNhan > 0 ? request.SoLuongNhan : 1,
                HoatDong = true
            };
            _db.CongTyTheoDots.Add(plan);
        }

        var newId = "VT_" + Guid.NewGuid().ToString("N")[..8].ToUpper();
        var entity = new ViTriTheoDot
        {
            MaViTri = newId,
            MaCongTy = congTy.MaCongTy,
            MaDot = dot.MaSo,
            TenViTri = request.TenViTri.Trim(),
            YeuCau = request.YeuCau?.Trim() ?? "",
            SoLuongNhan = request.SoLuongNhan > 0 ? request.SoLuongNhan : 1,
            HoatDong = true
        };
        _db.ViTriTheoDots.Add(entity);
        await _db.SaveChangesAsync();

        return new
        {
            success = true,
            message = "Thêm vị trí tuyển dụng thành công.",
            viTri = entity
        };
    }

    public async Task<object> CapNhatViTriAsync(CapNhatViTriRequest request, string? phamViCongTy)
    {
        if (string.IsNullOrWhiteSpace(request.MaViTri)) throw new ArgumentException("Mã vị trí không được để trống.");
        if (string.IsNullOrWhiteSpace(request.TenViTri)) throw new ArgumentException("Tên vị trí không được để trống.");

        var viTri = await _db.ViTriTheoDots.SingleOrDefaultAsync(v => v.MaViTri == request.MaViTri)
            ?? throw new KeyNotFoundException("Không tìm thấy vị trí tuyển dụng.");
        KiemTraPhamVi(phamViCongTy, viTri.MaCongTy);

        var accepted = await _db.PhanBoThucTaps.CountAsync(p => p.MaViTri == viTri.MaViTri && p.MaCongTy == viTri.MaCongTy && p.MaDot == viTri.MaDot && p.TrangThai != "Huy");
        if (request.SoLuongNhan < accepted)
            throw new InvalidOperationException($"Chỉ tiêu không thể nhỏ hơn số sinh viên đã tiếp nhận ({accepted}).");

        viTri.TenViTri = request.TenViTri.Trim();
        viTri.YeuCau = request.YeuCau?.Trim() ?? "";
        viTri.SoLuongNhan = request.SoLuongNhan > 0 ? request.SoLuongNhan : 1;
        viTri.HoatDong = request.HoatDong;

        await _db.SaveChangesAsync();
        return new
        {
            success = true,
            message = "Cập nhật vị trí tuyển dụng thành công.",
            viTri
        };
    }

    public async Task<object> ToggleViTriAsync(string maViTri, string? phamViCongTy)
    {
        var viTri = await _db.ViTriTheoDots.SingleOrDefaultAsync(v => v.MaViTri == maViTri)
            ?? throw new KeyNotFoundException("Không tìm thấy vị trí tuyển dụng.");
        KiemTraPhamVi(phamViCongTy, viTri.MaCongTy);

        viTri.HoatDong = !viTri.HoatDong;
        await _db.SaveChangesAsync();

        return new
        {
            success = true,
            message = viTri.HoatDong ? "Đã mở lại nhận hồ sơ cho vị trí này." : "Đã tạm dừng nhận hồ sơ cho vị trí này.",
            hoatDong = viTri.HoatDong
        };
    }

    public async Task<object> XoaViTriAsync(string maViTri, string? phamViCongTy)
    {
        var viTri = await _db.ViTriTheoDots.SingleOrDefaultAsync(v => v.MaViTri == maViTri)
            ?? throw new KeyNotFoundException("Không tìm thấy vị trí tuyển dụng.");
        KiemTraPhamVi(phamViCongTy, viTri.MaCongTy);

        var hasPlacements = await _db.PhanBoThucTaps.AnyAsync(p => p.MaViTri == viTri.MaViTri && p.TrangThai != "Huy");
        var hasApplications = await _db.DangKyThucTaps.AnyAsync(d => d.MaViTri == viTri.MaViTri);

        if (hasPlacements || hasApplications)
        {
            viTri.HoatDong = false;
            await _db.SaveChangesAsync();
            return new
            {
                success = true,
                message = "Vị trí đã có sinh viên ứng tuyển hoặc phân bổ nên được chuyển sang trạng thái Tạm dừng nhận mới.",
                hoatDong = false
            };
        }

        _db.ViTriTheoDots.Remove(viTri);
        await _db.SaveChangesAsync();
        return new
        {
            success = true,
            message = "Đã xóa vị trí tuyển dụng thành công."
        };
    }

    public async Task<object> LuuTinTuyenDungAsync(CapNhatTinTuyenDungRequest request, string? phamViCongTy)

    {

        if (string.IsNullOrWhiteSpace(request.MaCongTy))

            throw new ArgumentException("Mã công ty không được để trống");



        var congTy = await GetCongTyAsync(request.MaCongTy, phamViCongTy);



        if (request.SoLuongNhan.HasValue)

        {

            if (request.SoLuongNhan.Value <= 0)

                throw new ArgumentException("Chỉ tiêu tiếp nhận phải lớn hơn 0.");

            var dot = await GetDotDangDienRaAsync();

            if (dot != null)

            {

                var daNhan = await DemDaTiepNhanAsync(congTy.MaCongTy, dot.MaSo);

                if (request.SoLuongNhan.Value < daNhan)

                    throw new InvalidOperationException($"Chỉ tiêu mới ({request.SoLuongNhan}) không được nhỏ hơn số sinh viên đã tiếp nhận ({daNhan}).");

            }

            congTy.SoLuongNhan = request.SoLuongNhan.Value;

        }



        if (!string.IsNullOrWhiteSpace(request.ViTriTuyen)) congTy.ViTriTuyen = request.ViTriTuyen.Trim();

        if (!string.IsNullOrWhiteSpace(request.ThoiGian)) congTy.ThoiGian = request.ThoiGian.Trim();

        if (request.YeuCau != null) congTy.YeuCau = request.YeuCau.Trim();



        await _db.SaveChangesAsync();



        return new

        {

            message = "Đã cập nhật thông tin DN chung. Vị trí, chỉ tiêu và thời hạn theo từng đợt do Khoa quản lý riêng.",

            congTy = new

            {

                congTy.MaCongTy,

                congTy.TenCongTy,

                congTy.ViTriTuyen,

                congTy.ThoiGian,

                congTy.SoLuongNhan,

                congTy.YeuCau,

                congTy.TrangThai

            },

            chiTieu = await GetChiTieuAsync(congTy)

        };

    }



    // ------------------------------------------------------------------ Ứng viên



    public async Task<object> GetUngVienAsync(string maCongTy, string? phamViCongTy, string? maDot = null)

    {

        KiemTraPhamVi(phamViCongTy, maCongTy);

        var dot = await GetReadRoundAsync(maDot);

        var dangKys = await _db.DangKyThucTaps.AsNoTracking()

            .Include(d => d.SinhVien).ThenInclude(s => s.HoSoNangLuc)

            // Mặc định chỉ hiện hồ sơ của đợt đang tuyển (hồ sơ các đợt cũ không còn xét)

            .Where(d => d.MaCongTy == maCongTy && d.MaDot == dot.MaSo

                && !_db.PhanBoThucTaps.Any(p => p.MaSinhVien == d.MaSV && p.MaDot == d.MaDot

                    && p.MaCongTy != maCongTy && p.TrangThai != "Huy"))

            .OrderBy(d => d.ThuTuUuTien)

            .ThenByDescending(d => d.NgayDangKy)

            .ToListAsync();



        var maSVs = dangKys.Select(d => d.MaSV).Distinct().ToList();

        var phanBos = await _db.PhanBoThucTaps.AsNoTracking()

            .Include(p => p.CongTy)

            .Where(p => maSVs.Contains(p.MaSinhVien) && p.TrangThai != "Huy")

            .ToListAsync();

        var phongVanCho = await _db.PhongVans.AsNoTracking()

            .Where(p => p.DaiDienDoanhNghiep.MaCongTy == maCongTy && maSVs.Contains(p.MaSinhVien) && p.KetQua == "ChuaCoKetQua"

                && p.DangKyThucTap != null && p.DangKyThucTap.MaDot == dot.MaSo)

            .Select(p => new { p.MaSinhVien, p.MaDK })

            .ToListAsync();



        var lockedRounds = (await _db.ChotDotThucTaps.AsNoTracking().Where(x => x.TrangThai != "ChuaChot").Select(x => x.MaDot).ToListAsync()).ToHashSet();

        return dangKys.Select(d =>

        {

            var sv = d.SinhVien;

            var hs = sv?.HoSoNangLuc;

            var pb = phanBos.FirstOrDefault(p => p.MaSinhVien == d.MaSV && p.MaDot == d.MaDot);

            return new

            {

                d.MaDK, d.MaViTri, ViTriDangKy = d.ViTriDangKy, YeuCauDangKy = d.YeuCauDangKy,

                d.MaSV,

                d.MaCongTy,

                d.MaDot,

                DaKhoaDot = lockedRounds.Contains(d.MaDot),

                d.NgayDangKy,

                d.TrangThai,

                HoTen = sv?.HoTen ?? d.MaSV,

                KhoaHoc = sv?.KhoaHoc ?? "",

                ChuyenNganh = sv?.ChuyenNganh ?? "",

                KyNang = sv?.KyNang ?? "",

                CongNghe = sv?.CongNghe ?? "",

                DuAnDaThucHien = sv?.DuAnDaThucHien ?? "",

                NdHoSo = hs?.NDHoSo ?? "",

                FileCV = hs?.FileCV ?? "",

                // SV đã được tiếp nhận (tại công ty này hoặc công ty khác) trong cùng đợt

                DaDuocTiepNhan = pb != null,

                NoiTiepNhan = pb?.CongTy?.TenCongTy,

                TiepNhanTaiDay = pb != null && pb.MaCongTy == maCongTy,

                CoLichPhongVanCho = phongVanCho.Any(p => p.MaSinhVien == d.MaSV && (p.MaDK == d.MaDK || p.MaDK == null))

            };

        }).ToList();

    }



    public async Task<object> CapNhatTrangThaiUngVienAsync(string maDK, string trangThai, string? phamViCongTy)

    {

        if (!TrangThaiDangKyHopLe.Contains(trangThai))

            throw new ArgumentException("Trạng thái hồ sơ chỉ nhận: ChoDuyet, DaDuyet, TuChoi.");



        var dk = await _db.DangKyThucTaps.Include(d => d.CongTy).FirstOrDefaultAsync(d => d.MaDK == maDK)

                 ?? throw new KeyNotFoundException($"Không tìm thấy phiếu đăng ký {maDK}");

        KiemTraPhamVi(phamViCongTy, dk.MaCongTy);

        if (dk.TrangThai == "TuChoi" && trangThai != "TuChoi") throw new InvalidOperationException("Hồ sơ đã kết thúc; không mở lại hoặc xóa lịch sử lượt đăng ký.");



        if (trangThai != dk.TrangThai)

        {

            var tiepNhanTaiDay = await _db.PhanBoThucTaps.AnyAsync(p =>

                p.MaSinhVien == dk.MaSV && p.MaCongTy == dk.MaCongTy && p.MaDot == dk.MaDot && p.TrangThai != "Huy");

            if (tiepNhanTaiDay)

                throw new InvalidOperationException("Sinh viên đã trúng tuyển tại doanh nghiệp. Muốn thay đổi, hãy cập nhật kết quả phỏng vấn.");

            var coLichPhongVan = await _db.PhongVans.AnyAsync(p =>

                p.MaSinhVien == dk.MaSV && p.DaiDienDoanhNghiep.MaCongTy == dk.MaCongTy && (p.MaDK == dk.MaDK || p.MaDK == null) && p.KetQua == "ChuaCoKetQua");

            if (coLichPhongVan && trangThai != "DaDuyet")

                throw new InvalidOperationException("Hồ sơ đang có lịch phỏng vấn chờ kết quả. Hãy ghi kết quả phỏng vấn thay vì đổi trạng thái hồ sơ.");

        }



        if (trangThai == "DaDuyet" && dk.TrangThai != "DaDuyet")

        {

            var dot = await _db.DotThucTaps.AsNoTracking().FirstAsync(d => d.MaSo == dk.MaDot);

            var chiTieu = await GetChiTieuAsync(dk.CongTy, dot);

            if (chiTieu.DaDuChiTieu)

                throw new InvalidOperationException($"Doanh nghiệp đã đủ chỉ tiêu ({chiTieu.DaTiepNhan}/{chiTieu.SoLuongNhan}) trong đợt này — đợt tuyển đã tự động đóng.");

            if (await SinhVienDaDuocTiepNhanAsync(dk.MaSV, dk.MaDot))

                throw new InvalidOperationException("Sinh viên đã được một doanh nghiệp tiếp nhận trong đợt này.");

        }



        dk.TrangThai = trangThai;

        if (trangThai == "TuChoi") dk.MaPVKetThuc = null;

        if (trangThai == "TuChoi") dk.LyDoKetThuc = "Doanh nghiệp từ chối hồ sơ trước phỏng vấn; không phải kết quả PV không đạt.";

        await _db.SaveChangesAsync();



        return new { message = "Cập nhật trạng thái duyệt hồ sơ thành công", maDK = dk.MaDK, trangThai = dk.TrangThai };

    }



    private Task<bool> SinhVienDaDuocTiepNhanAsync(string maSV, string maDot) =>

        _db.PhanBoThucTaps.AnyAsync(p => p.MaSinhVien == maSV && p.MaDot == maDot && p.TrangThai != "Huy");



    // ------------------------------------------------------------------ Phỏng vấn



    public async Task<object> GetPhongVanAsync(string maCongTy, string? phamViCongTy, string? maDot = null)

    {

        KiemTraPhamVi(phamViCongTy, maCongTy);

        var dot = await GetReadRoundAsync(maDot);

        var phongVans = await _db.PhongVans.AsNoTracking()

            .Include(p => p.DangKyThucTap)

            .Include(p => p.CacBuoiThayThe)

            .Include(p => p.SinhVien)

            .Include(p => p.DaiDienDoanhNghiep)

            .Where(p => p.DaiDienDoanhNghiep.MaCongTy == maCongTy && p.DangKyThucTap != null && p.DangKyThucTap.MaDot == dot.MaSo)

            .OrderByDescending(p => p.NgayPV)

            .ToListAsync();



        var lockedRounds = (await _db.ChotDotThucTaps.AsNoTracking().Where(x => x.TrangThai != "ChuaChot").Select(x => x.MaDot).ToListAsync()).ToHashSet();

        return phongVans.Select(p => new

        {

            p.MaPV, p.PhienBan, p.MaPVTruoc, DaThayThe = p.CacBuoiThayThe.Any(),

            p.MaSinhVien,

            p.MaDaiDien,

            p.HinhThuc,

            NgayPV = InterviewTimePolicy.WithOffset(p.NgayPV),

            p.KetQua,

            p.MaDK, MaDot = p.DangKyThucTap?.MaDot, p.LyDoKetQua, p.NguonKetQua, p.NguoiGhiKetQua, p.ThoiDiemKetQua,

            DaKhoaDot = p.DangKyThucTap == null || lockedRounds.Contains(p.DangKyThucTap.MaDot),

            ChoPhepGhiVang = _allowAbsenceRecording,

            HoTenSV = p.SinhVien?.HoTen ?? p.MaSinhVien,

            LopSV = p.SinhVien?.Lop ?? "",

            TenNguoiPV = p.DaiDienDoanhNghiep?.HoTen ?? "",

            ChucVuNguoiPV = p.DaiDienDoanhNghiep?.ChucVu ?? "",

            EmailNguoiPV = p.DaiDienDoanhNghiep?.Email ?? ""

        }).ToList();

    }



    public async Task<object> TaoPhongVanAsync(TaoPhongVanRequest request, string? phamViCongTy)

    {

        if (string.IsNullOrWhiteSpace(request.MaSinhVien) || string.IsNullOrWhiteSpace(request.MaDaiDien))

            throw new ArgumentException("Mã sinh viên và Mã người đại diện phỏng vấn không được để trống");



        var daiDien = await _db.DaiDienDoanhNghieps.Include(d => d.CongTy)

                          .FirstOrDefaultAsync(d => d.MaSo == request.MaDaiDien)

                      ?? throw new KeyNotFoundException($"Không tìm thấy người đại diện {request.MaDaiDien}");

        KiemTraPhamVi(phamViCongTy, daiDien.MaCongTy);



        var dangKy = await ResolveApplicationAsync(request.MaSinhVien, daiDien.MaCongTy, request.MaDK);

        if (dangKy.TrangThai == "TuChoi") throw new InvalidOperationException("Nguyện vọng đã kết thúc, không xếp lịch lại từ hồ sơ đã đóng.");



        var dot = await _db.DotThucTaps.AsNoTracking().FirstAsync(d => d.MaSo == dangKy.MaDot);

        if (dot.TrangThai != "DangDienRa") throw new InvalidOperationException("Đợt không còn mở xử lý phỏng vấn.");

        var chiTieu = await GetChiTieuAsync(daiDien.CongTy, dot);

        if (chiTieu.DaDuChiTieu)

            throw new InvalidOperationException("Doanh nghiệp đã đủ chỉ tiêu tiếp nhận — đợt tuyển đã đóng, không thể tạo lịch phỏng vấn mới.");

        if (await SinhVienDaDuocTiepNhanAsync(request.MaSinhVien, dangKy.MaDot))

            throw new InvalidOperationException("Sinh viên đã được một doanh nghiệp tiếp nhận trong đợt này.");

        var scheduled = _interviewTime.RequireFuture(request.NgayPV ?? _interviewTime.VietnamNow.AddDays(2));

        if (await _db.PhongVans.AnyAsync(p => p.MaSinhVien == request.MaSinhVien

                && p.DaiDienDoanhNghiep.MaCongTy == daiDien.MaCongTy && (p.MaDK == dangKy.MaDK || p.MaDK == null) && p.KetQua == "ChuaCoKetQua"))

            throw new InvalidOperationException("Sinh viên đã có lịch phỏng vấn chưa có kết quả tại doanh nghiệp. Hãy dời lịch hoặc ghi kết quả buổi đó.");



        // Mời phỏng vấn đồng nghĩa hồ sơ đã qua vòng xét

        if (dangKy.TrangThai == "ChoDuyet") dangKy.TrangThai = "DaDuyet";



        var pv = new DAL.Entities.PhongVan

        {

            MaPV = IdGenerator.New("PV"),

            MaDK = dangKy.MaDK,

            MaSinhVien = request.MaSinhVien,

            MaDaiDien = request.MaDaiDien,

            HinhThuc = string.IsNullOrWhiteSpace(request.HinhThuc) ? "Trực tuyến qua Google Meet" : request.HinhThuc.Trim(),

            NgayPV = scheduled,

            KetQua = "ChuaCoKetQua"

        };

        _db.PhongVans.Add(pv);

        await _db.SaveChangesAsync();



        return new

        {

            message = "Tạo lịch phỏng vấn thành công",

            phongVan = new { pv.MaPV, pv.MaSinhVien, pv.MaDaiDien, pv.HinhThuc, NgayPV = InterviewTimePolicy.WithOffset(pv.NgayPV), pv.KetQua }

        };

    }



    public async Task<object> GetPhongVanForFacultyAsync(string maDot)

    {

        if (!await _db.DotThucTaps.AnyAsync(d => d.MaSo == maDot)) throw new KeyNotFoundException("Không tìm thấy đợt.");

        var apps = await _db.DangKyThucTaps.AsNoTracking().Include(d => d.CongTy).Where(d => d.MaDot == maDot).ToListAsync();

        var ids = apps.Select(d => d.MaDK).ToArray();

        var studentIds = apps.Select(d => d.MaSV).Distinct().ToArray();

        var interviews = await _db.PhongVans.AsNoTracking().Include(p => p.CacBuoiThayThe).Include(p => p.DaiDienDoanhNghiep).Include(p => p.SinhVien)

            .Where(p => (p.MaDK != null && ids.Contains(p.MaDK)) || (p.MaDK == null && studentIds.Contains(p.MaSinhVien)))

            .OrderByDescending(p => p.NgayPV).ToListAsync();

        return interviews.Where(p => p.MaDK != null || apps.Any(d => d.MaSV == p.MaSinhVien && d.MaCongTy == p.DaiDienDoanhNghiep.MaCongTy))

            .Select(p => new { p.MaPV, p.PhienBan, p.MaPVTruoc, p.HinhThuc, p.MaDaiDien, DaThayThe = p.CacBuoiThayThe.Any(),

                MaDK = p.MaDK ?? apps.FirstOrDefault(d => d.MaSV == p.MaSinhVien && d.MaCongTy == p.DaiDienDoanhNghiep.MaCongTy)?.MaDK,

                p.MaSinhVien, HoTen = p.SinhVien.HoTen, NgayPV = InterviewTimePolicy.WithOffset(p.NgayPV), p.KetQua,

                p.LyDoKetQua, p.NguonKetQua, p.NguoiGhiKetQua, p.ThoiDiemKetQua, ChoPhepGhiVang = _allowAbsenceRecording,

                NguyenVongs = apps.Where(d => d.MaSV == p.MaSinhVien && d.MaCongTy == p.DaiDienDoanhNghiep.MaCongTy)

                    .Select(d => new { d.MaDK, d.MaDot, d.TrangThai, d.CongTy.TenCongTy }).ToList() }).ToList();

    }



    /// <summary>Dời lịch / đổi hình thức / đổi người phỏng vấn cho buổi phỏng vấn chưa có kết quả.</summary>

    public async Task<object> DoiLichPhongVanAsync(string maPV, DoiLichPhongVanRequest request, string? phamViCongTy)

    {

        var pv = await _db.PhongVans.Include(p => p.DaiDienDoanhNghiep).FirstOrDefaultAsync(p => p.MaPV == maPV)

                 ?? throw new KeyNotFoundException($"Không tìm thấy buổi phỏng vấn {maPV}");

        KiemTraPhamVi(phamViCongTy, pv.DaiDienDoanhNghiep.MaCongTy);

        if (pv.KetQua is not (null or "ChuaCoKetQua"))

            throw new InvalidOperationException("Buổi phỏng vấn đã có kết quả, không thể dời lịch.");

        _interviewTime.RequireNotStartedForReschedule(pv.NgayPV);

        if (!request.NgayPV.HasValue)

            throw new ArgumentException("Vui lòng chọn ngày giờ phỏng vấn mới.");

        var scheduled = _interviewTime.RequireFuture(request.NgayPV.Value);



        if (!string.IsNullOrWhiteSpace(request.MaDaiDien) && request.MaDaiDien != pv.MaDaiDien)

        {

            var dd = await _db.DaiDienDoanhNghieps.AsNoTracking().FirstOrDefaultAsync(d => d.MaSo == request.MaDaiDien)

                     ?? throw new KeyNotFoundException($"Không tìm thấy người đại diện {request.MaDaiDien}");

            if (dd.MaCongTy != pv.DaiDienDoanhNghiep.MaCongTy)

                throw new UnauthorizedAccessException("Người phỏng vấn phải thuộc doanh nghiệp.");

            pv.MaDaiDien = dd.MaSo;

        }

        pv.PhienBan++;

        pv.NgayPV = scheduled;

        if (!string.IsNullOrWhiteSpace(request.HinhThuc)) pv.HinhThuc = request.HinhThuc.Trim();

        await _db.SaveChangesAsync();



        return new { message = "Đã cập nhật lịch phỏng vấn", phongVan = new { pv.MaPV, pv.MaDaiDien, pv.HinhThuc, NgayPV = InterviewTimePolicy.WithOffset(pv.NgayPV), pv.KetQua } };

    }



    // Không đoán đợt mới nhất từ lịch cũ. Thiếu mã chỉ chấp nhận đúng một hồ sơ phù hợp toàn lịch sử.

    private async Task<DAL.Entities.DangKyThucTap> ResolveApplicationAsync(string maSV, string maCongTy, string? maDK)

    {

        var query = _db.DangKyThucTaps.Include(d => d.DotThucTap).Where(d => d.MaSV == maSV && d.MaCongTy == maCongTy);

        if (!string.IsNullOrWhiteSpace(maDK)) query = query.Where(d => d.MaDK == maDK);

        var matches = await query.Take(2).ToListAsync();

        if (matches.Count != 1) throw new InvalidOperationException("Chưa xác định duy nhất nguyện vọng/đợt của lịch PV. Khoa cần chọn đúng mã đăng ký trước khi ghi nhận; không tự lấy đợt mới nhất.");

        return matches[0];

    }



    /// <summary>

    /// Ghi nhận kết quả phỏng vấn.

    /// Gắn đúng nguyện vọng/đợt; kết quả đã ghi không sửa đè. Dat tạo tiếp nhận tạm, SV chọn mới đóng hồ sơ khác.

    /// Không đạt/vắng kết thúc đúng nguyện vọng, giữ lý do, nguồn, người/thời điểm và nhật ký.

    /// Vi phạm nghiệp vụ được TRẢ VỀ (ThanhCong = false) thay vì ném exception, và mọi kiểm tra chạy trước khi

    /// mở transaction, để không giữ khóa CSDL khi có lỗi (debugger dừng tiến trình sẽ treo toàn bộ API).

    /// </summary>

    public Task<KetQuaPhongVanResult> CapNhatKetQuaPhongVanAsync(string maPV, string ketQua, string? phamViCongTy,

        string? lyDo = null, string? actor = null, string nguon = "DoanhNghiep", string? maDK = null)

        => LuuKetQuaPhongVanAsync(maPV, ketQua, phamViCongTy, lyDo, actor, nguon, maDK, false);



    private async Task<KetQuaPhongVanResult> LuuKetQuaPhongVanAsync(string maPV, string ketQua, string? phamViCongTy,

        string? lyDo, string? actor, string nguon, string? maDK, bool isCorrection)

    {

        if (!KetQuaPhongVanHopLe.Contains(ketQua))

            throw new ArgumentException("Kết quả phỏng vấn chỉ nhận: Dat, KhongDat, Vang; không xóa kết quả về chờ.");



        var pv = await _db.PhongVans.Include(p => p.DaiDienDoanhNghiep).ThenInclude(d => d.CongTy)

                     .FirstOrDefaultAsync(p => p.MaPV == maPV)

                 ?? throw new KeyNotFoundException($"Không tìm thấy buổi phỏng vấn {maPV}");

        var congTy = pv.DaiDienDoanhNghiep.CongTy;

        KiemTraPhamVi(phamViCongTy, congTy.MaCongTy);

        if (ketQua == "Vang" && !_allowAbsenceRecording)

            throw new InvalidOperationException("Chức năng ghi vắng/bỏ PV đang được tắt bằng cấu hình quản trị.");

        if (pv.MaDK != null && maDK != null && pv.MaDK != maDK)

            throw new InvalidOperationException("Lịch đã gắn nguyện vọng khác; không đổi liên kết lịch sử.");

        if (nguon is not ("DoanhNghiep" or "DNThongBao" or "SVTrinhBay")) throw new ArgumentException("Nguồn thông tin không hợp lệ.");

        if (phamViCongTy != null && nguon != "DoanhNghiep") throw new UnauthorizedAccessException("DN chỉ ghi nhận bằng tài khoản công ty của mình.");

        if (actor?.Length > 20 || lyDo?.Length > 1000) throw new ArgumentException("Người ghi hoặc lý do vượt độ dài cho phép.");

        if ((ketQua != "Dat" || nguon != "DoanhNghiep") && actor != null && string.IsNullOrWhiteSpace(lyDo))

            throw new ArgumentException("Cần lý do/căn cứ khi ghi không đạt/vắng hoặc Khoa ghi nhận từ bên ngoài.");



        KetQuaPhongVanResult ThatBai(string lyDo) => new(pv.MaPV, pv.KetQua ?? "ChuaCoKetQua", null, false, 0, lyDo, ThanhCong: false);



        if (!_interviewTime.HasStarted(pv.NgayPV))

            return ThatBai("Chưa đến giờ phỏng vấn theo lịch hiện tại (giờ Việt Nam, UTC+7), chưa thể ghi kết quả.");



        var dangKy = await ResolveApplicationAsync(pv.MaSinhVien, congTy.MaCongTy, pv.MaDK ?? maDK);

        if (dangKy.DotThucTap.TrangThai != "DangDienRa") return ThatBai("Đợt không còn mở ghi nhận kết quả PV.");

        var phanBoHienTai = await _db.PhanBoThucTaps.FirstOrDefaultAsync(p =>

                p.MaSinhVien == pv.MaSinhVien && p.MaDot == dangKy.MaDot && p.TrangThai != "Huy");



        if (await _db.PhanBoThucTaps.AnyAsync(p => p.MaSinhVien == pv.MaSinhVien

                && p.MaDot == dangKy.MaDot && p.NgayHuy != null))

            return ThatBai("Nơi thực tập đã được Khoa xử lý hủy/đổi. Không sửa kết quả PV cũ để tái tạo hoặc hủy phân bổ; liên hệ Khoa.");

        if (phanBoHienTai?.DaDuocKhoaDuyet == true && ketQua != (pv.KetQua ?? "ChuaCoKetQua"))

            return ThatBai("Phân bổ đã được Khoa công nhận/chốt. Thay đổi nơi thực tập phải trình Khoa, không sửa kết quả PV để hủy nơi đã chốt.");



        if (phanBoHienTai != null && await _db.DeXuatThucTapTuTims.AnyAsync(x => x.MaPhanBo == phanBoHienTai.MaPhanBo && x.TrangThai == "DaDuyet"))

            return ThatBai("Nơi thực tập tự tìm đã được Khoa công nhận, không được đổi phân bổ qua kết quả phỏng vấn cũ.");

        if (await _db.PhongVans.AnyAsync(x => x.MaPVTruoc == pv.MaPV)) return ThatBai("Buổi PV đã được thay thế; dùng buổi mới nhất.");

        if (!isCorrection && pv.KetQua is not (null or "ChuaCoKetQua"))

            return ketQua == pv.KetQua

                ? new(pv.MaPV, pv.KetQua, null, false, 0, "Kết quả đã được ghi trước đó; không tạo dữ liệu lặp.")

                : ThatBai("Buổi PV đã có kết quả. Không sửa đè hoặc mở lại lịch sử; liên hệ Khoa để xử lý hồ sơ liên quan.");

        if (dangKy.TrangThai == "TuChoi" && (!isCorrection || dangKy.MaPVKetThuc != pv.MaPV)) return ThatBai("Nguyện vọng đã kết thúc; không ghi kết quả mới hoặc tái tạo tiếp nhận từ lịch cũ.");



        // ---------------- Kiểm tra nghiệp vụ (chưa mở transaction)

        if (ketQua == "Dat")

        {

            if (congTy.TrangThai != "DaDuyet")

                return ThatBai("Doanh nghiệp chưa được Khoa phê duyệt nên chưa thể tiếp nhận sinh viên.");

            if (phanBoHienTai != null && phanBoHienTai.MaCongTy != congTy.MaCongTy)

                return ThatBai("Sinh viên đã được doanh nghiệp khác tiếp nhận trong đợt này.");

            if (phanBoHienTai == null)

            {

                var chiTieu = await GetChiTieuAsync(congTy, dangKy.DotThucTap);

                if (chiTieu.DaDuChiTieu)

                    return ThatBai($"Doanh nghiệp đã đủ chỉ tiêu ({chiTieu.DaTiepNhan}/{chiTieu.SoLuongNhan}) — không thể tiếp nhận thêm.");

            }

        }

        else if (phanBoHienTai != null && phanBoHienTai.MaCongTy == congTy.MaCongTy)

        {

            if (phanBoHienTai.TrangThai != "ChuaNhanViec")

                return ThatBai("Nơi thực tập đã được SV xác nhận/bắt đầu; cần trình Khoa, không sửa kết quả PV để hủy nơi.");

            if (phanBoHienTai.TrangThai == "HoanThanh")

                return ThatBai("Sinh viên đã hoàn thành thực tập tại doanh nghiệp, không thể đổi kết quả phỏng vấn.");

            var daCoDiem = await _db.PhieuChamDiems.AnyAsync(p =>

                p.MaSV == pv.MaSinhVien && p.MaDot == phanBoHienTai.MaDot && p.ChiTietChamDiems.Any());

            if (daCoDiem)

                return ThatBai("Sinh viên đã có điểm đánh giá thực tập, không thể hủy kết quả trúng tuyển. Liên hệ Khoa để xử lý.");

        }



        // ---------------- Ghi dữ liệu

        string? maPB = null;

        var daDong = false;

        var soTuChoi = 0;

        var message = "Cập nhật kết quả phỏng vấn thành công.";



        var useTx = _db.Database.IsRelational() && _db.Database.CurrentTransaction == null;

        await using var tx = useTx ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;

        var previousResult = pv.KetQua;

        var beforeSnapshot = InterviewSnapshot(pv);

        pv.PhienBan++;

        pv.MaDK = dangKy.MaDK;

        pv.LyDoKetQua = lyDo?.Trim(); pv.NguonKetQua = nguon; pv.NguoiGhiKetQua = actor;

        pv.ThoiDiemKetQua = InterviewTimePolicy.WithOffset(_interviewTime.VietnamNow);

        var resultAudit = new NhatKyPhongVan { Loai = isCorrection ? "SuaKetQua" : "KetQua", NoiDungCu = beforeSnapshot, MaNhatKy = IdGenerator.New("NPV"), MaPV = pv.MaPV, MaDK = dangKy.MaDK,

            KetQuaCu = previousResult, KetQuaMoi = ketQua, LyDo = lyDo?.Trim() ?? "", Nguon = nguon,

            NguoiThucHien = actor ?? "NoiBo", ThoiDiem = pv.ThoiDiemKetQua.Value };

        _db.NhatKyPhongVans.Add(resultAudit);



        if (ketQua == "Dat")

        {

            var maDot = dangKy!.MaDot;

            var phanBo = phanBoHienTai;

            if (phanBo == null)

            {

                if (await _db.PhanBoThucTaps.AsNoTracking().AnyAsync(p => p.MaSinhVien == pv.MaSinhVien && p.MaDot == maDot && p.TrangThai != "Huy"))

                {

                    if (tx != null) await tx.RollbackAsync();

                    return ThatBai("Sinh viên vừa có nơi thực tập trong đợt này. Vui lòng tải lại trước khi xử lý.");

                }

                // Kiểm tra lại trong transaction để không vượt chỉ tiêu khi 2 người duyệt cùng lúc

                if ((await GetChiTieuAsync(congTy, dangKy.DotThucTap)).DaDuChiTieu)

                {

                    if (tx != null) await tx.RollbackAsync();

                    return ThatBai("Doanh nghiệp vừa đủ chỉ tiêu — không thể tiếp nhận thêm.");

                }



                var position = await PositionCapacity.RequireRoomAsync(_db, congTy.MaCongTy, maDot, dangKy.MaViTri, allowInactive: true);

                phanBo = new DAL.Entities.PhanBoThucTap

                {

                    MaPhanBo = IdGenerator.New("PB"),

                    MaSinhVien = pv.MaSinhVien,

                    MaCongTy = congTy.MaCongTy,

                    MaViTri = position?.MaViTri,

                    MaDot = maDot,

                    NgayPhanBo = DateTime.Today,

                    TrangThai = "ChuaNhanViec",

                    DaDuocKhoaDuyet = false

                };

                _db.PhanBoThucTaps.Add(phanBo);

                _db.HuongDanDoanhNghieps.Add(new HuongDanDoanhNghiep

                {

                    MaSo = IdGenerator.New("HDN"),

                    MaPhanBo = phanBo.MaPhanBo,

                    MaDaiDien = pv.MaDaiDien,

                    NgayBD = dangKy.DotThucTap?.ThoiGianBD > DateTime.Today ? dangKy.DotThucTap.ThoiGianBD : DateTime.Today,

                    VaiTro = string.IsNullOrWhiteSpace(pv.DaiDienDoanhNghiep.ChucVu) ? "Mentor hướng dẫn chuyên môn" : pv.DaiDienDoanhNghiep.ChucVu

                });

            }

            maPB = phanBo.MaPhanBo;

            dangKy.TrangThai = "DaDuyet"; dangKy.MaPVKetThuc = null; dangKy.LyDoKetThuc = null;



            pv.KetQua = ketQua;

            resultAudit.NoiDungMoi = InterviewSnapshot(pv);

            await _db.SaveChangesAsync();



            // Đủ chỉ tiêu → tự đóng tuyển

            var sauKhiNhan = await GetChiTieuAsync(congTy, dangKy.DotThucTap);

            if (sauKhiNhan.DaDuChiTieu)

            {

                daDong = true;

                message = $"Đã tiếp nhận sinh viên. Đủ chỉ tiêu các vị trí hoặc tổng trần DN — đóng nhận mới; giữ các hồ sơ đang xử lý.";

            }

            else

            {

                message = $"Đã tiếp nhận sinh viên ({sauKhiNhan.DaTiepNhan}/{sauKhiNhan.SoLuongNhan} chỉ tiêu).";

            }

        }

        else

        {

            if (phanBoHienTai != null && phanBoHienTai.MaCongTy == congTy.MaCongTy)

            {

                // Hủy quyết định tiếp nhận → công ty có thêm 1 chỉ tiêu (tự mở lại tuyển nếu trước đó đã đủ)

                var dangThucTap = phanBoHienTai.TrangThai == "DangThucTap";

                phanBoHienTai.TrangThai = "Huy";

                if (isCorrection) { phanBoHienTai.LyDoHuy = "Sửa kết quả PV nhập nhầm; hủy tiếp nhận tạm"; phanBoHienTai.CanCuHuy = lyDo?.Trim(); phanBoHienTai.NguoiHuy = actor; }

                var conGVHD = await _db.GVHuongDans.AnyAsync(g => g.MaSinhVien == pv.MaSinhVien && g.TrangThai == "DangHuongDan");

                message = "Đã cập nhật kết quả và hủy quyết định tiếp nhận của sinh viên."

                          + (dangThucTap ? " Sinh viên đang thực tập nên cần thông báo cho sinh viên và Khoa." : "")

                          + (conGVHD ? " Sinh viên vẫn còn GVHD, Khoa cần xem lại phân công." : "");

            }

            if (dangKy != null)

            {

                dangKy.TrangThai = "TuChoi"; dangKy.MaPVKetThuc = pv.MaPV;

                dangKy.LyDoKetThuc = ketQua == "Vang" ? "Vắng/bỏ phỏng vấn: " + lyDo : "Phỏng vấn không đạt: " + lyDo;

                if (dangKy.LyDoKetThuc.Length > 1000) dangKy.LyDoKetThuc = dangKy.LyDoKetThuc[..1000];

            }



            pv.KetQua = ketQua;

            resultAudit.NoiDungMoi = InterviewSnapshot(pv);

            await _db.SaveChangesAsync();

        }



        if (tx != null) await tx.CommitAsync();

        return new KetQuaPhongVanResult(pv.MaPV, pv.KetQua!, maPB, daDong, soTuChoi, message);

    }



    // ------------------------------------------------------------------ Thực tập sinh & đánh giá



    public async Task<object> GetThucTapSinhAsync(string maCongTy, string? phamViCongTy, string? maDot = null)

    {

        var congTy = await GetCongTyAsync(maCongTy, phamViCongTy);

        var dot = await GetReadRoundAsync(maDot);

        var phanBos = await _db.PhanBoThucTaps.AsNoTracking()

            .Include(p => p.HoSoTuTim)

            .Include(p => p.SinhVien)

            .Include(p => p.DotThucTap)

            .Include(p => p.HuongDanDoanhNghieps).ThenInclude(h => h.DaiDienDoanhNghiep)

            .Where(p => p.MaCongTy == maCongTy && p.MaDot == dot.MaSo && p.DaDuocKhoaDuyet && (p.TrangThai == "DangThucTap" || p.TrangThai == "HoanThanh"))

            .OrderByDescending(p => p.NgayPhanBo)

            .ToListAsync();



        var maSVs = phanBos.Select(p => p.MaSinhVien).Distinct().ToList();

        var positionNames = await _db.ViTriTheoDots.AsNoTracking().Where(x => x.MaCongTy == maCongTy).ToDictionaryAsync(x => x.MaViTri, x => x.TenViTri);

        var roundPositions = await _db.CongTyTheoDots.AsNoTracking().Where(x => x.MaCongTy == maCongTy).ToDictionaryAsync(x => x.MaDot, x => x.ViTriTuyen);

        var snapshots = (await _db.DangKyThucTaps.AsNoTracking().Where(x => x.MaCongTy == maCongTy && maSVs.Contains(x.MaSV) && x.ViTriDangKy != null)

            .Select(x => new { x.MaSV, x.MaDot, x.ViTriDangKy }).ToListAsync()).ToDictionary(x => (x.MaSV, x.MaDot), x => x.ViTriDangKy);

        var gvhds = await _db.GVHuongDans.AsNoTracking()

            .Include(g => g.GiangVien)

            .Where(g => maSVs.Contains(g.MaSinhVien) && g.TrangThai == "DangHuongDan")

            .ToListAsync();

        var phieus = await _db.PhieuChamDiems.AsNoTracking()

            .Include(p => p.ChiTietChamDiems).ThenInclude(c => c.TieuChi)

            .Where(p => maSVs.Contains(p.MaSV))

            .ToListAsync();

        var tieuChisDN = await _db.TieuChis.AsNoTracking()

            .Where(t => t.NhomDanhGia == ThangDiem.NhomDoanhNghiep).ToListAsync();



        return phanBos.Select(pb =>

        {

            var hd = pb.HuongDanDoanhNghieps.FirstOrDefault();

            var dd = hd?.DaiDienDoanhNghiep;

            var gv = gvhds.FirstOrDefault(g => g.MaSinhVien == pb.MaSinhVien && g.MaDot == pb.MaDot)?.GiangVien;

            var phieu = phieus.FirstOrDefault(p => p.MaSV == pb.MaSinhVien && p.MaDot == pb.MaDot);

            var tieuChiTrongDot = tieuChisDN.Where(t => t.MaRubric == (pb.DotThucTap?.MaRubric ?? "LEGACY_4TC")).ToList();

            var tieuChiIds = tieuChiTrongDot.Select(t => t.MaTieuChi).ToHashSet();

            var diemDN = phieu?.ChiTietChamDiems

                .Where(c => tieuChiIds.Contains(c.MaTieuChi))

                .OrderBy(c => c.TieuChi!.ThuTu)

                .Select(c => new { c.MaTieuChi, c.DiemCham })

                .ToList() ?? new();

            var daDanhGia = tieuChiIds.Count > 0 && diemDN.Count == tieuChiIds.Count ;



            return new

            {

                pb.MaPhanBo,

                pb.MaSinhVien,

                pb.MaCongTy,

                pb.MaDot,

                TenDot = pb.DotThucTap?.TenDot,

                pb.NgayPhanBo,

                pb.TrangThai,

                HoTenSV = pb.SinhVien?.HoTen ?? pb.MaSinhVien,

                LopSV = pb.SinhVien?.Lop ?? "",

                ChuyenNganhSV = pb.SinhVien?.ChuyenNganh ?? "",

                ViTriThucTap = pb.HoSoTuTim?.ViTri ?? snapshots.GetValueOrDefault((pb.MaSinhVien, pb.MaDot)) ?? (pb.MaViTri == null ? null : positionNames.GetValueOrDefault(pb.MaViTri)) ?? roundPositions.GetValueOrDefault(pb.MaDot) ?? congTy.ViTriTuyen ?? "",

                ThoiGianThucTap = pb.HoSoTuTim == null ? congTy.ThoiGian ?? "" : $"{pb.HoSoTuTim.NgayBatDau:dd/MM/yyyy} - {pb.HoSoTuTim.NgayKetThuc:dd/MM/yyyy}",

                TenMentor = dd?.HoTen ?? "",

                ChucVuMentor = dd?.ChucVu ?? "",

                EmailMentor = dd?.Email ?? "",

                TenGVHD = gv?.HoTen ?? "",

                DanhGia = phieu?.NhanXetDN ?? hd?.DanhGia ?? "",

                DiemDN = daDanhGia ? diemDN.Sum(x => x.DiemCham) : (decimal?)null,

                DiemToiDaDN = tieuChiTrongDot.Sum(t => t.DiemToiDa),

                ChiTietDiemDN = diemDN,

                DaDanhGia = daDanhGia,

                DaKhoaDiem = phieu?.DaDoiChieuPhieuDN ?? false

            };

        }).ToList();

    }



    public async Task<object> DanhGiaThucTapSinhAsync(DanhGiaThucTapSinhRequest request, string? maDaiDienActor, string? phamViCongTy)

    {

        var pb = await _db.PhanBoThucTaps.AsNoTracking().FirstOrDefaultAsync(x => x.MaPhanBo == request.MaPhanBo && x.TrangThai != "Huy")

            ?? throw new KeyNotFoundException("Không tìm thấy phân bổ thực tập.");

        if (pb.TrangThai is not ("DangThucTap" or "HoanThanh"))

            throw new InvalidOperationException("Chỉ được đánh giá sinh viên đã nhận việc thực tập.");

        await GetCongTyAsync(pb.MaCongTy, phamViCongTy);

        if (string.IsNullOrWhiteSpace(maDaiDienActor)) throw new UnauthorizedAccessException("Chỉ đại diện doanh nghiệp được nhập điểm.");

        var dto = await _phieuChamDiem.LuuDiemDoanhNghiepAsync(

            pb.MaSinhVien, pb.MaDot, maDaiDienActor, request.ChiTiets, request.NhanXet,

            isStaff: false, khoaChinhThuc: request.KhoaChinhThuc);

        return new

        {

            success = true,

            message = request.KhoaChinhThuc 

                ? "Đã nộp và khóa điểm đánh giá chính thức thành công." 

                : "Đã lưu điểm và nhận xét của doanh nghiệp thành công.",

            maPhieu = dto.MaPhieu,

            maSV = dto.MaSV,

            maDot = dto.MaDot,

            diemDN = dto.DiemDN,

            daChamDN = dto.DaChamDN,

            daKhoaDiem = dto.DaDoiChieuPhieuDN,

            nhanXetDN = dto.NhanXetDN,

            chiTiets = dto.ChiTiets.Where(c => c.NhomDanhGia == ThangDiem.NhomDoanhNghiep).ToList()

        };

    }

}

