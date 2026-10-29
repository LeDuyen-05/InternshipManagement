using InternshipManagement.BLL.DTOs.Admin;
using System.Data;
using System.Security.Cryptography;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.Admin;

public class AdminService
{
    private readonly AppDbContext _db;
    private readonly TimeProvider _clock;
    private readonly InternshipManagement.BLL.Services.GVHuongDan.IGVHuongDanService _gv;
    private readonly InternshipManagement.BLL.Services.Auth.IPasswordService _passwords;
    private readonly InternshipManagement.BLL.Validators.SinhVien.SinhVienValidator _svValidator;

    public AdminService(
        AppDbContext db,
        InternshipManagement.BLL.Services.GVHuongDan.IGVHuongDanService gv,
        InternshipManagement.BLL.Services.Auth.IPasswordService passwords,
        InternshipManagement.BLL.Validators.SinhVien.SinhVienValidator svValidator, TimeProvider? clock = null)
    {
        _db = db;
        _clock = clock ?? TimeProvider.System;
        _gv = gv;
        _passwords = passwords;
        _svValidator = svValidator;
    }

    public async Task CreateAccountAsync(CreateAccountRequest r, bool callerIsAdmin = true, string? callerAccountId = null)
    {
        await using var tx = _db.Database.IsRelational() ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        if (string.IsNullOrWhiteSpace(r.MatKhau) || r.MatKhau.Length < 6) throw new ArgumentException("Mật khẩu tối thiểu 6 ký tự.");

        if (!callerIsAdmin && (r.MaVaiTro is "VT01" or "VT02"))
            throw new UnauthorizedAccessException("Bạn không có quyền tạo tài khoản Quản trị hoặc Khoa.");

        if (!await _db.VaiTros.AnyAsync(v => v.MaVaiTro == r.MaVaiTro))
            throw new InvalidOperationException("Vai trò không tồn tại.");

        if (r.MaVaiTro == "VT04")
        {
            if (string.IsNullOrWhiteSpace(r.MaSV) || !await _db.SinhViens.AnyAsync(s => s.MaSV == r.MaSV))
                throw new InvalidOperationException("Tài khoản sinh viên phải gắn với mã sinh viên hợp lệ.");
            if (await _db.TaiKhoans.AnyAsync(a => a.MaSV == r.MaSV))
                throw new InvalidOperationException("Sinh viên đã có tài khoản; kiểm tra/mở khóa hoặc đặt lại mật khẩu tài khoản hiện có.");
        }
        else if (r.MaVaiTro == "VT03")
        {
            if (string.IsNullOrWhiteSpace(r.MaGV) || !await _db.GiangViens.AnyAsync(g => g.MaGV == r.MaGV))
                throw new InvalidOperationException("Tài khoản giảng viên phải gắn với mã giảng viên hợp lệ.");
            if (await _db.TaiKhoans.AnyAsync(a => a.MaGV == r.MaGV))
                throw new InvalidOperationException("Giảng viên đã có tài khoản; kiểm tra/mở khóa hoặc đặt lại mật khẩu tài khoản hiện có.");
        }
        else if (r.MaVaiTro == "VT05")
        {
            if (string.IsNullOrWhiteSpace(r.MaDaiDien) || !await _db.DaiDienDoanhNghieps.AnyAsync(d => d.MaSo == r.MaDaiDien))
                throw new InvalidOperationException("Tài khoản đại diện doanh nghiệp phải gắn với mã đại diện hợp lệ.");
            if (!await _db.DaiDienDoanhNghieps.AnyAsync(d => d.MaSo == r.MaDaiDien && d.CongTy.TrangThai == "DaDuyet"))
                throw new InvalidOperationException("Doanh nghiệp của đại diện chưa được Khoa công nhận.");
            if (await _db.TaiKhoans.AnyAsync(a => a.MaDaiDien == r.MaDaiDien))
                throw new InvalidOperationException("Đại diện đã có tài khoản; kiểm tra/mở khóa hoặc đặt lại mật khẩu tài khoản hiện có.");
        }
        else if (r.MaVaiTro is "VT01" or "VT02")
        {
            if (r.MaSV != null || r.MaGV != null || r.MaDaiDien != null)
                throw new InvalidOperationException("Tài khoản Quản trị / Khoa không gắn với sinh viên, giảng viên hay doanh nghiệp.");
        }

        if (await _db.TaiKhoans.AnyAsync(x => x.MaTaiKhoan == r.MaTaiKhoan || x.TenDangNhap == r.TenDangNhap))
            throw new InvalidOperationException("Mã tài khoản hoặc tên đăng nhập đã tồn tại.");

        var accountStatus = r.TrangThai is "BiKhoa" or "ChuaKichHoat" ? r.TrangThai : "HoatDong";
        if (r.MaVaiTro == "VT05" && accountStatus == "HoatDong"
            && await DAL.Common.EnterpriseAccountPolicy.HasOtherActiveAccountAsync(_db, r.MaDaiDien))
            throw new InvalidOperationException("Doanh nghiệp đã có tài khoản đại diện hoạt động. QTV cần xác minh và khóa tài khoản dư trước khi cấp quyền cho người khác; giữ nguyên lịch sử.");
        _db.TaiKhoans.Add(new TaiKhoan
        {
            MaTaiKhoan = r.MaTaiKhoan,
            TenDangNhap = r.TenDangNhap,
            MatKhau = _passwords.Hash(r.MatKhau),
            TrangThai = accountStatus,
            MaVaiTro = r.MaVaiTro,
            MaSV = r.MaVaiTro == "VT04" ? r.MaSV : null,
            MaGV = r.MaVaiTro == "VT03" ? r.MaGV : null,
            MaDaiDien = r.MaVaiTro == "VT05" ? r.MaDaiDien : null
        });
        await _db.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
    }

    public async Task<List<AccountDto>> AccountsAsync()
    {
        var accounts = await _db.TaiKhoans
            .Include(x => x.VaiTro)
            .AsNoTracking()
            .OrderBy(x => x.TenDangNhap)
            .ToListAsync();

        var svMap = await _db.SinhViens.AsNoTracking().ToDictionaryAsync(x => x.MaSV, x => new { x.HoTen, DonVi = x.Lop });
        var gvMap = await _db.GiangViens.AsNoTracking().ToDictionaryAsync(x => x.MaGV, x => new { x.HoTen, DonVi = x.ChuyenMon });
        var ddMap = await _db.DaiDienDoanhNghieps.Include(x => x.CongTy).AsNoTracking()
            .ToDictionaryAsync(x => x.MaSo, x => new { x.HoTen, DonVi = x.CongTy != null ? x.CongTy.TenCongTy : null });

        return accounts.Select(x =>
        {
            string? ten = null;
            string? donVi = null;
            if (x.MaSV != null && svMap.TryGetValue(x.MaSV, out var sv))
            {
                ten = sv.HoTen;
                donVi = sv.DonVi;
            }
            else if (x.MaGV != null && gvMap.TryGetValue(x.MaGV, out var gv))
            {
                ten = gv.HoTen;
                donVi = gv.DonVi;
            }
            else if (x.MaDaiDien != null && ddMap.TryGetValue(x.MaDaiDien, out var dd))
            {
                ten = dd.HoTen;
                donVi = dd.DonVi;
            }

            return new AccountDto(
                x.MaTaiKhoan,
                x.TenDangNhap,
                x.TrangThai,
                x.MaVaiTro,
                x.VaiTro != null ? x.VaiTro.TenVaiTro : null,
                x.MaSV,
                x.MaGV,
                x.MaDaiDien,
                ten,
                donVi
            );
        }).ToList();
    }

    public async Task UpdateAccountAsync(string id, UpdateAccountRequest req, bool callerIsAdmin = true, string? callerAccountId = null)
    {
        await using var tx = _db.Database.IsRelational() ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var x = await _db.TaiKhoans.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy tài khoản.");
        if (req.TrangThai is not ("HoatDong" or "BiKhoa" or "ChuaKichHoat"))
            throw new InvalidOperationException("Trạng thái tài khoản không hợp lệ.");
        if (!await _db.VaiTros.AnyAsync(v => v.MaVaiTro == req.MaVaiTro))
            throw new InvalidOperationException("Vai trò không tồn tại.");

        if (string.Equals(id, callerAccountId, StringComparison.OrdinalIgnoreCase))
        {
            if (req.TrangThai != "HoatDong" || req.MaVaiTro != x.MaVaiTro)
                throw new InvalidOperationException("Không thể tự khóa hoặc tự đổi vai trò của chính mình.");
        }

        if (!callerIsAdmin && (x.MaVaiTro is "VT01" or "VT02" || req.MaVaiTro is "VT01" or "VT02"))
            throw new UnauthorizedAccessException("Bạn không có quyền quản lý tài khoản Quản trị hoặc Khoa.");

        if (req.MaVaiTro == "VT04")
        {
            if (string.IsNullOrWhiteSpace(req.MaSV) || !await _db.SinhViens.AnyAsync(s => s.MaSV == req.MaSV))
                throw new InvalidOperationException("Tài khoản sinh viên phải gắn với mã sinh viên hợp lệ.");
            if (await _db.TaiKhoans.AnyAsync(a => a.MaTaiKhoan != id && a.MaSV == req.MaSV))
                throw new InvalidOperationException("Sinh viên đã được gắn với tài khoản khác; quản lý tài khoản hiện có.");
        }
        else if (req.MaVaiTro == "VT03")
        {
            if (string.IsNullOrWhiteSpace(req.MaGV) || !await _db.GiangViens.AnyAsync(g => g.MaGV == req.MaGV))
                throw new InvalidOperationException("Tài khoản giảng viên phải gắn với mã giảng viên hợp lệ.");
            if (await _db.TaiKhoans.AnyAsync(a => a.MaTaiKhoan != id && a.MaGV == req.MaGV))
                throw new InvalidOperationException("Giảng viên đã được gắn với tài khoản khác; quản lý tài khoản hiện có.");
        }
        else if (req.MaVaiTro == "VT05")
        {
            if (string.IsNullOrWhiteSpace(req.MaDaiDien) || !await _db.DaiDienDoanhNghieps.AnyAsync(d => d.MaSo == req.MaDaiDien))
                throw new InvalidOperationException("Tài khoản đại diện doanh nghiệp phải gắn với mã đại diện hợp lệ.");
            if (await _db.TaiKhoans.AnyAsync(a => a.MaTaiKhoan != id && a.MaDaiDien == req.MaDaiDien))
                throw new InvalidOperationException("Đại diện đã được gắn với tài khoản khác; quản lý tài khoản hiện có.");
            if (x.MaDaiDien != req.MaDaiDien && !await _db.DaiDienDoanhNghieps.AnyAsync(d => d.MaSo == req.MaDaiDien && d.CongTy.TrangThai == "DaDuyet"))
                throw new InvalidOperationException("Doanh nghiệp của đại diện chưa được Khoa công nhận.");
        }
        else if (req.MaVaiTro is "VT01" or "VT02")
        {
            if (req.MaSV != null || req.MaGV != null || req.MaDaiDien != null)
                throw new InvalidOperationException("Tài khoản Quản trị / Khoa không gắn với sinh viên, giảng viên hay doanh nghiệp.");
        }

        if (req.MaVaiTro == "VT05" && req.TrangThai == "HoatDong"
            && await DAL.Common.EnterpriseAccountPolicy.HasOtherActiveAccountAsync(_db, req.MaDaiDien, id))
            throw new InvalidOperationException("Doanh nghiệp đã có tài khoản đại diện hoạt động. QTV cần xác minh và khóa tài khoản dư trước khi kích hoạt/mở khóa; giữ nguyên lịch sử.");

        var securityRelevantChange = x.TrangThai != req.TrangThai || x.MaVaiTro != req.MaVaiTro ||
            x.MaSV != (req.MaVaiTro == "VT04" ? req.MaSV : null) ||
            x.MaGV != (req.MaVaiTro == "VT03" ? req.MaGV : null) ||
            x.MaDaiDien != (req.MaVaiTro == "VT05" ? req.MaDaiDien : null);
        x.TrangThai = req.TrangThai;
        x.MaVaiTro = req.MaVaiTro;
        x.MaSV = req.MaVaiTro == "VT04" ? req.MaSV : null;
        x.MaGV = req.MaVaiTro == "VT03" ? req.MaGV : null;
        x.MaDaiDien = req.MaVaiTro == "VT05" ? req.MaDaiDien : null;
        if (securityRelevantChange) x.SecurityStamp = Guid.NewGuid().ToString("N");
        await _db.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
    }

    public async Task<string> ResetPasswordAsync(string id, ResetPasswordRequest? req, bool callerIsAdmin = true, string? callerAccountId = null)
    {
        var x = await _db.TaiKhoans.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy tài khoản.");

        if (!callerIsAdmin && (x.MaVaiTro is "VT01" or "VT02"))
            throw new UnauthorizedAccessException("Bạn không có quyền đặt lại mật khẩu cho tài khoản Quản trị hoặc Khoa.");

        var newPass = string.IsNullOrWhiteSpace(req?.MatKhauMoi)
            ? Convert.ToBase64String(RandomNumberGenerator.GetBytes(12)).Replace('+', 'A').Replace('/', 'B').TrimEnd('=')
            : req.MatKhauMoi;
        if (newPass.Length < 6)
            throw new ArgumentException("Mật khẩu tối thiểu 6 ký tự.");

        x.MatKhau = _passwords.Hash(newPass);
        x.SecurityStamp = Guid.NewGuid().ToString("N");
        await _db.SaveChangesAsync();

        return newPass;
    }

    public Task<List<InternshipManagement.DAL.Entities.SinhVien>> StudentsAsync()=> _db.SinhViens.AsNoTracking().OrderBy(x => x.MaSV).ToListAsync();
    public Task<List<GiangVien>> LecturersAsync() => _db.GiangViens.AsNoTracking().OrderBy(x => x.MaGV).ToListAsync();
    public Task<List<CongTy>> CompaniesAsync() => _db.CongTys.AsNoTracking().OrderBy(x => x.MaCongTy).ToListAsync();
    public Task<List<DotThucTap>> RoundsAsync() => _db.DotThucTaps.AsNoTracking().OrderByDescending(x => x.ThoiGianBD).ToListAsync();
    public Task<List<VaiTro>> RolesAsync() => _db.VaiTros.AsNoTracking().OrderBy(x => x.MaVaiTro).ToListAsync();
    public Task<List<TieuChi>> CriteriaAsync() => _db.TieuChis.AsNoTracking()
        .OrderBy(x => x.NhomDanhGia == null).ThenBy(x => x.ThuTu).ThenBy(x => x.MaTieuChi).ToListAsync();

    private static string ValidateNhom(string? nhom) => nhom?.Trim().ToUpperInvariant() switch
    {
        "GV" => "GV",
        "DN" => "DN",
        _ => throw new InvalidOperationException("Nhóm đánh giá chỉ nhận GV (giảng viên chấm) hoặc DN (đơn vị thực tập chấm).")
    };
    public Task<List<ThongBao>> NotificationsAsync(string? targetRole = null)
    {
        var q = _db.ThongBaos.AsNoTracking();
        var code = InternshipManagement.BLL.Common.NotificationAudience.Code(targetRole);
        if (code != "STAFF") q = code == "NONE" ? q.Where(x => false)
            : q.Where(x => x.DoiTuong == null || x.DoiTuong == "ALL" || x.DoiTuong == code);
        return q.OrderByDescending(x => x.Ghim == true).ThenByDescending(x => x.NgayTao).Take(50).ToListAsync();
    }

    public async Task SendNotificationAsync(SendNotificationRequest request, string? senderId)
    {
        if (string.IsNullOrWhiteSpace(request.TieuDe) || string.IsNullOrWhiteSpace(request.NoiDung)) throw new InvalidOperationException("Tiêu đề và nội dung thông báo không được để trống.");
        if (request.TieuDe.Trim().Length > 200) throw new InvalidOperationException("Tiêu đề không được vượt quá 200 ký tự.");
        var doiTuong = string.IsNullOrWhiteSpace(request.DoiTuong) ? "ALL" : request.DoiTuong.Trim();
        var loaiThongBao = string.IsNullOrWhiteSpace(request.LoaiThongBao) ? "Chung" : request.LoaiThongBao.Trim();
        var tepDinhKem = string.IsNullOrWhiteSpace(request.TepDinhKem) ? null : request.TepDinhKem.Trim();

        _db.ThongBaos.Add(new ThongBao
        {
            MaThongBao = $"TB{Guid.NewGuid():N}"[..20],
            TieuDe = request.TieuDe.Trim(),
            NoiDung = request.NoiDung.Trim(),
            NgayTao = DateTime.Now,
            MaNguoiGui = senderId,
            DoiTuong = doiTuong,
            LoaiThongBao = loaiThongBao,
            TepDinhKem = tepDinhKem,
            Ghim = request.Ghim
        });
        await _db.SaveChangesAsync();
    }

    public async Task UpdateRoundAsync(string id, UpdateRoundRequest request)
    {
        if (request.ThoiGianKT < request.ThoiGianBD) throw new InvalidOperationException("Thời gian kết thúc phải sau thời gian bắt đầu.");
        if (request.TrangThai is not ("ChuaBatDau" or "DangDienRa" or "DaKetThuc")) throw new InvalidOperationException("Trạng thái đợt thực tập không hợp lệ.");
        var round = await _db.DotThucTaps.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy đợt thực tập.");
        if (round.PhienBanThoiHan > 0 && (round.ThoiGianBD.Date != request.ThoiGianBD.Date || round.ThoiGianKT.Date != request.ThoiGianKT.Date))
            throw new InvalidOperationException("Đợt đã cấu hình thời hạn chấm. Chưa hỗ trợ đổi ngày thực tập vì sẽ làm lệch cửa sổ chấm; liên hệ Khoa xử lý riêng.");
        round.TenDot = request.TenDot; round.NamHoc = request.NamHoc; round.ThoiGianBD = request.ThoiGianBD; round.ThoiGianKT = request.ThoiGianKT; round.TrangThai = request.TrangThai;
        await _db.SaveChangesAsync();
    }

    public async Task CreateCriteriaAsync(SaveCriteriaRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.MaTieuChi) || request.MaTieuChi.Length > 20 || string.IsNullOrWhiteSpace(request.TenTieuChi) || request.TenTieuChi.Length > 200
            || string.IsNullOrWhiteSpace(request.MaRubric) || request.MaRubric.Length > 40 || (request.MaCLO?.Length ?? 0) > 20)
            throw new InvalidOperationException("Mã tiêu chí, tên tiêu chí, mã CLO và bộ rubric không hợp lệ.");
        if (double.IsNaN(request.DiemToiDa) || double.IsInfinity(request.DiemToiDa) || request.DiemToiDa > 10 || Math.Round(request.DiemToiDa, 2) != request.DiemToiDa)
            throw new InvalidOperationException("Điểm tối đa phải không vượt quá 10 và có tối đa hai chữ số thập phân.");
        if (request.DiemToiDa <= 0) throw new InvalidOperationException("Điểm tối đa phải lớn hơn 0.");
        var nhom = ValidateNhom(request.NhomDanhGia);
        if ((await _db.TieuChis.Where(x => x.NhomDanhGia != null && x.MaRubric == request.MaRubric).SumAsync(x => (decimal?)x.DiemToiDa) ?? 0) + (decimal)request.DiemToiDa > 10) throw new InvalidOperationException("Tổng điểm tối đa của các tiêu chí không được vượt quá 10.");
        if (await _db.TieuChis.AnyAsync(x => x.MaTieuChi == request.MaTieuChi)) throw new InvalidOperationException("Mã tiêu chí đã tồn tại.");
        _db.TieuChis.Add(new TieuChi { MaTieuChi = request.MaTieuChi, TenTieuChi = request.TenTieuChi, DiemToiDa = (decimal)request.DiemToiDa, NhomDanhGia = nhom, ThuTu = request.ThuTu, MaCLO = string.IsNullOrWhiteSpace(request.MaCLO) ? request.MaTieuChi : request.MaCLO.Trim(), MaRubric = request.MaRubric });
        await _db.SaveChangesAsync();
    }

    public async Task UpdateCriteriaAsync(string id, SaveCriteriaRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.MaTieuChi) || request.MaTieuChi.Length > 20 || string.IsNullOrWhiteSpace(request.TenTieuChi) || request.TenTieuChi.Length > 200
            || string.IsNullOrWhiteSpace(request.MaRubric) || request.MaRubric.Length > 40 || (request.MaCLO?.Length ?? 0) > 20)
            throw new InvalidOperationException("Mã tiêu chí, tên tiêu chí, mã CLO và bộ rubric không hợp lệ.");
        if (double.IsNaN(request.DiemToiDa) || double.IsInfinity(request.DiemToiDa) || request.DiemToiDa > 10 || Math.Round(request.DiemToiDa, 2) != request.DiemToiDa)
            throw new InvalidOperationException("Điểm tối đa phải không vượt quá 10 và có tối đa hai chữ số thập phân.");
        if (request.DiemToiDa <= 0) throw new InvalidOperationException("Điểm tối đa phải lớn hơn 0.");
        var nhom = ValidateNhom(request.NhomDanhGia);
        if ((await _db.TieuChis.Where(x => x.MaTieuChi != id && x.NhomDanhGia != null && x.MaRubric == request.MaRubric).SumAsync(x => (decimal?)x.DiemToiDa) ?? 0) + (decimal)request.DiemToiDa > 10) throw new InvalidOperationException("Tổng điểm tối đa của các tiêu chí không được vượt quá 10.");
        var item = await _db.TieuChis.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy tiêu chí.");
        if ((item.DiemToiDa != (decimal)request.DiemToiDa || item.NhomDanhGia != nhom || item.MaRubric != request.MaRubric || item.MaCLO != (string.IsNullOrWhiteSpace(request.MaCLO) ? item.MaTieuChi : request.MaCLO.Trim()))
            && await _db.ChiTietChamDiems.AnyAsync(x => x.MaTieuChi == id))
            throw new InvalidOperationException("Tiêu chí đã có điểm: chỉ được sửa mô tả và thứ tự để bảo toàn lịch sử.");
        item.TenTieuChi = request.TenTieuChi; item.DiemToiDa = (decimal)request.DiemToiDa; item.NhomDanhGia = nhom; item.ThuTu = request.ThuTu; item.MaCLO = string.IsNullOrWhiteSpace(request.MaCLO) ? item.MaTieuChi : request.MaCLO.Trim(); item.MaRubric = request.MaRubric;
        await _db.SaveChangesAsync();
    }

    public async Task DeleteCriteriaAsync(string id)
    {
        var item = await _db.TieuChis.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy tiêu chí.");
        if (await _db.ChiTietChamDiems.AnyAsync(x => x.MaTieuChi == id)) throw new InvalidOperationException("Tiêu chí đã được dùng để chấm điểm nên không thể xóa.");
        _db.TieuChis.Remove(item); await _db.SaveChangesAsync();
    }

    public async Task SaveAssessmentAsync(string id, SaveAssessmentRequest request)
    {
        var assessment = await _db.PhieuChamDiems.FirstOrDefaultAsync(x => x.MaPhieu == id) ?? throw new KeyNotFoundException("Không tìm thấy phiếu chấm.");
        var round = await _db.DotThucTaps.FirstOrDefaultAsync(x => x.MaSo == assessment.MaDot) ?? throw new InvalidOperationException("Không tìm thấy đợt.");
        var block = Common.InternshipDeadlinePolicy.GradeBlock(round, false, _clock.GetUtcNow());
        if (block != null) throw new InvalidOperationException(block);
        if (request.ChiTiet.Count == 0) throw new InvalidOperationException("Chưa nhập điểm GV.");
        var criteria = await _db.TieuChis.AsNoTracking().Where(x => x.NhomDanhGia != null).ToDictionaryAsync(x => x.MaTieuChi);
        if (request.ChiTiet.Select(x => x.MaTieuChi).Distinct().Count() != request.ChiTiet.Count) throw new InvalidOperationException("Phiếu có tiêu chí bị lặp.");
        foreach (var score in request.ChiTiet)
        {
            if (!criteria.TryGetValue(score.MaTieuChi, out var criterion)) throw new InvalidOperationException($"Không tìm thấy tiêu chí {score.MaTieuChi}.");
            if (criterion.NhomDanhGia == "DN") throw new UnauthorizedAccessException("Điểm doanh nghiệp chỉ do doanh nghiệp cập nhật.");
            if (criterion.MaRubric != (await _db.DotThucTaps.Where(d => d.MaSo == assessment.MaDot).Select(d => d.MaRubric).FirstOrDefaultAsync() ?? "LEGACY_4TC"))
                throw new InvalidOperationException("Tiêu chí không thuộc bộ rubric của đợt thực tập.");
            if (score.DiemCham < 0 || (decimal)score.DiemCham > criterion.DiemToiDa) throw new InvalidOperationException($"Điểm {criterion.TenTieuChi} phải nằm trong khoảng 0–{criterion.DiemToiDa}.");
            if (decimal.Round((decimal)score.DiemCham, 2) != (decimal)score.DiemCham) throw new InvalidOperationException("Điểm chỉ được có tối đa hai chữ số thập phân.");
        }
        if (request.ChiTiet.Sum(x => x.DiemCham) > 10) throw new InvalidOperationException("Tổng điểm phiếu chấm không được vượt quá 10.");
        var existing = await _db.ChiTietChamDiems.Where(x => x.MaPhieu == id).ToListAsync();
        foreach (var score in request.ChiTiet)
        {
            var detail = existing.FirstOrDefault(x => x.MaTieuChi == score.MaTieuChi);
            if (detail == null) _db.ChiTietChamDiems.Add(new ChiTietChamDiem { MaSo = InternshipManagement.DAL.Common.IdGenerator.New("CT"), MaPhieu = id, MaTieuChi = score.MaTieuChi, DiemCham = (decimal)score.DiemCham });
            else detail.DiemCham = (decimal)score.DiemCham;
        }
        await _db.SaveChangesAsync();
        assessment.TongDiem = await _db.ChiTietChamDiems.Where(x => x.MaPhieu == id && x.TieuChi.NhomDanhGia != null).SumAsync(x => (decimal?)x.DiemCham) ?? 0;
        assessment.NgayCham = DateTime.Today;
        await _db.SaveChangesAsync();
    }

    public async Task<object> CloAnalyticsAsync(string? maDot)
    {
        var query = _db.PhieuChamDiems.AsNoTracking().Include(x => x.ChiTietChamDiems).Include(x => x.SinhVien).Include(x => x.DotThucTap).AsQueryable();
        if (!string.IsNullOrWhiteSpace(maDot)) query = query.Where(x => x.MaDot == maDot);
        var assessments = await query.ToListAsync();
        var rounds = await _db.DotThucTaps.AsNoTracking().Where(x => maDot == null || maDot == "" || x.MaSo == maDot).ToListAsync();
        var rubrics = rounds.Select(x => x.MaRubric).Distinct().ToList();
        var criteria = await _db.TieuChis.AsNoTracking().Where(x => x.NhomDanhGia != null && rubrics.Contains(x.MaRubric)).OrderBy(x => x.ThuTu).ToListAsync();
        var results = assessments.ToDictionary(x => x.MaPhieu, x => Common.CloResult.Evaluate(criteria.Where(c => c.MaRubric == x.DotThucTap?.MaRubric), x.ChiTietChamDiems));
        var completedIds = results.Where(x => x.Value.Complete).Select(x => x.Key).ToHashSet();
        var details = assessments.Where(x => completedIds.Contains(x.MaPhieu)).SelectMany(x => x.ChiTietChamDiems).ToList();
        var byCriteria = criteria.Select(c => new { c.MaTieuChi, c.MaCLO, c.MaRubric, c.TenTieuChi, c.DiemToiDa, c.NhomDanhGia,
            submissions = details.Count(x => x.MaTieuChi == c.MaTieuChi), average = (double)(details.Where(x => x.MaTieuChi == c.MaTieuChi).Select(x => (decimal?)x.DiemCham).Average() ?? 0) }).ToList();
        var rows = assessments.Select(x => {
            var result = results[x.MaPhieu];
            return new { x.MaPhieu, MaSinhVien = x.MaSV, sinhVien = x.SinhVien?.HoTen ?? x.MaSV, lop = x.SinhVien?.Lop ?? "",
                x.MaDot, dot = x.DotThucTap?.TenDot ?? x.MaDot, tongDiem = result.Total, diemTamTinh = result.Partial,
                daDuDiem = result.Complete, daChamGV = result.LecturerComplete, daChamDN = result.EnterpriseComplete,
                ketQua = result.Outcome, xepLoai = result.Classification, x.NgayCham,
                tieuChis = criteria.Where(c => c.MaRubric == x.DotThucTap?.MaRubric).Select(c => new { c.MaTieuChi, c.MaCLO, c.NhomDanhGia, c.DiemToiDa, c.TenTieuChi }),
                chiTiet = x.ChiTietChamDiems.Select(d => new { maTieuChi = d.MaTieuChi, diemCham = d.DiemCham }) };
        }).OrderByDescending(x => x.tongDiem).ToList();
        var scored = results.Values.Where(x => x.Complete).Select(x => x.Total!.Value).ToList();
        var letters = new[] { "A", "B+", "B", "C+", "C", "D+", "D", "F" };
        return new { criteria = byCriteria, assessments = rows, total = assessments.Count,
            averageScore = scored.Count == 0 ? 0 : Math.Round(scored.Average(), 2), complete = scored.Count,
            pending = assessments.Count - scored.Count, inProgress = results.Values.Count(x => !x.Complete && x.Status == "Chưa đủ điểm"),
            scoreDistribution = letters.Select(letter => new { label = letter, count = scored.Count(x => Common.ThangDiem.QuyDoi(x).DiemChu == letter) }) };
    }

    public async Task<object> KhoaOverviewAsync(string? maDot = null)
    {
        var rounds = await _db.DotThucTaps.AsNoTracking().OrderByDescending(x => x.ThoiGianBD).Select(x => new { x.MaSo, x.TenDot, x.NamHoc, x.TrangThai }).ToListAsync();
        var activeRound = string.IsNullOrWhiteSpace(maDot)
            ? rounds.FirstOrDefault(x => x.TrangThai == "DangDienRa") ?? rounds.FirstOrDefault()
            : rounds.FirstOrDefault(x => x.MaSo == maDot)
                ?? throw new KeyNotFoundException("Không tìm thấy đợt thực tập được chọn.");
        var roundId = activeRound?.MaSo;
        var students = await _db.SinhViens.CountAsync();
        var registrations = roundId == null ? 0 : await _db.DangKyThucTaps.CountAsync(x => x.MaDot == roundId && x.TrangThai == "DaDuyet");
        var pending = roundId == null ? 0 : await _db.DangKyThucTaps.CountAsync(x => x.MaDot == roundId && x.TrangThai == "ChoDuyet");
        var allocatedIds = _db.PhanBoThucTaps.AsNoTracking()
            .Where(x => x.MaDot == roundId && x.TrangThai != "Huy" && x.DaDuocKhoaDuyet).Select(x => x.MaSinhVien).Distinct();
        var allocatedStudents = roundId == null ? 0 : await allocatedIds.CountAsync();
        var assignedStudents = roundId == null ? 0 : await _db.GVHuongDans.AsNoTracking()
            .Where(x => x.MaDot == roundId && x.TrangThai == "DangHuongDan" && allocatedIds.Contains(x.MaSinhVien))
            .Select(x => x.MaSinhVien).Distinct().CountAsync();
        var assigned = assignedStudents;
        var reportsPending = roundId == null ? 0 : await _db.TienDoThucTaps.CountAsync(x => x.MaDot == roundId && x.MaPhanBoLuuTru == null && x.TrangThaiDuyet == "DaNop");
        var companiesPending = await _db.CongTys.CountAsync(x => x.TrangThai == "ChoDuyet");
        var companiesApproved = await _db.CongTys.CountAsync(x => x.TrangThai == "DaDuyet");
        var pendingSelfArranged = roundId == null ? 0 : await _db.DeXuatThucTapTuTims.CountAsync(x => x.MaDot == roundId && x.TrangThai == "ChoDuyet");
        var roster = roundId == null ? null : await new SinhVienTheoDot.SinhVienTheoDotService(_db, _clock).GetAsync(roundId);
        return new { activeRound, totalStudents = students, participatingStudents = roster?.TongSinhVien ?? 0,
            internshipGroups = roster?.ThongKe, allocatedStudents, approvedCompanies = companiesApproved, approvedRegistrations = registrations, pendingRegistrations = pending, pendingSelfArranged, assignedSupervisors = assigned, unassignedSupervisors = Math.Max(0, allocatedStudents - assignedStudents), pendingReports = reportsPending, pendingCompanies = companiesPending, rounds };
    }

    public async Task<object> RegistrationsAsync(string? maDot)
    {
        var q = from r in _db.DangKyThucTaps.AsNoTracking()
                join s in _db.SinhViens.AsNoTracking() on r.MaSV equals s.MaSV
                join c in _db.CongTys.AsNoTracking() on r.MaCongTy equals c.MaCongTy
                join d in _db.DotThucTaps.AsNoTracking() on r.MaDot equals d.MaSo
                select new { maDangKy = r.MaDK, maSinhVien = r.MaSV, sinhVien = s.HoTen, s.Lop, r.MaCongTy, congTy = c.TenCongTy, ViTriTuyen = r.ViTriDangKy ?? c.ViTriTuyen, r.MaDot, dot = d.TenDot, r.NgayDangKy, r.ThuTuUuTien, r.TrangThai };
        if (!string.IsNullOrWhiteSpace(maDot)) q = q.Where(x => x.MaDot == maDot);
        return await q.OrderBy(x => x.TrangThai).ThenBy(x => x.NgayDangKy).ToListAsync();
    }

    public async Task ApproveRegistrationAsync(string id, RegistrationApprovalRequest request)
    {
        if (request.TrangThai is not ("DaDuyet" or "TuChoi" or "ChoDuyet")) throw new InvalidOperationException("Trạng thái đăng ký không hợp lệ.");
        var registration = await _db.DangKyThucTaps.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy nguyện vọng.");
        if (registration.TrangThai == "TuChoi" && request.TrangThai != "TuChoi")
            throw new InvalidOperationException("Nguyện vọng đã kết thúc; không mở lại để thay đổi lịch sử lượt đăng ký.");
        if (request.TrangThai != registration.TrangThai && await _db.PhanBoThucTaps.AnyAsync(p => p.MaSinhVien == registration.MaSV && p.MaDot == registration.MaDot && p.TrangThai != "Huy"))
            throw new InvalidOperationException("Sinh viên đã có nơi tiếp nhận; xử lý ở luồng nơi thực tập.");
        if (request.TrangThai == "TuChoi" && await _db.PhongVans.AnyAsync(p => p.MaSinhVien == registration.MaSV && (p.MaDK == registration.MaDK || (p.MaDK == null && p.DaiDienDoanhNghiep.MaCongTy == registration.MaCongTy)) && p.KetQua == "ChuaCoKetQua"))
            throw new InvalidOperationException("Có lịch PV chờ kết quả; dùng tab Kết quả/bỏ PV để ghi rõ kết quả và nguồn.");
        if (request.TrangThai == "DaDuyet")
        {
            var company = await _db.CongTys.FindAsync(registration.MaCongTy);
            if (company?.TrangThai != "DaDuyet") throw new InvalidOperationException("Chỉ có thể duyệt nguyện vọng vào doanh nghiệp đã được duyệt.");

            var hasOtherApproved = await _db.DangKyThucTaps.AnyAsync(r =>
                r.MaSV == registration.MaSV &&
                r.MaDot == registration.MaDot &&
                r.MaDK != registration.MaDK &&
                r.TrangThai == "DaDuyet");
            if (hasOtherApproved)
                throw new InvalidOperationException("Sinh viên đã có một nguyện vọng khác được phê duyệt trong đợt này.");

            if (company != null && company.SoLuongNhan > 0)
            {
                var approvedCount = await _db.DangKyThucTaps.CountAsync(r =>
                    r.MaCongTy == registration.MaCongTy &&
                    r.MaDot == registration.MaDot &&
                    r.MaDK != registration.MaDK &&
                    r.TrangThai == "DaDuyet");
                if (approvedCount >= company.SoLuongNhan)
                    throw new InvalidOperationException($"Doanh nghiệp '{company.TenCongTy}' đã đủ chỉ tiêu tiếp nhận ({company.SoLuongNhan} sinh viên) trong đợt này.");
            }
        }
        registration.TrangThai = request.TrangThai;
        if (request.TrangThai == "TuChoi") registration.LyDoKetThuc = "Khoa từ chối hồ sơ đăng ký trước phỏng vấn; không tự suy ra rớt PV.";
        await _db.SaveChangesAsync();
    }

    public async Task<object> AssignmentsAsync(string? maDot)
    {
        if (string.IsNullOrWhiteSpace(maDot)) throw new ArgumentException("Vui lòng chọn đợt thực tập.");
        var query = from pb in _db.PhanBoThucTaps.AsNoTracking().Where(p => p.MaDot == maDot && p.TrangThai != "Huy" && p.DaDuocKhoaDuyet)
                    join s in _db.SinhViens.AsNoTracking() on pb.MaSinhVien equals s.MaSV
                    join a in _db.GVHuongDans.AsNoTracking().Where(x => x.MaDot == maDot && x.TrangThai == "DangHuongDan") on s.MaSV equals a.MaSinhVien into assignments
                    from a in assignments.DefaultIfEmpty()
                    join g in _db.GiangViens.AsNoTracking() on a!.MaGiangVien equals g.MaGV into matchedLecturers
                    from g in matchedLecturers.DefaultIfEmpty()
                    join c in _db.CongTys.AsNoTracking() on pb.MaCongTy equals c.MaCongTy into companies
                    from c in companies.DefaultIfEmpty()
                    select new { s.MaSV, s.HoTen, s.Lop, s.ChuyenNganh, maGiangVien = g == null ? null : g.MaGV, giangVien = g == null ? null : g.HoTen, maDot = pb.MaDot, congTy = c == null ? null : c.TenCongTy };
        var rows = await query.OrderBy(x => x.HoTen).ToListAsync();
        var lecturers = await _db.GiangViens.AsNoTracking().Select(g => new { g.MaGV, g.HoTen, g.ChuyenMon, chiTieu = g.ChiTieuHD, assignedCount = _db.GVHuongDans.Count(a => a.MaGiangVien == g.MaGV && a.TrangThai == "DangHuongDan" && (a.MaDot == maDot || a.MaDot == null)) }).OrderBy(g => g.HoTen).ToListAsync();
        return new { students = rows, lecturers, assigned = rows.Count(x => x.maGiangVien != null), unassigned = rows.Count(x => x.maGiangVien == null) };
    }

    public async Task AssignSupervisorAsync(string maSV, SupervisorAssignmentRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.MaDot)) throw new ArgumentException("Vui lòng chọn đợt thực tập.");
        var current = await _db.GVHuongDans.AsNoTracking()
            .FirstOrDefaultAsync(x => x.MaSinhVien == maSV && x.MaDot == r.MaDot && x.TrangThai == "DangHuongDan");
        if (current is null)
            await _gv.PhanCongDonLeAsync(new InternshipManagement.BLL.DTOs.GVHuongDan.PhanCongDonLeRequest { MaGV = r.MaGiangVien, MaSV = maSV, MaDot = r.MaDot });
        else if (current.MaGiangVien != r.MaGiangVien)
            await _gv.DoiGiangVienAsync(new InternshipManagement.BLL.DTOs.GVHuongDan.DoiGiangVienRequest { MaSo = current.MaSo, MaGVMoi = r.MaGiangVien, MaDot = r.MaDot });
    }

    public async Task<object> ProgressAsync(string? maDot)
    {
        var query = from p in _db.TienDoThucTaps.AsNoTracking()
                    join s in _db.SinhViens.AsNoTracking() on p.MaSV equals s.MaSV
                    join d in _db.DotThucTaps.AsNoTracking() on p.MaDot equals d.MaSo
                    select new { p.MaTienDo, maSinhVien = p.MaSV, sinhVien = s.HoTen, s.Lop, p.MaDot, dot = d.TenDot, p.MocThoiGian, p.NoiDungBaoCao, p.NgayNop, p.TrangThaiDuyet, p.MaPhanBoLuuTru };
        if (!string.IsNullOrWhiteSpace(maDot)) query = query.Where(x => x.MaDot == maDot);
        var reports = await query.OrderBy(x => x.MocThoiGian).ThenBy(x => x.sinhVien).ToListAsync();
        var current = reports.Where(x => x.MaPhanBoLuuTru == null).ToList();
        return new { reports, total = current.Count, archived = reports.Count - current.Count, submitted = current.Count(x => x.TrangThaiDuyet != "ChuaNop"), approved = current.Count(x => x.TrangThaiDuyet == "DaDuyet"), pending = current.Count(x => x.TrangThaiDuyet == "DaNop"), revision = current.Count(x => x.TrangThaiDuyet == "YeuCauSua"), missing = current.Count(x => x.TrangThaiDuyet == "ChuaNop") };
    }

    public async Task<object> DeadlinesAsync(string? maDot)
    {
        var today = _clock.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).Date;
        var q = _db.TienDoThucTaps.AsNoTracking().Where(x => x.MaPhanBoLuuTru == null);
        if (!string.IsNullOrWhiteSpace(maDot)) q = q.Where(x => x.MaDot == maDot);
        return await q.GroupBy(x => new { x.MaDot, x.MocThoiGian })
            .Select(g => new { g.Key.MaDot, g.Key.MocThoiGian, reportCount = g.Count(), submitted = g.Count(x => x.TrangThaiDuyet != "ChuaNop"), approved = g.Count(x => x.TrangThaiDuyet == "DaDuyet"), overdue = g.Count(x => x.TrangThaiDuyet == "ChuaNop" && x.MocThoiGian < today), late = g.Count(x => x.NopTre == true) })
            .OrderBy(x => x.MocThoiGian).ToListAsync();
    }

    public async Task UpdateDeadlineAsync(string maDot, DeadlineUpdateRequest request, string? actor = null)
    {
        var oldDate = request.HanCu.Date;
        var newDate = request.HanMoi.Date;
        if (oldDate < _clock.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).Date)
            throw new InvalidOperationException("Mốc đã quá hạn. Khoa chỉ mở bổ sung cho từng sinh viên sau khi tiếp nhận trực tiếp lý do; không gia hạn đồng loạt mốc quá hạn.");
        if (string.IsNullOrWhiteSpace(actor)) throw new UnauthorizedAccessException("Thiếu tài khoản Khoa thực hiện.");
        if (string.IsNullOrWhiteSpace(request.LyDo) || request.LyDo.Trim().Length > 1000) throw new ArgumentException("Cần nhập lý do thay đổi hạn, tối đa 1000 ký tự.");
        if (newDate < _clock.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).Date) throw new InvalidOperationException("Hạn báo cáo mới không thể là ngày đã qua.");
        await using var tx = _db.Database.IsRelational() ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var reports = await _db.TienDoThucTaps.Where(x => x.MaDot == maDot && x.MocThoiGian == oldDate && x.MaPhanBoLuuTru == null).ToListAsync();
        if (reports.Count == 0) throw new KeyNotFoundException("Không tìm thấy mốc báo cáo.");
        foreach (var report in reports) report.MocThoiGian = newDate;
        _db.NhatKyThoiHans.Add(new NhatKyThoiHan {
            MaNhatKy = DAL.Common.IdGenerator.New("TH"), MaDot = maDot, Loai = "TienDo",
            Truoc = oldDate.ToString("yyyy-MM-dd"), Sau = newDate.ToString("yyyy-MM-dd"),
            LyDo = request.LyDo.Trim(), NguoiThucHien = actor, ThoiDiem = _clock.GetUtcNow()
        });
        await _db.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
    }

    public async Task ApproveProgressAsync(string id, ReportApprovalRequest request)
    {
        if (request.TrangThai is not ("DaDuyet" or "YeuCauSua"))
            throw new InvalidOperationException("Chỉ được duyệt báo cáo hoặc yêu cầu sinh viên sửa báo cáo.");
        var report = await _db.TienDoThucTaps.FindAsync(id)
            ?? throw new KeyNotFoundException("Không tìm thấy báo cáo tiến độ.");
        if (report.MaPhanBoLuuTru != null)
            throw new InvalidOperationException("Báo cáo đã lưu trữ khi đổi nơi thực tập; chỉ xem lịch sử, không duyệt hoặc sửa nhận xét.");
        if (report.TrangThaiDuyet != "DaNop")
            throw new InvalidOperationException("Chỉ có thể duyệt hoặc yêu cầu sửa báo cáo khi ở trạng thái Đã nộp.");

        report.TrangThaiDuyet = request.TrangThai;
        if (!string.IsNullOrWhiteSpace(request.NhanXet))
        {
            report.NhanXet = request.NhanXet;
            report.NhanXetGV = request.NhanXet;
        }
        await _db.SaveChangesAsync();
    }

    public async Task<int> GenerateReportSlotsAsync(GenerateReportSlotsRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.MaDot))
            throw new ArgumentException("Mã đợt thực tập không được để trống.");

        var round = await _db.DotThucTaps.FindAsync(request.MaDot)
            ?? throw new KeyNotFoundException($"Không tìm thấy đợt thực tập {request.MaDot}.");

        var startDate = request.NgayBatDau ?? round.ThoiGianBD;
        var weeks = request.SoTuan > 0 ? request.SoTuan : 10;

        var assignedStudents = await _db.PhanBoThucTaps
            .AsNoTracking()
            .Where(p => p.MaDot == request.MaDot && p.TrangThai != "Huy" && p.DaDuocKhoaDuyet)
            .Select(p => p.MaSinhVien)
            .ToListAsync();

        var studentIds = assignedStudents.Distinct().ToList();
        if (studentIds.Count == 0) return 0;

        var existingSlots = await _db.TienDoThucTaps
            .AsNoTracking()
            .Where(t => t.MaDot == request.MaDot)
            .Select(t => new { t.MaSV, t.MocThoiGian })
            .ToListAsync();

        var existingSet = new HashSet<(string MaSV, DateTime Moc)>(
            existingSlots.Select(x => (x.MaSV, x.MocThoiGian.Date))
        );

        int createdCount = 0;
        foreach (var svId in studentIds)
        {
            for (int k = 1; k <= weeks; k++)
            {
                var moc = startDate.Date.AddDays(7 * k);
                if (existingSet.Contains((svId, moc.Date)))
                    continue;

                _db.TienDoThucTaps.Add(new InternshipManagement.DAL.Entities.TienDoThucTap
                {
                    MaTienDo = DAL.Common.IdGenerator.New("TD"),
                    MaDot = request.MaDot,
                    MaSV = svId,
                    MocThoiGian = moc,
                    TrangThaiDuyet = "ChuaNop"
                });
                existingSet.Add((svId, moc.Date));
                createdCount++;
            }
        }

        if (createdCount > 0)
        {
            await _db.SaveChangesAsync();
        }
        return createdCount;
    }

    public async Task CreateStudentAsync(CreateStudentRequest r)
    {
        var gpa = r.Gpa.HasValue ? (decimal?)r.Gpa.Value : null;
        var errors = _svValidator.Validate(r.MaSV, r.HoTen, gpa, r.Lop, r.KhoaHoc, r.CongNghe, r.KyNang, r.DuAnDaThucHien);
        if (errors.Count > 0) throw new ArgumentException(string.Join(" ", errors));

        if (await _db.SinhViens.AnyAsync(s => s.MaSV == r.MaSV))
            throw new InvalidOperationException($"Sinh viên với mã {r.MaSV} đã tồn tại.");

        _db.SinhViens.Add(new InternshipManagement.DAL.Entities.SinhVien
        {
            MaSV = r.MaSV.Trim(),
            HoTen = r.HoTen.Trim(),
            Lop = string.IsNullOrWhiteSpace(r.Lop) ? null : r.Lop.Trim(),
            KhoaHoc = string.IsNullOrWhiteSpace(r.KhoaHoc) ? null : r.KhoaHoc.Trim(),
            Gpa = gpa,
            KyNang = string.IsNullOrWhiteSpace(r.KyNang) ? null : r.KyNang.Trim(),
            ChuyenNganh = string.IsNullOrWhiteSpace(r.ChuyenNganh) ? null : r.ChuyenNganh.Trim(),
            CongNghe = string.IsNullOrWhiteSpace(r.CongNghe) ? null : r.CongNghe.Trim(),
            DuAnDaThucHien = string.IsNullOrWhiteSpace(r.DuAnDaThucHien) ? null : r.DuAnDaThucHien.Trim()
        });
        await _db.SaveChangesAsync();
    }

    public async Task UpdateStudentAsync(string id, CreateStudentRequest r)
    {
        var gpa = r.Gpa.HasValue ? (decimal?)r.Gpa.Value : null;
        var errors = _svValidator.Validate(id, r.HoTen, gpa, r.Lop, r.KhoaHoc, r.CongNghe, r.KyNang, r.DuAnDaThucHien);
        if (errors.Count > 0) throw new ArgumentException(string.Join(" ", errors));

        var x = await _db.SinhViens.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy sinh viên.");
        x.HoTen = r.HoTen.Trim();
        x.Lop = string.IsNullOrWhiteSpace(r.Lop) ? null : r.Lop.Trim();
        x.KhoaHoc = string.IsNullOrWhiteSpace(r.KhoaHoc) ? null : r.KhoaHoc.Trim();
        x.Gpa = gpa;
        x.KyNang = string.IsNullOrWhiteSpace(r.KyNang) ? null : r.KyNang.Trim();
        x.ChuyenNganh = string.IsNullOrWhiteSpace(r.ChuyenNganh) ? null : r.ChuyenNganh.Trim();
        x.CongNghe = string.IsNullOrWhiteSpace(r.CongNghe) ? null : r.CongNghe.Trim();
        x.DuAnDaThucHien = string.IsNullOrWhiteSpace(r.DuAnDaThucHien) ? null : r.DuAnDaThucHien.Trim();
        await _db.SaveChangesAsync();
    }

    public async Task CreateLecturerAsync(CreateLecturerRequest r)
    {
        _db.GiangViens.Add(new GiangVien { MaGV=r.MaGV, HoTen=r.HoTen, ChuyenMon=r.ChuyenMon ?? "", SoLuongSVHD=0, ChiTieuHD=r.ChiTieuHD > 0 ? r.ChiTieuHD : 10 });
        await _db.SaveChangesAsync();
    }
    public async Task UpdateLecturerAsync(string id, CreateLecturerRequest r)
    {
        var x = await _db.GiangViens.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy giảng viên.");
        x.HoTen=r.HoTen; x.ChuyenMon=r.ChuyenMon ?? "";
        if (r.ChiTieuHD > 0) x.ChiTieuHD = r.ChiTieuHD;
        await _db.SaveChangesAsync();
    }
    public async Task CreateCompanyAsync(CreateCompanyRequest r)
    {
        _db.CongTys.Add(new CongTy { MaCongTy=r.MaCongTy, TenCongTy=r.TenCongTy, ViTriTuyen=r.ViTriTuyen ?? "", ThoiGian=r.ThoiGian ?? "", SoLuongNhan=r.SoLuongNhan, YeuCau=r.YeuCau ?? "", TrangThai="ChoDuyet" });
        await _db.SaveChangesAsync();
    }
    public async Task UpdateCompanyAsync(string id, CreateCompanyRequest r)
    {
        var x = await _db.CongTys.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy doanh nghiệp.");
        x.TenCongTy=r.TenCongTy; x.ViTriTuyen=r.ViTriTuyen ?? ""; x.ThoiGian=r.ThoiGian ?? ""; x.SoLuongNhan=r.SoLuongNhan; x.YeuCau=r.YeuCau ?? "";
        await _db.SaveChangesAsync();
    }
    public async Task ApproveCompanyAsync(string id, ApprovalRequest r)
    {
        if (r.TrangThai is not ("DaDuyet" or "TuChoi" or "DongBang" or "ChoDuyet")) throw new InvalidOperationException("Trạng thái công ty không hợp lệ.");
        var c = await _db.CongTys.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy công ty.");
        c.TrangThai = r.TrangThai; await _db.SaveChangesAsync();
    }
    public async Task CreateRoundAsync(CreateInternshipRoundRequest r)
    {
        if (r.ThoiGianKT < r.ThoiGianBD) throw new InvalidOperationException("Thời gian kết thúc phải sau thời gian bắt đầu.");
        _db.DotThucTaps.Add(new DotThucTap { MaSo=r.MaSo, TenDot=r.TenDot, NamHoc=r.NamHoc, ThoiGianBD=r.ThoiGianBD, ThoiGianKT=r.ThoiGianKT, TrangThai=r.TrangThai });
        await _db.SaveChangesAsync();
    }
}
