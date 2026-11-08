using InternshipManagement.BLL.Common;
using InternshipManagement.BLL.DTOs.Admin;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using StudentEntity = InternshipManagement.DAL.Entities.SinhVien;
using RegistrationEntity = InternshipManagement.DAL.Entities.DangKyThucTap;
using ProgressEntity = InternshipManagement.DAL.Entities.TienDoThucTap;

namespace InternshipManagement.BLL.Services.Admin;

// New read contracts leave the existing array endpoints available during FE migration.
public sealed class AdminListService(AppDbContext db)
{
    public const int ExportLimit = 10_000;
    private async Task ValidateAsync(AdminListQuery filter, CancellationToken ct)
    {
        filter.Validate();
        if (filter.MaDot != null && !await db.DotThucTaps.AnyAsync(x => x.MaSo == filter.MaDot, ct))
            throw new KeyNotFoundException("Không tìm thấy đợt thực tập.");
    }

    private static void Status(string? value, params string[] allowed)
    {
        if (value != null && !allowed.Contains(value, StringComparer.Ordinal))
            throw new ArgumentException("Trạng thái lọc không hợp lệ.");
    }

    private IQueryable<TaiKhoan> Accounts(AdminListQuery f)
    {
        Status(f.TrangThai, "HoatDong", "BiKhoa", "ChuaKichHoat");
        var query = db.TaiKhoans.AsNoTracking();
        if (f.MaVaiTro != null) query = query.Where(x => x.MaVaiTro == f.MaVaiTro);
        if (f.TrangThai != null) query = query.Where(x => x.TrangThai == f.TrangThai);
        if (f.MaDot != null)
        {
            var svIds = db.SinhVienThamGiaDots.Where(x => x.MaDot == f.MaDot && x.DangThamGia).Select(x => x.MaSV)
                .Union(db.DangKyThucTaps.Where(x => x.MaDot == f.MaDot).Select(x => x.MaSV))
                .Union(db.PhanBoThucTaps.Where(x => x.MaDot == f.MaDot).Select(x => x.MaSinhVien))
                .Union(db.DeXuatThucTapTuTims.Where(x => x.MaDot == f.MaDot).Select(x => x.MaSV));
            var gvIds = db.GVHuongDans.Where(x => x.MaDot == f.MaDot).Select(x => x.MaGiangVien);
            var dnIds = db.DaiDienDoanhNghieps.Where(d => db.CongTyTheoDots.Any(c => c.MaDot == f.MaDot && c.MaCongTy == d.MaCongTy)).Select(d => d.MaSo);

            query = query.Where(x =>
                (x.MaSV != null && svIds.Contains(x.MaSV)) ||
                (x.MaGV != null && gvIds.Contains(x.MaGV)) ||
                (x.MaDaiDien != null && dnIds.Contains(x.MaDaiDien)));
        }
        if (f.MaKhoa is { } khoa)
            query = query.Where(x => x.MaKhoa == khoa || db.SinhViens.Any(s => s.MaSV == x.MaSV && s.MaKhoa == khoa)
                || db.GiangViens.Any(g => g.MaGV == x.MaGV && g.MaKhoa == khoa));
        if (f.Search is { } keyword)
        {
            var kw = keyword.ToLower();
            query = query.Where(x => x.MaTaiKhoan.ToLower().Contains(kw) || x.TenDangNhap.ToLower().Contains(kw)
                || (x.MaSV != null && x.MaSV.ToLower().Contains(kw)) || (x.MaGV != null && x.MaGV.ToLower().Contains(kw))
                || (x.MaDaiDien != null && x.MaDaiDien.ToLower().Contains(kw))
                || db.SinhViens.Any(s => s.MaSV == x.MaSV && s.HoTen.ToLower().Contains(kw))
                || db.GiangViens.Any(g => g.MaGV == x.MaGV && g.HoTen.ToLower().Contains(kw))
                || db.DaiDienDoanhNghieps.Any(d => d.MaSo == x.MaDaiDien && d.HoTen.ToLower().Contains(kw)));
        }
        return query;
    }

    private IQueryable<AccountDto> AccountRows(IQueryable<TaiKhoan> query) => query
        .OrderBy(x => x.TenDangNhap).ThenBy(x => x.MaTaiKhoan)
        .Select(x => new AccountDto(x.MaTaiKhoan, x.TenDangNhap, x.TrangThai, x.MaVaiTro, x.VaiTro.TenVaiTro,
            x.MaSV, x.MaGV, x.MaDaiDien,
            x.MaSV != null ? db.SinhViens.Where(s => s.MaSV == x.MaSV).Select(s => s.HoTen).FirstOrDefault()
                : x.MaGV != null ? db.GiangViens.Where(g => g.MaGV == x.MaGV).Select(g => g.HoTen).FirstOrDefault()
                : db.DaiDienDoanhNghieps.Where(d => d.MaSo == x.MaDaiDien).Select(d => d.HoTen).FirstOrDefault(),
            x.MaSV != null ? db.SinhViens.Where(s => s.MaSV == x.MaSV).Select(s => s.Lop).FirstOrDefault()
                : x.MaGV != null ? db.GiangViens.Where(g => g.MaGV == x.MaGV).Select(g => g.ChuyenMon).FirstOrDefault()
                : db.DaiDienDoanhNghieps.Where(d => d.MaSo == x.MaDaiDien).Select(d => d.CongTy.TenCongTy).FirstOrDefault(),
            x.MaSV != null ? db.SinhViens.Where(s => s.MaSV == x.MaSV).Select(s => s.MaKhoa).FirstOrDefault()
                : x.MaGV != null ? db.GiangViens.Where(g => g.MaGV == x.MaGV).Select(g => g.MaKhoa).FirstOrDefault()
                : x.MaKhoa));

    public async Task<object> AccountsAsync(AdminListQuery f, CancellationToken ct = default)
    {
        await ValidateAsync(f, ct);
        var query = Accounts(f);
        var counts = await query.GroupBy(x => x.TrangThai).Select(g => new { Status = g.Key, Count = g.Count() }).ToListAsync(ct);
        var total = counts.Sum(x => x.Count);
        var items = await AccountRows(query).Skip(f.Offset).Take(f.PageSize).ToListAsync(ct);
        return new { Items = items, TotalCount = total, f.Page, f.PageSize,
            Summary = new { Total = total, HoatDong = counts.Where(x => x.Status == "HoatDong").Sum(x => x.Count),
                BiKhoa = counts.Where(x => x.Status == "BiKhoa").Sum(x => x.Count), ChuaKichHoat = counts.Where(x => x.Status == "ChuaKichHoat").Sum(x => x.Count) } };
    }

    private IQueryable<StudentEntity> Students(AdminListQuery f)
    {
        var query = db.SinhViens.AsNoTracking();
        if (f.MaDot != null)
        {
            var ids = db.SinhVienThamGiaDots.Where(x => x.MaDot == f.MaDot && x.DangThamGia).Select(x => x.MaSV)
                .Union(db.DangKyThucTaps.Where(x => x.MaDot == f.MaDot).Select(x => x.MaSV))
                .Union(db.PhanBoThucTaps.Where(x => x.MaDot == f.MaDot).Select(x => x.MaSinhVien))
                .Union(db.DeXuatThucTapTuTims.Where(x => x.MaDot == f.MaDot).Select(x => x.MaSV))
                .Union(db.GVHuongDans.Where(x => x.MaDot == f.MaDot).Select(x => x.MaSinhVien))
                .Union(db.TienDoThucTaps.Where(x => x.MaDot == f.MaDot).Select(x => x.MaSV))
                .Union(db.PhieuChamDiems.Where(x => x.MaDot == f.MaDot).Select(x => x.MaSV));
            query = query.Where(x => ids.Contains(x.MaSV));
        }
        if (f.Lop != null) query = query.Where(x => x.Lop == f.Lop);
        if (f.ChuyenNganh != null) query = query.Where(x => x.ChuyenNganh == f.ChuyenNganh);
        if (f.Search is { } keyword)
        {
            var kw = keyword.ToLower();
            query = query.Where(x => x.MaSV.ToLower().Contains(kw) || x.HoTen.ToLower().Contains(kw)
                || (x.Lop != null && x.Lop.ToLower().Contains(kw)));
        }
        return query;
    }

    private static IQueryable<StudentListRow> StudentRows(IQueryable<StudentEntity> query) => query.OrderBy(x => x.MaSV)
        .Select(x => new StudentListRow(x.MaSV, x.HoTen, x.Lop, x.KhoaHoc, x.Gpa, x.KyNang, x.ChuyenNganh, x.CongNghe, x.DuAnDaThucHien));

    public async Task<object> StudentsAsync(AdminListQuery f, CancellationToken ct = default)
    {
        await ValidateAsync(f, ct);
        var query = Students(f);
        var total = await query.CountAsync(ct);
        var classes = await query.Where(x => x.Lop != null && x.Lop != "").Select(x => x.Lop).Distinct().CountAsync(ct);
        var items = await StudentRows(query).Skip(f.Offset).Take(f.PageSize).ToListAsync(ct);
        return new { Items = items, TotalCount = total, f.Page, f.PageSize, Summary = new { Total = total, SoLop = classes } };
    }

    private IQueryable<RegistrationEntity> Registrations(AdminListQuery f)
    {
        Status(f.TrangThai, "ChoDuyet", "DaDuyet", "TuChoi");
        var query = db.DangKyThucTaps.AsNoTracking();
        if (f.MaDot != null) query = query.Where(x => x.MaDot == f.MaDot);
        if (f.TrangThai != null) query = query.Where(x => x.TrangThai == f.TrangThai);
        if (f.Lop != null) query = query.Where(x => x.SinhVien.Lop == f.Lop);
        if (f.Search is { } keyword)
        {
            var kw = keyword.ToLower();
            query = query.Where(x => x.MaSV.ToLower().Contains(kw) || x.SinhVien.HoTen.ToLower().Contains(kw)
                || x.CongTy.TenCongTy.ToLower().Contains(kw) || x.MaDK.ToLower().Contains(kw));
        }
        return query;
    }

    private IQueryable<RegistrationListRow> RegistrationRows(IQueryable<RegistrationEntity> query) => query
        .OrderBy(x => x.TrangThai).ThenBy(x => x.NgayDangKy).ThenBy(x => x.MaDK)
        .Select(x => new RegistrationListRow(x.MaDK, x.MaSV, x.SinhVien.HoTen, x.SinhVien.Lop,
            x.MaCongTy, x.CongTy.TenCongTy, x.ViTriDangKy ?? x.CongTy.ViTriTuyen, x.MaDot, x.DotThucTap.TenDot,
            x.NgayDangKy, x.ThuTuUuTien, x.TrangThai, x.LanDangKy, x.MaLanHoTro,
            db.PhanBoThucTaps.Any(p => p.MaSinhVien == x.MaSV && p.MaDot == x.MaDot && p.TrangThai != "Huy"),
            db.PhanBoThucTaps.Where(p => p.MaSinhVien == x.MaSV && p.MaDot == x.MaDot && p.TrangThai != "Huy")
                .OrderByDescending(p => p.NgayPhanBo).ThenBy(p => p.MaPhanBo).Select(p => p.CongTy.TenCongTy).FirstOrDefault()));

    public async Task<object> RegistrationsAsync(AdminListQuery f, CancellationToken ct = default)
    {
        await ValidateAsync(f, ct);
        var query = Registrations(f);
        var counts = await query.GroupBy(x => x.TrangThai).Select(g => new { Status = g.Key, Count = g.Count() }).ToListAsync(ct);
        var total = counts.Sum(x => x.Count);
        var students = await query.Select(x => x.MaSV).Distinct().CountAsync(ct);
        var items = await RegistrationRows(query).Skip(f.Offset).Take(f.PageSize).ToListAsync(ct);
        return new { Items = items, TotalCount = total, f.Page, f.PageSize,
            Summary = new { Total = total, TongSinhVien = students, ChoDuyet = counts.Where(x => x.Status == "ChoDuyet").Sum(x => x.Count),
                DaDuyet = counts.Where(x => x.Status == "DaDuyet").Sum(x => x.Count), TuChoi = counts.Where(x => x.Status == "TuChoi").Sum(x => x.Count) } };
    }

    private IQueryable<ProgressEntity> Progress(AdminListQuery f)
    {
        Status(f.TrangThai, "ChuaNop", "DaNop", "DaDuyet", "YeuCauSua");
        if (f.PhamVi is not ("HienHanh" or "LuuTru" or "TatCa")) throw new ArgumentException("Phạm vi phải là HienHanh, LuuTru hoặc TatCa.");
        var query = db.TienDoThucTaps.AsNoTracking();
        if (f.MaDot != null) query = query.Where(x => x.MaDot == f.MaDot);
        if (f.TrangThai != null) query = query.Where(x => x.TrangThaiDuyet == f.TrangThai);
        if (f.Lop != null) query = query.Where(x => x.SinhVien.Lop == f.Lop);
        if (f.PhamVi == "HienHanh") query = query.Where(x => x.MaPhanBoLuuTru == null);
        if (f.PhamVi == "LuuTru") query = query.Where(x => x.MaPhanBoLuuTru != null);
        if (f.Search is { } keyword)
        {
            var kw = keyword.ToLower();
            query = query.Where(x => x.MaSV.ToLower().Contains(kw) || x.SinhVien.HoTen.ToLower().Contains(kw));
        }
        return query;
    }

    private static IQueryable<ProgressListRow> ProgressRows(IQueryable<ProgressEntity> query) => query
        .OrderBy(x => x.MocThoiGian).ThenBy(x => x.MaSV).ThenBy(x => x.MaTienDo)
        .Select(x => new ProgressListRow(x.MaTienDo, x.MaSV, x.SinhVien.HoTen, x.SinhVien.Lop, x.MaDot,
            x.DotThucTap.TenDot, x.MocThoiGian, x.NoiDungBaoCao, x.NgayNop, x.TrangThaiDuyet, x.MaPhanBoLuuTru));

    public async Task<object> ProgressAsync(AdminListQuery f, CancellationToken ct = default)
    {
        await ValidateAsync(f, ct);
        var query = Progress(f);
        var counts = await query.GroupBy(x => new { x.TrangThaiDuyet, Archived = x.MaPhanBoLuuTru != null })
            .Select(g => new { g.Key.TrangThaiDuyet, g.Key.Archived, Count = g.Count() }).ToListAsync(ct);
        var total = counts.Sum(x => x.Count);
        var current = counts.Where(x => !x.Archived).ToList();
        var items = await ProgressRows(query).Skip(f.Offset).Take(f.PageSize).ToListAsync(ct);
        return new { Items = items, TotalCount = total, f.Page, f.PageSize,
            Summary = new { Total = current.Sum(x => x.Count), Archived = counts.Where(x => x.Archived).Sum(x => x.Count),
                Submitted = current.Where(x => x.TrangThaiDuyet != "ChuaNop").Sum(x => x.Count),
                Approved = current.Where(x => x.TrangThaiDuyet == "DaDuyet").Sum(x => x.Count),
                Pending = current.Where(x => x.TrangThaiDuyet == "DaNop").Sum(x => x.Count),
                Revision = current.Where(x => x.TrangThaiDuyet == "YeuCauSua").Sum(x => x.Count),
                Missing = current.Where(x => x.TrangThaiDuyet == "ChuaNop").Sum(x => x.Count) } };
    }

    public async Task<object> StudentProgressSummaryAsync(AdminListQuery f, CancellationToken ct = default)
    {
        await ValidateAsync(f, ct);
        if (f.TrangThai != null)
        {
            Status(f.TrangThai, "HoanTat", "DangThucHien", "ChamTienDo", "ChoDuyet", "ChuaNop");
        }
        if (f.PhamVi is not ("HienHanh" or "LuuTru" or "TatCa"))
            throw new ArgumentException("Phạm vi phải là HienHanh, LuuTru hoặc TatCa.");

        var allRows = await GetStudentProgressRowsAsync(f.MaDot, f.PhamVi, ct);

        var filtered = allRows.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(f.Lop))
        {
            filtered = filtered.Where(x => string.Equals(x.Lop, f.Lop, StringComparison.OrdinalIgnoreCase));
        }
        if (!string.IsNullOrWhiteSpace(f.Search))
        {
            var kw = f.Search.Trim().ToLower();
            filtered = filtered.Where(x => x.MaSinhVien.ToLower().Contains(kw) || x.SinhVien.ToLower().Contains(kw));
        }
        if (!string.IsNullOrWhiteSpace(f.TrangThai))
        {
            if (f.TrangThai == "ChoDuyet")
                filtered = filtered.Where(x => x.SoTuanChoDuyet > 0);
            else
                filtered = filtered.Where(x => x.TinhTrang == f.TrangThai);
        }

        var list = filtered.ToList();
        var total = list.Count;
        var pagedItems = list.Skip(f.Offset).Take(f.PageSize).ToList();

        var summary = new
        {
            TongSinhVien = allRows.Count,
            HoanTat = allRows.Count(x => x.TinhTrang == "HoanTat"),
            DangThucHien = allRows.Count(x => x.TinhTrang == "DangThucHien"),
            ChamTienDo = allRows.Count(x => x.TinhTrang == "ChamTienDo"),
            ChoDuyet = allRows.Count(x => x.SoTuanChoDuyet > 0),
            ChuaNop = allRows.Count(x => x.TinhTrang == "ChuaNop"),
            TongBaoCao = allRows.Sum(x => x.TongSoTuan),
            BaoCaoDaNop = allRows.Sum(x => x.SoTuanDaNop),
            BaoCaoDaDuyet = allRows.Sum(x => x.SoTuanDaDuyet),
            BaoCaoChoDuyet = allRows.Sum(x => x.SoTuanChoDuyet),
            BaoCaoYeuCauSua = allRows.Sum(x => x.SoTuanYeuCauSua),
            BaoCaoChuaNop = allRows.Sum(x => x.SoTuanChuaNop)
        };

        return new
        {
            Items = pagedItems,
            TotalCount = total,
            f.Page,
            f.PageSize,
            Summary = summary
        };
    }

    public async Task<List<StudentProgressSummaryRow>> GetStudentProgressRowsAsync(string? maDot, string phamVi, CancellationToken ct)
    {
        var query = db.TienDoThucTaps.AsNoTracking();
        if (!string.IsNullOrEmpty(maDot)) query = query.Where(x => x.MaDot == maDot);
        if (phamVi == "HienHanh") query = query.Where(x => x.MaPhanBoLuuTru == null);
        else if (phamVi == "LuuTru") query = query.Where(x => x.MaPhanBoLuuTru != null);

        var rawSlots = await query
            .Select(x => new
            {
                x.MaTienDo,
                x.MaSV,
                HoTen = x.SinhVien.HoTen,
                Lop = x.SinhVien.Lop,
                x.MocThoiGian,
                x.NgayNop,
                x.TrangThaiDuyet,
                x.HanNopBoSung
            })
            .ToListAsync(ct);

        if (rawSlots.Count == 0) return new List<StudentProgressSummaryRow>();

        var today = DateTime.Today;
        var nowOffset = DateTimeOffset.Now;

        var grouped = rawSlots
            .GroupBy(x => new { x.MaSV, x.HoTen, x.Lop })
            .Select(g => new
            {
                g.Key.MaSV,
                g.Key.HoTen,
                g.Key.Lop,
                TongSoTuan = g.Count(),
                DaNop = g.Count(x => x.TrangThaiDuyet != "ChuaNop"),
                DaDuyet = g.Count(x => x.TrangThaiDuyet == "DaDuyet"),
                ChoDuyet = g.Count(x => x.TrangThaiDuyet == "DaNop"),
                YeuCauSua = g.Count(x => x.TrangThaiDuyet == "YeuCauSua"),
                ChuaNop = g.Count(x => x.TrangThaiDuyet == "ChuaNop"),
                QuaHan = g.Count(x => x.TrangThaiDuyet == "ChuaNop" && x.MocThoiGian < today && (x.HanNopBoSung == null || x.HanNopBoSung < nowOffset)),
                NgayNopMoiNhat = g.Max(x => x.NgayNop)
            })
            .ToList();

        var studentIds = grouped.Select(x => x.MaSV).ToList();

        var placements = await db.PhanBoThucTaps.AsNoTracking()
            .Where(x => (maDot == null || x.MaDot == maDot) && studentIds.Contains(x.MaSinhVien) && x.TrangThai != "Huy" && x.DaDuocKhoaDuyet)
            .Select(x => new { x.MaSinhVien, TenCongTy = x.TenCongTyXacNhan ?? x.CongTy.TenCongTy, x.NgayPhanBo })
            .ToListAsync(ct);
        var placementMap = placements
            .GroupBy(p => p.MaSinhVien)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(p => p.NgayPhanBo).First().TenCongTy);

        var assignments = await db.GVHuongDans.AsNoTracking()
            .Where(x => (maDot == null || x.MaDot == maDot) && studentIds.Contains(x.MaSinhVien) && x.TrangThai == "DangHuongDan")
            .Select(x => new { x.MaSinhVien, TenGV = x.GiangVien.HoTen, x.NgayPC })
            .ToListAsync(ct);
        var assignmentMap = assignments
            .GroupBy(a => a.MaSinhVien)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.NgayPC).First().TenGV);

        var result = grouped.Select(g =>
        {
            string tinhTrang;
            if (g.TongSoTuan > 0 && g.DaNop == g.TongSoTuan)
                tinhTrang = "HoanTat";
            else if (g.QuaHan > 0)
                tinhTrang = "ChamTienDo";
            else if (g.DaNop > 0)
                tinhTrang = "DangThucHien";
            else
                tinhTrang = "ChuaNop";

            return new StudentProgressSummaryRow
            {
                MaSinhVien = g.MaSV,
                SinhVien = g.HoTen,
                Lop = g.Lop,
                NoiThucTap = placementMap.TryGetValue(g.MaSV, out var cty) ? cty : "—",
                GiangVien = assignmentMap.TryGetValue(g.MaSV, out var gv) ? gv : "—",
                TongSoTuan = g.TongSoTuan,
                SoTuanDaNop = g.DaNop,
                SoTuanDaDuyet = g.DaDuyet,
                SoTuanChoDuyet = g.ChoDuyet,
                SoTuanYeuCauSua = g.YeuCauSua,
                SoTuanChuaNop = g.ChuaNop,
                SoTuanQuaHan = g.QuaHan,
                TinhTrang = tinhTrang,
                NgayNopMoiNhat = g.NgayNopMoiNhat
            };
        })
        .OrderBy(x => x.MaSinhVien)
        .ToList();

        return result;
    }

    public async Task<byte[]> ExportAsync(string kind, AdminListQuery f, CancellationToken ct = default)
    {
        await ValidateAsync(f, ct);
        // Export uses the same filters and ordering, never the requested page offset.
        switch (kind)
        {
            case "accounts":
                var accounts = await Bounded(AccountRows(Accounts(f)), ct);
                return TabularExport.Xlsx(["Mã tài khoản", "Tên đăng nhập", "Vai trò", "Trạng thái", "Mã SV", "Mã GV", "Mã đại diện", "Họ tên", "Đơn vị"],
                    accounts.Select(x => new object?[] { x.MaTaiKhoan, x.TenDangNhap, x.TenVaiTro, x.TrangThai, x.MaSV, x.MaGV, x.MaDaiDien, x.TenChuSoHuu, x.TenDonVi }).ToList());
            case "students":
                var students = await Bounded(StudentRows(Students(f)), ct);
                return TabularExport.Xlsx(["Mã SV", "Họ tên", "Lớp", "Khóa học", "GPA", "Chuyên ngành", "Kỹ năng", "Công cụ, phần mềm", "Dự án, kinh nghiệm"],
                    students.Select(x => new object?[] { x.MaSV, x.HoTen, x.Lop, x.KhoaHoc, x.Gpa, x.ChuyenNganh, x.KyNang, x.CongNghe, x.DuAnDaThucHien }).ToList());
            case "registrations":
                var apps = await Bounded(RegistrationRows(Registrations(f)), ct);
                return TabularExport.Xlsx(["Mã đăng ký", "Mã SV", "Họ tên", "Lớp", "Mã đợt", "Đợt", "Công ty", "Vị trí", "Ngày đăng ký", "Ưu tiên", "Trạng thái", "Lần đăng ký", "Lần hỗ trợ", "Có nơi tiếp nhận", "Nơi tiếp nhận"],
                    apps.Select(x => new object?[] { x.MaDangKy, x.MaSinhVien, x.SinhVien, x.Lop, x.MaDot, x.Dot, x.CongTy, x.ViTriTuyen,
                        x.NgayDangKy.ToString("yyyy-MM-dd HH:mm"), x.ThuTuUuTien, x.TrangThai, x.LanDangKy, x.MaLanHoTro, x.DaCoNoiThucTap ? "Có" : "Chưa", x.TenNoiThucTap }).ToList());
            case "student-progress-summary":
                var studentRows = await GetStudentProgressRowsAsync(f.MaDot, f.PhamVi, ct);
                if (!string.IsNullOrWhiteSpace(f.Lop))
                    studentRows = studentRows.Where(x => string.Equals(x.Lop, f.Lop, StringComparison.OrdinalIgnoreCase)).ToList();
                if (!string.IsNullOrWhiteSpace(f.Search))
                {
                    var kw = f.Search.Trim().ToLower();
                    studentRows = studentRows.Where(x => x.MaSinhVien.ToLower().Contains(kw) || x.SinhVien.ToLower().Contains(kw)).ToList();
                }
                if (!string.IsNullOrWhiteSpace(f.TrangThai))
                {
                    if (f.TrangThai == "ChoDuyet")
                        studentRows = studentRows.Where(x => x.SoTuanChoDuyet > 0).ToList();
                    else
                        studentRows = studentRows.Where(x => x.TinhTrang == f.TrangThai).ToList();
                }
                var roundInfo = await db.DotThucTaps.AsNoTracking().FirstOrDefaultAsync(x => x.MaSo == f.MaDot, ct);
                var rName = roundInfo?.TenDot ?? f.MaDot ?? "Tất cả đợt";
                return TabularExport.Xlsx(
                    ["STT", "Mã SV", "Họ và tên", "Lớp", "Nơi thực tập", "GVHD", "Đã nộp", "Tổng tuần", "Tỷ lệ", "Đã duyệt", "Chờ duyệt", "Cần sửa", "Tình trạng học vụ", "Lần nộp gần nhất"],
                    studentRows.Select((x, idx) => new object?[] {
                        idx + 1,
                        x.MaSinhVien,
                        x.SinhVien,
                        x.Lop ?? "—",
                        x.NoiThucTap,
                        x.GiangVien,
                        x.SoTuanDaNop,
                        x.TongSoTuan,
                        $"{x.PhanTramHoanThanh}%",
                        x.SoTuanDaDuyet,
                        x.SoTuanChoDuyet,
                        x.SoTuanYeuCauSua,
                        x.TinhTrang switch {
                            "HoanTat" => "Hoàn tất báo cáo",
                            "DangThucHien" => "Đang thực hiện",
                            "ChamTienDo" => "Chậm tiến độ (quá hạn)",
                            "ChuaNop" => "Chưa nộp bài nào",
                            _ => x.TinhTrang
                        },
                        x.NgayNopMoiNhat?.ToString("yyyy-MM-dd HH:mm") ?? "—"
                    }).ToList(),
                    title: "BẢNG TỔNG HỢP TIẾN ĐỘ THỰC TẬP SINH VIÊN",
                    subtitle: $"Đợt thực tập: {rName}  |  Tổng sinh viên: {studentRows.Count}  |  Thời gian xuất: {DateTime.Now:dd/MM/yyyy HH:mm}");
            case "progress":
                var reports = await Bounded(ProgressRows(Progress(f)), ct);
                var dotName = reports.FirstOrDefault(x => !string.IsNullOrEmpty(x.Dot))?.Dot ?? f.MaDot ?? "Tất cả đợt";
                return TabularExport.Xlsx(
                    ["Mã báo cáo", "Mã SV", "Họ tên", "Lớp", "Hạn báo cáo", "Ngày nộp", "Trạng thái", "Nội dung"],
                    reports.Select(x => new object?[] {
                        x.MaTienDo,
                        x.MaSinhVien,
                        x.SinhVien,
                        x.Lop,
                        x.MocThoiGian.ToString("yyyy-MM-dd"),
                        x.NgayNop?.ToString("yyyy-MM-dd HH:mm") ?? "—",
                        x.TrangThaiDuyet switch {
                            "DaNop" => "Chờ duyệt",
                            "DaDuyet" => "Đã duyệt",
                            "YeuCauSua" => "Yêu cầu sửa",
                            "ChuaNop" => "Chưa nộp",
                            _ => x.TrangThaiDuyet
                        },
                        x.NoiDungBaoCao ?? ""
                    }).ToList(),
                    title: "CHI TIẾT BÁO CÁO TIẾN ĐỘ THỰC TẬP",
                    subtitle: $"Đợt thực tập: {dotName}  |  Thời gian xuất: {DateTime.Now:dd/MM/yyyy HH:mm}");
            default: throw new ArgumentException("Loại danh sách không hợp lệ.");
        }
    }

    private static async Task<List<T>> Bounded<T>(IQueryable<T> query, CancellationToken ct)
    {
        var rows = await query.Take(ExportLimit + 1).ToListAsync(ct);
        if (rows.Count > ExportLimit) throw new ArgumentException("Tối đa 10.000 dòng mỗi lần xuất; chọn thêm bộ lọc.");
        return rows;
    }
}

public sealed record StudentListRow(string MaSV, string HoTen, string? Lop, string? KhoaHoc, decimal? Gpa,
    string? KyNang, string? ChuyenNganh, string? CongNghe, string? DuAnDaThucHien);
public sealed record RegistrationListRow(string MaDangKy, string MaSinhVien, string SinhVien, string? Lop,
    string MaCongTy, string CongTy, string? ViTriTuyen, string MaDot, string Dot, DateTime NgayDangKy,
    int ThuTuUuTien, string TrangThai, int LanDangKy, string? MaLanHoTro, bool DaCoNoiThucTap, string? TenNoiThucTap);
public sealed record ProgressListRow(string MaTienDo, string MaSinhVien, string SinhVien, string? Lop,
    string MaDot, string Dot, DateTime MocThoiGian, string? NoiDungBaoCao, DateTime? NgayNop,
    string TrangThaiDuyet, string? MaPhanBoLuuTru);

public sealed class StudentProgressSummaryRow
{
    public string MaSinhVien { get; set; } = "";
    public string SinhVien { get; set; } = "";
    public string? Lop { get; set; }
    public string? NoiThucTap { get; set; }
    public string? GiangVien { get; set; }
    public int TongSoTuan { get; set; }
    public int SoTuanDaNop { get; set; }
    public int SoTuanDaDuyet { get; set; }
    public int SoTuanChoDuyet { get; set; }
    public int SoTuanYeuCauSua { get; set; }
    public int SoTuanChuaNop { get; set; }
    public int SoTuanQuaHan { get; set; }
    public decimal PhanTramHoanThanh => TongSoTuan > 0 ? Math.Round((decimal)SoTuanDaNop * 100 / TongSoTuan, 1) : 0;
    public string TinhTrang { get; set; } = "";
    public DateTime? NgayNopMoiNhat { get; set; }
}
