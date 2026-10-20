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
public class DoanhNghiepService
{
    private static readonly string[] TrangThaiDangKyHopLe = { "ChoDuyet", "DaDuyet", "TuChoi" };
    private static readonly string[] KetQuaPhongVanHopLe = { "Dat", "KhongDat", "ChuaCoKetQua" };

    private readonly AppDbContext _db;
    private readonly IPhieuChamDiemService _phieuChamDiem;

    public DoanhNghiepService(AppDbContext db, IPhieuChamDiemService phieuChamDiem)
    {
        _db = db;
        _phieuChamDiem = phieuChamDiem;
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
        var soLuongNhan = congTy.SoLuongNhan ?? 0;
        if (dot == null)
            return new ChiTieuTiepNhanDto(null, null, soLuongNhan, 0, soLuongNhan, false, "KhongCoDot");

        var daNhan = await DemDaTiepNhanAsync(congTy.MaCongTy, dot.MaSo);
        // soLuongNhan <= 0 được hiểu là không giới hạn chỉ tiêu
        var daDu = soLuongNhan > 0 && daNhan >= soLuongNhan;
        var trangThai = congTy.TrangThai != "DaDuyet" ? "ChuaDuocDuyet" : daDu ? "DaDuChiTieu" : "DangTuyen";
        return new ChiTieuTiepNhanDto(dot.MaSo, dot.TenDot, soLuongNhan, daNhan,
            soLuongNhan > 0 ? Math.Max(0, soLuongNhan - daNhan) : int.MaxValue, daDu, trangThai);
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

    public async Task<object> GetTongQuanAsync(string maCongTy, string? phamViCongTy)
    {
        var congTy = await GetCongTyAsync(maCongTy, phamViCongTy);
        var chiTieu = await GetChiTieuAsync(congTy);

        var daiDiens = await _db.DaiDienDoanhNghieps.AsNoTracking()
            .Where(d => d.MaCongTy == maCongTy)
            .OrderBy(d => d.MaSo)
            .Select(d => new { d.MaSo, d.HoTen, d.ChucVu, d.Email })
            .ToListAsync();

        var dangKy = _db.DangKyThucTaps.AsNoTracking().Where(d => d.MaCongTy == maCongTy);
        if (chiTieu.MaDot != null) dangKy = dangKy.Where(d => d.MaDot == chiTieu.MaDot);

        var daiDienIds = daiDiens.Select(d => d.MaSo).ToList();
        var ungVienMoiNhat = await dangKy
            .OrderByDescending(d => d.NgayDangKy)
            .Take(5)
            .Select(d => new
            {
                d.MaDK,
                d.MaSV,
                HoTen = d.SinhVien.HoTen,
                Lop = d.SinhVien.Lop,
                Gpa = d.SinhVien.Gpa,
                d.ThuTuUuTien,
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
                soViTriTuyen = string.IsNullOrEmpty(congTy.ViTriTuyen) ? 0 : 1,
                soLuongNhan = congTy.SoLuongNhan ?? 0,
                soUngVien = await dangKy.CountAsync(),
                soChoDuyet = await dangKy.CountAsync(d => d.TrangThai == "ChoDuyet"),
                soDaDuyet = await dangKy.CountAsync(d => d.TrangThai == "DaDuyet"),
                soPhongVan = await _db.PhongVans.CountAsync(p => daiDienIds.Contains(p.MaDaiDien)),
                soThucTapSinh = chiTieu.DaTiepNhan
            },
            ungVienMoiNhat
        };
    }

    // ------------------------------------------------------------------ Tin tuyển dụng

    public async Task<object> GetTinTuyenDungAsync(string maCongTy, string? phamViCongTy)
    {
        var congTy = await GetCongTyAsync(maCongTy, phamViCongTy);
        var chiTieu = await GetChiTieuAsync(congTy);
        var soUngVien = await _db.DangKyThucTaps.CountAsync(d =>
            d.MaCongTy == maCongTy && (chiTieu.MaDot == null || d.MaDot == chiTieu.MaDot));

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
            chiTieu
        };
    }

    /// <summary>
    /// Doanh nghiệp cập nhật nội dung tin tuyển dụng. Trạng thái phê duyệt (DaDuyet/TuChoi/DongBang) thuộc thẩm quyền Khoa
    /// nên không thể tự sửa ở đây. Tăng chỉ tiêu sẽ tự động mở lại đợt tuyển nếu trước đó đã đủ.
    /// </summary>
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
            message = "Cập nhật tin tuyển dụng thành công",
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

    public async Task<object> GetUngVienAsync(string maCongTy, string? phamViCongTy)
    {
        KiemTraPhamVi(phamViCongTy, maCongTy);
        var dangKys = await _db.DangKyThucTaps.AsNoTracking()
            .Include(d => d.SinhVien).ThenInclude(s => s.HoSoNangLuc)
            .Where(d => d.MaCongTy == maCongTy)
            .OrderBy(d => d.ThuTuUuTien)
            .ThenByDescending(d => d.NgayDangKy)
            .ToListAsync();

        var maSVs = dangKys.Select(d => d.MaSV).Distinct().ToList();
        var phanBos = await _db.PhanBoThucTaps.AsNoTracking()
            .Include(p => p.CongTy)
            .Where(p => maSVs.Contains(p.MaSinhVien) && p.TrangThai != "Huy")
            .ToListAsync();

        return dangKys.Select(d =>
        {
            var sv = d.SinhVien;
            var hs = sv?.HoSoNangLuc;
            var pb = phanBos.FirstOrDefault(p => p.MaSinhVien == d.MaSV && p.MaDot == d.MaDot);
            return new
            {
                d.MaDK,
                d.MaSV,
                d.MaCongTy,
                d.MaDot,
                d.NgayDangKy,
                d.ThuTuUuTien,
                d.TrangThai,
                HoTen = sv?.HoTen ?? d.MaSV,
                Lop = sv?.Lop ?? "",
                KhoaHoc = sv?.KhoaHoc ?? "",
                Gpa = sv?.Gpa,
                ChuyenNganh = sv?.ChuyenNganh ?? "",
                KyNang = sv?.KyNang ?? "",
                CongNghe = sv?.CongNghe ?? "",
                DuAnDaThucHien = sv?.DuAnDaThucHien ?? "",
                NdHoSo = hs?.NDHoSo ?? "",
                FileCV = hs?.FileCV ?? "",
                // SV đã được tiếp nhận (tại công ty này hoặc công ty khác) trong cùng đợt
                DaDuocTiepNhan = pb != null,
                NoiTiepNhan = pb?.CongTy?.TenCongTy
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
        await _db.SaveChangesAsync();

        return new { message = "Cập nhật trạng thái duyệt hồ sơ thành công", maDK = dk.MaDK, trangThai = dk.TrangThai };
    }

    private Task<bool> SinhVienDaDuocTiepNhanAsync(string maSV, string maDot) =>
        _db.PhanBoThucTaps.AnyAsync(p => p.MaSinhVien == maSV && p.MaDot == maDot && p.TrangThai != "Huy");

    // ------------------------------------------------------------------ Phỏng vấn

    public async Task<object> GetPhongVanAsync(string maCongTy, string? phamViCongTy)
    {
        KiemTraPhamVi(phamViCongTy, maCongTy);
        var phongVans = await _db.PhongVans.AsNoTracking()
            .Include(p => p.SinhVien)
            .Include(p => p.DaiDienDoanhNghiep)
            .Where(p => p.DaiDienDoanhNghiep.MaCongTy == maCongTy)
            .OrderByDescending(p => p.NgayPV)
            .ToListAsync();

        return phongVans.Select(p => new
        {
            p.MaPV,
            p.MaSinhVien,
            p.MaDaiDien,
            p.HinhThuc,
            p.NgayPV,
            p.KetQua,
            HoTenSV = p.SinhVien?.HoTen ?? p.MaSinhVien,
            LopSV = p.SinhVien?.Lop ?? "",
            GpaSV = p.SinhVien?.Gpa,
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

        var dangKy = await TimDangKyAsync(request.MaSinhVien, daiDien.MaCongTy)
                     ?? throw new InvalidOperationException("Sinh viên chưa đăng ký nguyện vọng vào doanh nghiệp này (hoặc hồ sơ đã bị từ chối).");

        var dot = await _db.DotThucTaps.AsNoTracking().FirstAsync(d => d.MaSo == dangKy.MaDot);
        var chiTieu = await GetChiTieuAsync(daiDien.CongTy, dot);
        if (chiTieu.DaDuChiTieu)
            throw new InvalidOperationException("Doanh nghiệp đã đủ chỉ tiêu tiếp nhận — đợt tuyển đã đóng, không thể tạo lịch phỏng vấn mới.");
        if (await SinhVienDaDuocTiepNhanAsync(request.MaSinhVien, dangKy.MaDot))
            throw new InvalidOperationException("Sinh viên đã được một doanh nghiệp tiếp nhận trong đợt này.");

        var pv = new DAL.Entities.PhongVan
        {
            MaPV = IdGenerator.New("PV"),
            MaSinhVien = request.MaSinhVien,
            MaDaiDien = request.MaDaiDien,
            HinhThuc = string.IsNullOrWhiteSpace(request.HinhThuc) ? "Trực tuyến qua Google Meet" : request.HinhThuc.Trim(),
            NgayPV = request.NgayPV ?? DateTime.Today.AddDays(2),
            KetQua = "ChuaCoKetQua"
        };
        _db.PhongVans.Add(pv);
        await _db.SaveChangesAsync();

        return new
        {
            message = "Tạo lịch phỏng vấn thành công",
            phongVan = new { pv.MaPV, pv.MaSinhVien, pv.MaDaiDien, pv.HinhThuc, pv.NgayPV, pv.KetQua }
        };
    }

    /// <summary>Nguyện vọng của SV vào công ty, ưu tiên đợt đang diễn ra. Mặc định bỏ qua nguyện vọng đã bị từ chối.</summary>
    private async Task<DAL.Entities.DangKyThucTap?> TimDangKyAsync(string maSV, string maCongTy, bool gomCaTuChoi = false)
    {
        var dangKys = await _db.DangKyThucTaps
            .Include(d => d.DotThucTap)
            .Where(d => d.MaSV == maSV && d.MaCongTy == maCongTy && (gomCaTuChoi || d.TrangThai != "TuChoi"))
            .ToListAsync();
        return dangKys
            .OrderByDescending(d => d.DotThucTap?.TrangThai == "DangDienRa")
            .ThenByDescending(d => d.TrangThai != "TuChoi")
            .ThenByDescending(d => d.NgayDangKy)
            .FirstOrDefault();
    }

    /// <summary>
    /// Ghi nhận kết quả phỏng vấn.
    /// - "Dat": tạo phân bổ tiếp nhận (ChuaNhanViec) trong đúng đợt của nguyện vọng, tự từ chối các nguyện vọng
    ///   chờ duyệt khác của SV; nếu công ty vừa đủ chỉ tiêu thì tự động đóng tuyển.
    /// - Đổi từ "Dat" sang kết quả khác: hủy quyết định tiếp nhận (kể cả khi SV đang thực tập), trừ khi SV đã
    ///   hoàn thành thực tập hoặc đã có điểm — khi đó từ chối thay đổi.
    /// Vi phạm nghiệp vụ được TRẢ VỀ (ThanhCong = false) thay vì ném exception, và mọi kiểm tra chạy trước khi
    /// mở transaction, để không giữ khóa CSDL khi có lỗi (debugger dừng tiến trình sẽ treo toàn bộ API).
    /// </summary>
    public async Task<KetQuaPhongVanResult> CapNhatKetQuaPhongVanAsync(string maPV, string ketQua, string? phamViCongTy)
    {
        if (!KetQuaPhongVanHopLe.Contains(ketQua))
            throw new ArgumentException("Kết quả phỏng vấn chỉ nhận: Dat, KhongDat, ChuaCoKetQua.");

        var pv = await _db.PhongVans.Include(p => p.DaiDienDoanhNghiep).ThenInclude(d => d.CongTy)
                     .FirstOrDefaultAsync(p => p.MaPV == maPV)
                 ?? throw new KeyNotFoundException($"Không tìm thấy buổi phỏng vấn {maPV}");
        var congTy = pv.DaiDienDoanhNghiep.CongTy;
        KiemTraPhamVi(phamViCongTy, congTy.MaCongTy);

        KetQuaPhongVanResult ThatBai(string lyDo) => new(pv.MaPV, pv.KetQua ?? "ChuaCoKetQua", null, false, 0, lyDo, ThanhCong: false);

        var dangKy = await TimDangKyAsync(pv.MaSinhVien, congTy.MaCongTy, gomCaTuChoi: true);
        var phanBoHienTai = dangKy == null
            ? null
            : await _db.PhanBoThucTaps.FirstOrDefaultAsync(p =>
                p.MaSinhVien == pv.MaSinhVien && p.MaDot == dangKy.MaDot && p.TrangThai != "Huy");

        // ---------------- Kiểm tra nghiệp vụ (chưa mở transaction)
        if (ketQua == "Dat")
        {
            if (congTy.TrangThai != "DaDuyet")
                return ThatBai("Doanh nghiệp chưa được Khoa phê duyệt nên chưa thể tiếp nhận sinh viên.");
            if (dangKy == null)
                return ThatBai("Sinh viên chưa đăng ký nguyện vọng vào doanh nghiệp này.");
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

        var useTx = _db.Database.IsRelational();
        await using var tx = useTx ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;

        if (ketQua == "Dat")
        {
            var maDot = dangKy!.MaDot;
            var phanBo = phanBoHienTai;
            if (phanBo == null)
            {
                // Kiểm tra lại trong transaction để không vượt chỉ tiêu khi 2 người duyệt cùng lúc
                if ((await GetChiTieuAsync(congTy, dangKy.DotThucTap)).DaDuChiTieu)
                {
                    if (tx != null) await tx.RollbackAsync();
                    return ThatBai("Doanh nghiệp vừa đủ chỉ tiêu — không thể tiếp nhận thêm.");
                }

                phanBo = new DAL.Entities.PhanBoThucTap
                {
                    MaPhanBo = IdGenerator.New("PB"),
                    MaSinhVien = pv.MaSinhVien,
                    MaCongTy = congTy.MaCongTy,
                    MaDot = maDot,
                    NgayPhanBo = DateTime.Today,
                    TrangThai = "ChuaNhanViec"
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
            dangKy.TrangThai = "DaDuyet";

            // SV đã có nơi tiếp nhận → các nguyện vọng khác đang chờ trong đợt bị từ chối
            var nguyenVongKhac = await _db.DangKyThucTaps
                .Where(d => d.MaSV == pv.MaSinhVien && d.MaDot == maDot && d.MaDK != dangKy.MaDK && d.TrangThai == "ChoDuyet")
                .ToListAsync();
            nguyenVongKhac.ForEach(d => d.TrangThai = "TuChoi");
            soTuChoi += nguyenVongKhac.Count;

            pv.KetQua = ketQua;
            await _db.SaveChangesAsync();

            // Đủ chỉ tiêu → tự đóng tuyển
            var sauKhiNhan = await GetChiTieuAsync(congTy, dangKy.DotThucTap);
            if (sauKhiNhan.DaDuChiTieu)
            {
                daDong = true;
                var dangCho = await _db.DangKyThucTaps
                    .Where(d => d.MaCongTy == congTy.MaCongTy && d.MaDot == maDot && d.TrangThai == "ChoDuyet")
                    .ToListAsync();
                dangCho.ForEach(d => d.TrangThai = "TuChoi");
                soTuChoi += dangCho.Count;
                message = $"Đã tiếp nhận sinh viên. Doanh nghiệp đã đủ chỉ tiêu ({sauKhiNhan.DaTiepNhan}/{sauKhiNhan.SoLuongNhan}) — hệ thống tự động đóng tuyển"
                          + (dangCho.Count > 0 ? $" và từ chối {dangCho.Count} hồ sơ đang chờ." : ".");
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
                var conGVHD = await _db.GVHuongDans.AnyAsync(g => g.MaSinhVien == pv.MaSinhVien && g.TrangThai == "DangHuongDan");
                message = "Đã cập nhật kết quả và hủy quyết định tiếp nhận của sinh viên."
                          + (dangThucTap ? " Sinh viên đang thực tập nên cần thông báo cho sinh viên và Khoa." : "")
                          + (conGVHD ? " Sinh viên vẫn còn GVHD, Khoa cần xem lại phân công." : "");
            }
            if (dangKy != null)
                dangKy.TrangThai = ketQua == "KhongDat" ? "TuChoi" : (dangKy.TrangThai == "DaDuyet" ? "DaDuyet" : "ChoDuyet");

            pv.KetQua = ketQua;
            await _db.SaveChangesAsync();
        }

        if (tx != null) await tx.CommitAsync();
        return new KetQuaPhongVanResult(pv.MaPV, pv.KetQua!, maPB, daDong, soTuChoi, message);
    }

    // ------------------------------------------------------------------ Thực tập sinh & đánh giá

    public async Task<object> GetThucTapSinhAsync(string maCongTy, string? phamViCongTy)
    {
        var congTy = await GetCongTyAsync(maCongTy, phamViCongTy);
        var phanBos = await _db.PhanBoThucTaps.AsNoTracking()
            .Include(p => p.SinhVien)
            .Include(p => p.HuongDanDoanhNghieps).ThenInclude(h => h.DaiDienDoanhNghiep)
            .Where(p => p.MaCongTy == maCongTy && p.TrangThai != "Huy")
            .OrderByDescending(p => p.NgayPhanBo)
            .ToListAsync();

        var maSVs = phanBos.Select(p => p.MaSinhVien).Distinct().ToList();
        var gvhds = await _db.GVHuongDans.AsNoTracking()
            .Include(g => g.GiangVien)
            .Where(g => maSVs.Contains(g.MaSinhVien) && g.TrangThai == "DangHuongDan")
            .ToListAsync();
        var phieus = await _db.PhieuChamDiems.AsNoTracking()
            .Include(p => p.ChiTietChamDiems).ThenInclude(c => c.TieuChi)
            .Where(p => maSVs.Contains(p.MaSV))
            .ToListAsync();
        var soTieuChiDN = await _db.TieuChis.CountAsync(t => t.NhomDanhGia == ThangDiem.NhomDoanhNghiep);

        return phanBos.Select(pb =>
        {
            var hd = pb.HuongDanDoanhNghieps.FirstOrDefault();
            var dd = hd?.DaiDienDoanhNghiep;
            var gv = gvhds.FirstOrDefault(g => g.MaSinhVien == pb.MaSinhVien)?.GiangVien;
            var phieu = phieus.FirstOrDefault(p => p.MaSV == pb.MaSinhVien && p.MaDot == pb.MaDot);
            var diemDN = phieu?.ChiTietChamDiems
                .Where(c => c.TieuChi?.NhomDanhGia == ThangDiem.NhomDoanhNghiep)
                .OrderBy(c => c.TieuChi!.ThuTu)
                .Select(c => new { c.MaTieuChi, c.DiemCham })
                .ToList() ?? new();
            var daDanhGia = soTieuChiDN > 0 && diemDN.Count == soTieuChiDN;

            return new
            {
                pb.MaPhanBo,
                pb.MaSinhVien,
                pb.MaCongTy,
                pb.MaDot,
                pb.NgayPhanBo,
                pb.TrangThai,
                HoTenSV = pb.SinhVien?.HoTen ?? pb.MaSinhVien,
                LopSV = pb.SinhVien?.Lop ?? "",
                GpaSV = pb.SinhVien?.Gpa,
                ChuyenNganhSV = pb.SinhVien?.ChuyenNganh ?? "",
                ViTriThucTap = congTy.ViTriTuyen ?? "",
                ThoiGianThucTap = congTy.ThoiGian ?? "",
                TenMentor = dd?.HoTen ?? "",
                ChucVuMentor = dd?.ChucVu ?? "",
                EmailMentor = dd?.Email ?? "",
                TenGVHD = gv?.HoTen ?? "",
                DanhGia = phieu?.NhanXetDN ?? hd?.DanhGia ?? "",
                DiemDN = daDanhGia ? diemDN.Sum(x => x.DiemCham) : (decimal?)null,
                ChiTietDiemDN = diemDN,
                DaDanhGia = daDanhGia
            };
        }).ToList();
    }

    public async Task<object> DanhGiaThucTapSinhAsync(DanhGiaThucTapSinhRequest request, string? maDaiDienActor, string? phamViCongTy)
    {
        if (string.IsNullOrWhiteSpace(request.MaPhanBo))
            throw new ArgumentException("Mã phân bổ thực tập không được để trống");

        var pb = await _db.PhanBoThucTaps
                     .Include(p => p.HuongDanDoanhNghieps)
                     .FirstOrDefaultAsync(p => p.MaPhanBo == request.MaPhanBo)
                 ?? throw new KeyNotFoundException($"Không tìm thấy phân bổ thực tập {request.MaPhanBo}");
        KiemTraPhamVi(phamViCongTy, pb.MaCongTy);
        if (pb.TrangThai == "Huy")
            throw new InvalidOperationException("Quyết định tiếp nhận đã bị hủy, không thể đánh giá.");

        var hd = pb.HuongDanDoanhNghieps.FirstOrDefault();
        var maDaiDien = maDaiDienActor ?? hd?.MaDaiDien
                        ?? await _db.DaiDienDoanhNghieps.Where(d => d.MaCongTy == pb.MaCongTy).OrderBy(d => d.MaSo).Select(d => d.MaSo).FirstOrDefaultAsync()
                        ?? throw new InvalidOperationException("Doanh nghiệp chưa có người đại diện để đánh giá.");

        var phieu = await _phieuChamDiem.LuuDiemDoanhNghiepAsync(
            pb.MaSinhVien, pb.MaDot, maDaiDien, request.ChiTiets, request.NhanXet, isStaff: phamViCongTy == null);

        if (hd == null)
        {
            hd = new HuongDanDoanhNghiep
            {
                MaSo = IdGenerator.New("HDN"),
                MaPhanBo = pb.MaPhanBo,
                MaDaiDien = maDaiDien,
                NgayBD = DateTime.Today,
                VaiTro = "Mentor hướng dẫn chuyên môn"
            };
            _db.HuongDanDoanhNghieps.Add(hd);
        }
        hd.DanhGia = request.NhanXet?.Trim();
        if (pb.TrangThai is "ChuaNhanViec" or "DangThucTap") pb.TrangThai = "HoanThanh";
        await _db.SaveChangesAsync();

        return new
        {
            message = "Ghi nhận Phiếu nhận xét của đơn vị thực tập thành công",
            maPhanBo = pb.MaPhanBo,
            danhGia = hd.DanhGia,
            diemDN = phieu.DiemDN,
            tongDiem = phieu.TongDiem,
            daDuDiem = phieu.DaDuDiem
        };
    }
}
