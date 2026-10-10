using InternshipManagement.BLL.DTOs.Admin;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.Admin;

public class AdminService
{
    private readonly AppDbContext _db;
    public AdminService(AppDbContext db) => _db = db;

    public async Task CreateAccountAsync(CreateAccountRequest r)
    {
        if (await _db.TaiKhoans.AnyAsync(x => x.MaTaiKhoan == r.MaTaiKhoan || x.TenDangNhap == r.TenDangNhap)) throw new InvalidOperationException("Mã tài khoản hoặc tên đăng nhập đã tồn tại.");
        _db.TaiKhoans.Add(new TaiKhoan { MaTaiKhoan=r.MaTaiKhoan, TenDangNhap=r.TenDangNhap, MatKhau=InternshipManagement.BLL.Services.Auth.AuthService.HashPassword(r.MatKhau), TrangThai="HoatDong", MaVaiTro=r.MaVaiTro, MaSV=r.MaSV, MaGV=r.MaGV, MaDaiDien=r.MaDaiDien });
        await _db.SaveChangesAsync();
    }

    public Task<List<TaiKhoan>> AccountsAsync() => _db.TaiKhoans.Include(x => x.VaiTro).AsNoTracking().OrderBy(x => x.TenDangNhap).ToListAsync();
    public async Task UpdateAccountAsync(string id, UpdateAccountRequest req)
    {
        var x = await _db.TaiKhoans.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy tài khoản.");
        if (req.TrangThai is not ("HoatDong" or "BiKhoa" or "ChuaKichHoat")) throw new InvalidOperationException("Trạng thái tài khoản không hợp lệ.");
        if (!await _db.VaiTros.AnyAsync(v => v.MaVaiTro == req.MaVaiTro)) throw new InvalidOperationException("Vai trò không tồn tại.");
        if ((req.MaSV != null ? 1 : 0) + (req.MaGV != null ? 1 : 0) + (req.MaDaiDien != null ? 1 : 0) > 1) throw new InvalidOperationException("Tài khoản chỉ được liên kết với một chủ tài khoản.");
        x.TrangThai = req.TrangThai; x.MaVaiTro = req.MaVaiTro; x.MaSV=req.MaSV; x.MaGV=req.MaGV; x.MaDaiDien=req.MaDaiDien; await _db.SaveChangesAsync();
    }

    public Task<List<InternshipManagement.DAL.Entities.SinhVien>> StudentsAsync()=> _db.SinhViens.AsNoTracking().OrderBy(x => x.MaSV).ToListAsync();
    public Task<List<GiangVien>> LecturersAsync() => _db.GiangViens.AsNoTracking().OrderBy(x => x.MaGV).ToListAsync();
    public Task<List<CongTy>> CompaniesAsync() => _db.CongTys.AsNoTracking().OrderBy(x => x.MaCongTy).ToListAsync();
    public Task<List<DotThucTap>> RoundsAsync() => _db.DotThucTaps.AsNoTracking().OrderByDescending(x => x.ThoiGianBD).ToListAsync();
    public Task<List<VaiTro>> RolesAsync() => _db.VaiTros.AsNoTracking().OrderBy(x => x.MaVaiTro).ToListAsync();
    public Task<List<TieuChi>> CriteriaAsync() => _db.TieuChis.AsNoTracking().OrderBy(x => x.MaTieuChi).ToListAsync();
    public Task<List<ThongBao>> NotificationsAsync() => _db.ThongBaos.AsNoTracking().OrderByDescending(x => x.NgayTao).Take(50).ToListAsync();
    public async Task SendNotificationAsync(SendNotificationRequest request, string? senderId)
    {
        if (string.IsNullOrWhiteSpace(request.TieuDe) || string.IsNullOrWhiteSpace(request.NoiDung)) throw new InvalidOperationException("Tiêu đề và nội dung thông báo không được để trống.");
        if (request.TieuDe.Trim().Length > 200) throw new InvalidOperationException("Tiêu đề không được vượt quá 200 ký tự.");
        _db.ThongBaos.Add(new ThongBao { MaThongBao = $"TB{Guid.NewGuid():N}"[..20], TieuDe = request.TieuDe.Trim(), NoiDung = request.NoiDung.Trim(), NgayTao = DateTime.Now, MaNguoiGui = senderId });
        await _db.SaveChangesAsync();
    }

    public async Task UpdateRoundAsync(string id, UpdateRoundRequest request)
    {
        if (request.ThoiGianKT < request.ThoiGianBD) throw new InvalidOperationException("Thời gian kết thúc phải sau thời gian bắt đầu.");
        if (request.TrangThai is not ("ChuaBatDau" or "DangDienRa" or "DaKetThuc")) throw new InvalidOperationException("Trạng thái đợt thực tập không hợp lệ.");
        var round = await _db.DotThucTaps.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy đợt thực tập.");
        round.TenDot = request.TenDot; round.NamHoc = request.NamHoc; round.ThoiGianBD = request.ThoiGianBD; round.ThoiGianKT = request.ThoiGianKT; round.TrangThai = request.TrangThai;
        await _db.SaveChangesAsync();
    }

    public async Task CreateCriteriaAsync(SaveCriteriaRequest request)
    {
        if (request.DiemToiDa <= 0) throw new InvalidOperationException("Điểm tối đa phải lớn hơn 0.");
        if ((await _db.TieuChis.SumAsync(x => (decimal?)x.DiemToiDa) ?? 0) + (decimal)request.DiemToiDa > 10) throw new InvalidOperationException("Tổng điểm tối đa của các tiêu chí không được vượt quá 10.");
        if (await _db.TieuChis.AnyAsync(x => x.MaTieuChi == request.MaTieuChi)) throw new InvalidOperationException("Mã tiêu chí đã tồn tại.");
        _db.TieuChis.Add(new TieuChi { MaTieuChi = request.MaTieuChi, TenTieuChi = request.TenTieuChi, DiemToiDa = (decimal)request.DiemToiDa });
        await _db.SaveChangesAsync();
    }

    public async Task UpdateCriteriaAsync(string id, SaveCriteriaRequest request)
    {
        if (request.DiemToiDa <= 0) throw new InvalidOperationException("Điểm tối đa phải lớn hơn 0.");
        if ((await _db.TieuChis.Where(x => x.MaTieuChi != id).SumAsync(x => (decimal?)x.DiemToiDa) ?? 0) + (decimal)request.DiemToiDa > 10) throw new InvalidOperationException("Tổng điểm tối đa của các tiêu chí không được vượt quá 10.");
        var item = await _db.TieuChis.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy tiêu chí.");
        item.TenTieuChi = request.TenTieuChi; item.DiemToiDa = (decimal)request.DiemToiDa;
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
        var criteria = await _db.TieuChis.AsNoTracking().ToDictionaryAsync(x => x.MaTieuChi);
        if (request.ChiTiet.Select(x => x.MaTieuChi).Distinct().Count() != request.ChiTiet.Count) throw new InvalidOperationException("Phiếu có tiêu chí bị lặp.");
        foreach (var score in request.ChiTiet)
        {
            if (!criteria.TryGetValue(score.MaTieuChi, out var criterion)) throw new InvalidOperationException($"Không tìm thấy tiêu chí {score.MaTieuChi}.");
            if (score.DiemCham < 0 || (decimal)score.DiemCham > criterion.DiemToiDa) throw new InvalidOperationException($"Điểm {criterion.TenTieuChi} phải nằm trong khoảng 0–{criterion.DiemToiDa}.");
        }
        if (request.ChiTiet.Sum(x => x.DiemCham) > 10) throw new InvalidOperationException("Tổng điểm phiếu chấm không được vượt quá 10.");
        var existing = await _db.ChiTietChamDiems.Where(x => x.MaPhieuCham == id).ToListAsync();
        foreach (var score in request.ChiTiet)
        {
            var detail = existing.FirstOrDefault(x => x.MaTieuChi == score.MaTieuChi);
            if (detail == null) _db.ChiTietChamDiems.Add(new ChiTietChamDiem { MaSo = Guid.NewGuid().ToString("N")[..20], MaPhieuCham = id, MaTieuChi = score.MaTieuChi, DiemCham = (decimal)score.DiemCham });
            else detail.DiemCham = (decimal)score.DiemCham;
        }
        assessment.TongDiem = (decimal)request.ChiTiet.Sum(x => x.DiemCham);
        assessment.NgayCham = DateTime.Today;
        await _db.SaveChangesAsync();
    }

    public async Task<object> CloAnalyticsAsync(string? maDot)
    {
        var assessmentsQuery = _db.PhieuChamDiems.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(maDot)) assessmentsQuery = assessmentsQuery.Where(x => x.MaDot == maDot);
        var assessments = await assessmentsQuery.Select(x => new { x.MaPhieu, x.MaDot, x.MaSinhVien, x.TongDiem, x.NgayCham }).ToListAsync();
        var studentIds = assessments.Select(x => x.MaSinhVien).Distinct().ToList();
        var students = await _db.SinhViens.AsNoTracking().Where(x => studentIds.Contains(x.MaSV)).ToDictionaryAsync(x => x.MaSV, x => new { x.HoTen, x.Lop });
        var roundIds = assessments.Select(x => x.MaDot).Distinct().ToList();
        var roundNames = await _db.DotThucTaps.AsNoTracking().Where(x => roundIds.Contains(x.MaSo)).ToDictionaryAsync(x => x.MaSo, x => x.TenDot);
        var criteria = await _db.TieuChis.AsNoTracking().OrderBy(x => x.MaTieuChi).Select(x => new { x.MaTieuChi, x.TenTieuChi, x.DiemToiDa }).ToListAsync();
        var assessmentIds = assessments.Select(x => x.MaPhieu).ToList();
        var details = assessmentIds.Count == 0 ? new List<ChiTietChamDiem>() : await _db.ChiTietChamDiems.AsNoTracking().Where(x => assessmentIds.Contains(x.MaPhieuCham)).ToListAsync();
        var byCriteria = criteria.Select(c => new { c.MaTieuChi, c.TenTieuChi, c.DiemToiDa, submissions = details.Count(x => x.MaTieuChi == c.MaTieuChi), average = (double)(details.Where(x => x.MaTieuChi == c.MaTieuChi).Select(x => (decimal?)x.DiemCham).Average() ?? 0) }).ToList();
        var rows = assessments.Select(x => new { x.MaPhieu, x.MaSinhVien, sinhVien = students.TryGetValue(x.MaSinhVien, out var s) ? s.HoTen : x.MaSinhVien, lop = students.TryGetValue(x.MaSinhVien, out var sv) ? sv.Lop : "", x.MaDot, dot = roundNames.TryGetValue(x.MaDot, out var name) ? name : x.MaDot, tongDiem = x.TongDiem, x.NgayCham, chiTiet = details.Where(d => d.MaPhieuCham == x.MaPhieu).Select(d => new { maTieuChi = d.MaTieuChi, diemCham = d.DiemCham }) }).OrderByDescending(x => x.tongDiem).ToList();
        var scored = assessments.Where(x => x.TongDiem.HasValue).Select(x => (double)x.TongDiem!.Value).ToList();
        return new { criteria = byCriteria, assessments = rows, total = assessments.Count, averageScore = scored.Count == 0 ? 0 : Math.Round(scored.Average(), 2), complete = assessments.Count(x => x.TongDiem.HasValue), pending = assessments.Count(x => !x.TongDiem.HasValue), scoreDistribution = new[] { new { label = "Dưới 5", count = scored.Count(x => x < 5) }, new { label = "5–6.9", count = scored.Count(x => x >= 5 && x < 7) }, new { label = "7–8.4", count = scored.Count(x => x >= 7 && x < 8.5) }, new { label = "8.5–10", count = scored.Count(x => x >= 8.5) } } };
    }

    public async Task<object> KhoaOverviewAsync()
    {
        var rounds = await _db.DotThucTaps.AsNoTracking().OrderByDescending(x => x.ThoiGianBD).Select(x => new { x.MaSo, x.TenDot, x.NamHoc, x.TrangThai }).ToListAsync();
        var activeRound = rounds.FirstOrDefault(x => x.TrangThai == "DangDienRa") ?? rounds.FirstOrDefault();
        var roundId = activeRound?.MaSo;
        var students = await _db.SinhViens.CountAsync();
        var registrations = roundId == null ? 0 : await _db.DangKyThucTaps.CountAsync(x => x.MaDot == roundId && x.TrangThai == "DaDuyet");
        var pending = roundId == null ? 0 : await _db.DangKyThucTaps.CountAsync(x => x.MaDot == roundId && x.TrangThai == "ChoDuyet");
        var assignedStudents = await _db.GVHuongDans.AsNoTracking().Where(x => x.TrangThai == "DangHuongDan").Select(x => x.MaSinhVien).Distinct().CountAsync();
        var assigned = assignedStudents;
        var reportsPending = roundId == null ? 0 : await _db.TienDoThucTaps.CountAsync(x => x.MaDot == roundId && x.TrangThaiDuyet == "DaNop");
        var companiesPending = await _db.CongTys.CountAsync(x => x.TrangThai == "ChoDuyet");
        return new { activeRound, totalStudents = students, approvedRegistrations = registrations, pendingRegistrations = pending, assignedSupervisors = assigned, unassignedSupervisors = Math.Max(0, students - assignedStudents), pendingReports = reportsPending, pendingCompanies = companiesPending, rounds };
    }

    public async Task<object> RegistrationsAsync(string? maDot)
    {
        var q = from r in _db.DangKyThucTaps.AsNoTracking()
                join s in _db.SinhViens.AsNoTracking() on r.MaSinhVien equals s.MaSV
                join c in _db.CongTys.AsNoTracking() on r.MaCongTy equals c.MaCongTy
                join d in _db.DotThucTaps.AsNoTracking() on r.MaDot equals d.MaSo
                select new { r.MaDangKy, r.MaSinhVien, sinhVien = s.HoTen, s.Lop, r.MaCongTy, congTy = c.TenCongTy, c.ViTriTuyen, r.MaDot, dot = d.TenDot, r.NgayDangKy, r.ThuTuUuTien, r.TrangThai };
        if (!string.IsNullOrWhiteSpace(maDot)) q = q.Where(x => x.MaDot == maDot);
        return await q.OrderBy(x => x.TrangThai).ThenBy(x => x.NgayDangKy).ToListAsync();
    }

    public async Task ApproveRegistrationAsync(string id, RegistrationApprovalRequest request)
    {
        if (request.TrangThai is not ("DaDuyet" or "TuChoi" or "ChoDuyet")) throw new InvalidOperationException("Trạng thái đăng ký không hợp lệ.");
        var registration = await _db.DangKyThucTaps.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy nguyện vọng.");
        if (request.TrangThai == "DaDuyet")
        {
            var company = await _db.CongTys.FindAsync(registration.MaCongTy);
            if (company?.TrangThai != "DaDuyet") throw new InvalidOperationException("Chỉ có thể duyệt nguyện vọng vào doanh nghiệp đã được duyệt.");
        }
        registration.TrangThai = request.TrangThai;
        await _db.SaveChangesAsync();
    }

    public async Task<object> AssignmentsAsync(string? maDot)
    {
        var query = from s in _db.SinhViens.AsNoTracking()
                    join a in _db.GVHuongDans.AsNoTracking().Where(x => x.TrangThai == "DangHuongDan") on s.MaSV equals a.MaSinhVien into assignments
                    from a in assignments.DefaultIfEmpty()
                    join g in _db.GiangViens.AsNoTracking() on a!.MaGiangVien equals g.MaGV into matchedLecturers
                    from g in matchedLecturers.DefaultIfEmpty()
                    join r in _db.DangKyThucTaps.AsNoTracking().Where(x => x.TrangThai == "DaDuyet") on s.MaSV equals r.MaSinhVien into registrations
                    from r in registrations.DefaultIfEmpty()
                    join c in _db.CongTys.AsNoTracking() on r!.MaCongTy equals c.MaCongTy into companies
                    from c in companies.DefaultIfEmpty()
                    select new { s.MaSV, s.HoTen, s.Lop, s.ChuyenNganh, maGiangVien = g == null ? null : g.MaGV, giangVien = g == null ? null : g.HoTen, maDot = r == null ? null : r.MaDot, congTy = c == null ? null : c.TenCongTy };
        if (!string.IsNullOrWhiteSpace(maDot)) query = query.Where(x => x.maDot == maDot);
        var rows = await query.OrderBy(x => x.HoTen).ToListAsync();
        var lecturers = await _db.GiangViens.AsNoTracking().Select(g => new { g.MaGV, g.HoTen, g.ChuyenMon, assignedCount = _db.GVHuongDans.Count(a => a.MaGiangVien == g.MaGV && a.TrangThai == "DangHuongDan") }).OrderBy(g => g.HoTen).ToListAsync();
        return new { students = rows, lecturers, assigned = rows.Count(x => x.maGiangVien != null), unassigned = rows.Count(x => x.maGiangVien == null) };
    }

    public async Task AssignSupervisorAsync(string maSV, SupervisorAssignmentRequest request)
    {
        if (!await _db.SinhViens.AnyAsync(x => x.MaSV == maSV)) throw new KeyNotFoundException("Không tìm thấy sinh viên.");
        var lecturer = await _db.GiangViens.FindAsync(request.MaGiangVien) ?? throw new KeyNotFoundException("Không tìm thấy giảng viên.");
        var activeCount = await _db.GVHuongDans.CountAsync(x => x.MaGiangVien == request.MaGiangVien && x.TrangThai == "DangHuongDan" && x.MaSinhVien != maSV);
        if (activeCount >= 15) throw new InvalidOperationException("Giảng viên đã đạt định mức tối đa 15 sinh viên.");
        var assignment = await _db.GVHuongDans.FirstOrDefaultAsync(x => x.MaSinhVien == maSV && x.TrangThai == "DangHuongDan");
        var previousLecturer = assignment?.MaGiangVien;
        if (assignment == null) _db.GVHuongDans.Add(new GVHuongDan { MaSo = $"GVHD{Guid.NewGuid():N}"[..20], MaSinhVien = maSV, MaGiangVien = lecturer.MaGV, NgayPC = DateTime.Today, TrangThai = "DangHuongDan" });
        else assignment.MaGiangVien = lecturer.MaGV;
        lecturer.SoLuongSVHD = activeCount + 1;
        if (previousLecturer != null && previousLecturer != lecturer.MaGV)
        {
            var previous = await _db.GiangViens.FindAsync(previousLecturer);
            if (previous != null) previous.SoLuongSVHD = await _db.GVHuongDans.CountAsync(x => x.MaGiangVien == previousLecturer && x.TrangThai == "DangHuongDan") - 1;
        }
        await _db.SaveChangesAsync();
    }

    public async Task<object> ProgressAsync(string? maDot)
    {
        var query = from p in _db.TienDoThucTaps.AsNoTracking()
                    join s in _db.SinhViens.AsNoTracking() on p.MaSinhVien equals s.MaSV
                    join d in _db.DotThucTaps.AsNoTracking() on p.MaDot equals d.MaSo
                    select new { p.MaTienDo, p.MaSinhVien, sinhVien = s.HoTen, s.Lop, p.MaDot, dot = d.TenDot, p.MocThoiGian, p.NoiDungBaoCao, p.NgayNop, p.TrangThaiDuyet };
        if (!string.IsNullOrWhiteSpace(maDot)) query = query.Where(x => x.MaDot == maDot);
        var reports = await query.OrderBy(x => x.MocThoiGian).ThenBy(x => x.sinhVien).ToListAsync();
        return new { reports, total = reports.Count, submitted = reports.Count(x => x.TrangThaiDuyet != "ChuaNop"), approved = reports.Count(x => x.TrangThaiDuyet == "DaDuyet"), pending = reports.Count(x => x.TrangThaiDuyet == "DaNop"), revision = reports.Count(x => x.TrangThaiDuyet == "YeuCauSua"), missing = reports.Count(x => x.TrangThaiDuyet == "ChuaNop") };
    }

    public async Task<object> DeadlinesAsync(string? maDot)
    {
        var q = _db.TienDoThucTaps.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(maDot)) q = q.Where(x => x.MaDot == maDot);
        return await q.GroupBy(x => new { x.MaDot, x.MocThoiGian })
            .Select(g => new { g.Key.MaDot, g.Key.MocThoiGian, reportCount = g.Count(), submitted = g.Count(x => x.TrangThaiDuyet != "ChuaNop"), approved = g.Count(x => x.TrangThaiDuyet == "DaDuyet"), overdue = g.Count(x => x.TrangThaiDuyet == "ChuaNop" && x.MocThoiGian < DateTime.Today) })
            .OrderBy(x => x.MocThoiGian).ToListAsync();
    }

    public async Task UpdateDeadlineAsync(string maDot, DeadlineUpdateRequest request)
    {
        var oldDate = request.HanCu.Date;
        var newDate = request.HanMoi.Date;
        if (newDate < DateTime.Today) throw new InvalidOperationException("Hạn báo cáo mới không thể là ngày đã qua.");
        var reports = await _db.TienDoThucTaps.Where(x => x.MaDot == maDot && x.MocThoiGian == oldDate).ToListAsync();
        if (reports.Count == 0) throw new KeyNotFoundException("Không tìm thấy mốc báo cáo.");
        foreach (var report in reports) report.MocThoiGian = newDate;
        await _db.SaveChangesAsync();
    }

    public async Task ApproveProgressAsync(string id, ReportApprovalRequest request)
    {
        if (request.TrangThai is not ("DaDuyet" or "YeuCauSua")) throw new InvalidOperationException("Chỉ được duyệt báo cáo hoặc yêu cầu sinh viên sửa báo cáo.");
        var report = await _db.TienDoThucTaps.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy báo cáo tiến độ.");
        if (report.TrangThaiDuyet == "ChuaNop") throw new InvalidOperationException("Sinh viên chưa nộp báo cáo này.");
        report.TrangThaiDuyet=request.TrangThai; await _db.SaveChangesAsync();
    }

    public async Task CreateStudentAsync(CreateStudentRequest r)
    {
        _db.SinhViens.Add(new InternshipManagement.DAL.Entities.SinhVien{ MaSV =r.MaSV, HoTen=r.HoTen, Lop=r.Lop ?? "", KhoaHoc=r.KhoaHoc ?? "", Gpa=r.Gpa ?? 0, KyNang=r.KyNang ?? "", ChuyenNganh=r.ChuyenNganh ?? "", CongNghe=r.CongNghe ?? "", DuAnDaThucHien=r.DuAnDaThucHien ?? "" });
        await _db.SaveChangesAsync();
    }
    public async Task UpdateStudentAsync(string id, CreateStudentRequest r)
    {
        var x = await _db.SinhViens.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy sinh viên.");
        x.HoTen=r.HoTen; x.Lop=r.Lop ?? ""; x.KhoaHoc=r.KhoaHoc ?? ""; x.Gpa=r.Gpa ?? 0; x.KyNang=r.KyNang ?? ""; x.ChuyenNganh=r.ChuyenNganh ?? ""; x.CongNghe=r.CongNghe ?? ""; x.DuAnDaThucHien=r.DuAnDaThucHien ?? "";
        await _db.SaveChangesAsync();
    }
    public async Task CreateLecturerAsync(CreateLecturerRequest r)
    {
        _db.GiangViens.Add(new GiangVien { MaGV=r.MaGV, HoTen=r.HoTen, ChuyenMon=r.ChuyenMon ?? "", SoLuongSVHD=0 });
        await _db.SaveChangesAsync();
    }
    public async Task UpdateLecturerAsync(string id, CreateLecturerRequest r)
    {
        var x = await _db.GiangViens.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy giảng viên.");
        x.HoTen=r.HoTen; x.ChuyenMon=r.ChuyenMon ?? ""; await _db.SaveChangesAsync();
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
