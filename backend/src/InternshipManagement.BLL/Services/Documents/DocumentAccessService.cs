using InternshipManagement.BLL.Common;
using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.Documents;

public record DocumentActor(string Id, string Role, string? Student = null, string? Lecturer = null, string? Representative = null);
public record DocumentResource(string Id, string Label, string? RoundId);
public class DocumentStorageUnavailableException : Exception;

public class DocumentAccessService(AppDbContext db, TimeProvider clock)
{
    public static readonly string[] Kinds = ["CV", "Progress", "SelfPlacement", "PlacementEvidence", "EnterpriseForm", "Notification", "Template"];
    public static IReadOnlyList<string> KindsFor(string role) => role switch {
        "Khoa" => Kinds,
        "GiangVien" or "SinhVien" => ["CV", "Progress", "SelfPlacement", "PlacementEvidence", "EnterpriseForm", "Notification", "Template"],
        "DaiDienDN" => ["CV", "EnterpriseForm", "Notification", "Template"],
        _ => []
    };
    private static bool Faculty(DocumentActor a) => a.Role == "Khoa";
    private async Task<bool> StudentRead(DocumentActor a, string student, string? round, bool companyCv = false)
    {
        if (Faculty(a) || (a.Role == "SinhVien" && a.Student == student)) return true;
        if (a.Role == "GiangVien") return await db.GVHuongDans.AnyAsync(x => x.MaGiangVien == a.Lecturer && x.MaSinhVien == student
            && x.TrangThai == "DangHuongDan" && (round == null || x.MaDot == round));
        if (companyCv && a.Role == "DaiDienDN") {
            var company = await Company(a);
            return await db.DangKyThucTaps.AnyAsync(x => x.MaSV == student && x.MaCongTy == company
                && (x.TrangThai == "ChoDuyet" || x.TrangThai == "DaDuyet") && x.DotThucTap.TrangThai == "DangDienRa")
                || await db.PhanBoThucTaps.AnyAsync(x => x.MaSinhVien == student && x.MaCongTy == company && x.TrangThai != "Huy" && x.DaDuocKhoaDuyet);
        }
        return false;
    }
    private async Task<string?> Company(DocumentActor a) => a.Role == "DaiDienDN"
        ? await db.DaiDienDoanhNghieps.Where(x => x.MaSo == a.Representative).Select(x => x.MaCongTy).SingleOrDefaultAsync() : null;

    public async Task<DocumentResource> RequireAsync(string kind, string id, DocumentActor a, bool write)
    {
        if (string.IsNullOrWhiteSpace(a.Id) || !Kinds.Contains(kind) || string.IsNullOrWhiteSpace(id) || id.Length > 40) throw new ArgumentException("Loại/mã hồ sơ không hợp lệ.");
        string? round = null; string label; bool read = false, edit = false;
        switch (kind) {
            case "CV":
                var student = await db.SinhViens.AsNoTracking().SingleOrDefaultAsync(x => x.MaSV == id)
                    ?? throw new KeyNotFoundException($"Không tìm thấy sinh viên có mã '{id}'.");
                label = student.HoTen; read = await StudentRead(a, id, null, true); edit = Faculty(a) || (a.Role == "SinhVien" && a.Student == id); break;
            case "Progress":
                var report = await db.TienDoThucTaps.AsNoTracking().Include(x => x.DotThucTap).SingleOrDefaultAsync(x => x.MaTienDo == id)
                    ?? throw new KeyNotFoundException($"Không tìm thấy báo cáo tiến độ có mã '{id}'.");
                round = report.MaDot; label = $"{report.MaSV} · {report.MocThoiGian:dd/MM/yyyy}"; read = await StudentRead(a, report.MaSV, round);
                edit = a.Role == "SinhVien" && a.Student == report.MaSV && report.MaPhanBoLuuTru == null
                    && report.TrangThaiDuyet is "ChuaNop" or "YeuCauSua" && !InternshipDeadlinePolicy.SubmissionClosed(report, clock.GetUtcNow())
                    && await db.PhanBoThucTaps.AnyAsync(x => x.MaSinhVien == report.MaSV && x.MaDot == round && x.DaDuocKhoaDuyet && x.TrangThai == "DangThucTap"); break;
            case "SelfPlacement":
                var self = await db.DeXuatThucTapTuTims.AsNoTracking().SingleOrDefaultAsync(x => x.MaHoSo == id)
                    ?? throw new KeyNotFoundException($"Không tìm thấy hồ sơ thực tập tự tìm có mã '{id}'.");
                round = self.MaDot; label = $"{self.MaSV} · {self.TenCongTy}"; read = await StudentRead(a, self.MaSV, round);
                edit = Faculty(a) || (a.Role == "SinhVien" && a.Student == self.MaSV && self.TrangThai == "ChoDuyet"); break;
            case "PlacementEvidence": case "EnterpriseForm":
                var place = await db.PhanBoThucTaps.AsNoTracking().Include(x => x.CongTy).Include(x => x.DotThucTap).SingleOrDefaultAsync(x => x.MaPhanBo == id)
                    ?? throw new KeyNotFoundException($"Không tìm thấy phân bổ thực tập có mã '{id}'.");
                round = place.MaDot; label = $"{place.MaSinhVien} · {place.CongTy.TenCongTy} · {place.TrangThai}";
                var ownCompany = kind == "EnterpriseForm" && a.Role == "DaiDienDN" && place.MaCongTy == await Company(a);
                read = await StudentRead(a, place.MaSinhVien, round) || ownCompany;
                edit = kind == "PlacementEvidence" ? Faculty(a)
                    : (Faculty(a) || ownCompany) && place.DaDuocKhoaDuyet && place.TrangThai is "DangThucTap" or "HoanThanh"
                        && InternshipDeadlinePolicy.GradeBlock(place.DotThucTap, true, clock.GetUtcNow()) == null; break;
            case "Notification":
                var notice = await db.ThongBaos.AsNoTracking().SingleOrDefaultAsync(x => x.MaThongBao == id)
                    ?? throw new KeyNotFoundException($"Không tìm thấy thông báo có mã '{id}'.");
                label = notice.TieuDe; read = NotificationAudience.CanRead(a.Role, notice.DoiTuong); edit = Faculty(a); break;
            default:
                if (id != "GLOBAL") throw new KeyNotFoundException($"Mã bộ biểu mẫu không hợp lệ: '{id}'.");
                label = "Biểu mẫu thực tập dùng chung"; read = NotificationAudience.Code(a.Role) != "NONE"; edit = Faculty(a); break;
        }
        if (!read || (write && !edit)) throw new UnauthorizedAccessException("Không có quyền thao tác tệp của hồ sơ hoặc đã hết hạn/trạng thái không cho sửa.");
        if (write && round != null) {
            var state = await db.ChotDotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaDot == round);
            var reopenedReport = kind == "Progress" && state?.TrangThai == "MoLai" && state.HanMoLai.HasValue && clock.GetUtcNow() < state.HanMoLai;
            if (state != null && state.TrangThai != "ChuaChot" && !reopenedReport)
                throw new RoundLockedException("Đợt đã chốt/khóa. Chỉ bổ sung minh chứng báo cáo khi được mở lại đúng hạn và báo cáo còn quyền sửa.");
            if (!reopenedReport && !await db.DotThucTaps.AnyAsync(x => x.MaSo == round && (x.TrangThai == "ChuaBatDau" || x.TrangThai == "DangDienRa"))) throw new InvalidOperationException("Đợt không còn mở bổ sung tệp.");
        }
        return new(id, label, round);
    }

    public async Task<object> ResourcesAsync(string kind, string? round, string? search, int page, DocumentActor a)
    {
        if (!Kinds.Contains(kind) || page is < 1 or > 10000 || search?.Length > 100) throw new ArgumentException("Bộ lọc tài liệu không hợp lệ.");
        if (kind == "Template") return new { items = new[] { await RequireAsync(kind, "GLOBAL", a, false) }, page = 1, hasMore = false };
        if (kind is not ("CV" or "Notification") && string.IsNullOrWhiteSpace(round)) throw new ArgumentException("Chọn đợt để xem hồ sơ.");
        var company = await Company(a);
        IQueryable<string> students = a.Role switch {
            "Khoa" => db.SinhViens.Select(x => x.MaSV),
            "SinhVien" => db.SinhViens.Where(x => x.MaSV == a.Student).Select(x => x.MaSV),
            "GiangVien" => db.GVHuongDans.Where(x => x.MaGiangVien == a.Lecturer && x.TrangThai == "DangHuongDan" && (round == null || x.MaDot == round)).Select(x => x.MaSinhVien),
            "DaiDienDN" => db.SinhViens.Where(s => db.DangKyThucTaps.Any(x => x.MaSV == s.MaSV && x.MaCongTy == company && (x.TrangThai == "ChoDuyet" || x.TrangThai == "DaDuyet") && x.DotThucTap.TrangThai == "DangDienRa")
                || db.PhanBoThucTaps.Any(x => x.MaSinhVien == s.MaSV && x.MaCongTy == company && x.TrangThai != "Huy" && x.DaDuocKhoaDuyet)).Select(x => x.MaSV),
            _ => db.SinhViens.Where(x => false).Select(x => x.MaSV)
        };
        var audience = NotificationAudience.Code(a.Role);
        // Filter rights before SQL pagination, then recheck each result using the download policy.
        var query = kind switch {
            "CV" => db.SinhViens.Where(x => students.Contains(x.MaSV)).Select(x => new { Id = x.MaSV, Label = x.HoTen, RoundId = (string?)null }),
            "Progress" => db.TienDoThucTaps.Where(x => x.MaDot == round && a.Role != "DaiDienDN" && students.Contains(x.MaSV)).Select(x => new { Id = x.MaTienDo, Label = x.MaSV + " · " + x.MaTienDo, RoundId = (string?)x.MaDot }),
            "SelfPlacement" => db.DeXuatThucTapTuTims.Where(x => x.MaDot == round && a.Role != "DaiDienDN" && students.Contains(x.MaSV)).Select(x => new { Id = x.MaHoSo, Label = x.MaSV + " · " + x.TenCongTy, RoundId = (string?)x.MaDot }),
            "Notification" => db.ThongBaos.Where(x => audience == "STAFF" || (audience != "NONE" && (x.DoiTuong == null || x.DoiTuong == "ALL" || x.DoiTuong == audience))).Select(x => new { Id = x.MaThongBao, Label = x.TieuDe, RoundId = (string?)null }),
            _ => db.PhanBoThucTaps.Where(x => x.MaDot == round && ((a.Role == "DaiDienDN" && kind == "EnterpriseForm" && x.MaCongTy == company) || (a.Role != "DaiDienDN" && students.Contains(x.MaSinhVien))))
                .Select(x => new { Id = x.MaPhanBo, Label = x.MaSinhVien + " · " + x.MaCongTy + " · " + x.TrangThai, RoundId = (string?)x.MaDot })
        };
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(x => x.Id.Contains(search) || x.Label.Contains(search));
        var candidates = await query.OrderBy(x => x.Id).Skip((page - 1) * 30).Take(31).ToListAsync();
        var result = new List<DocumentResource>();
        foreach (var candidate in candidates.Take(30)) {
            try { await RequireAsync(kind, candidate.Id, a, false); result.Add(new(candidate.Id, candidate.Label, candidate.RoundId)); } catch (UnauthorizedAccessException) { }
        }
        return new { items = result, page, hasMore = candidates.Count > 30 };
    }
}
