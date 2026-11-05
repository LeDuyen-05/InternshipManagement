using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.Admin;

public record AssignmentListQuery(string MaDot, string? Search = null, string? Lop = null, string? CongTy = null,
    string TrangThai = "all", string Gpa = "all", int Page = 1, int PageSize = 20);
public sealed class AssignmentStudentRow
{
    public string MaSV { get; set; } = "";
    public string HoTen { get; set; } = "";
    public string? Lop { get; set; }
    public string? ChuyenNganh { get; set; }
    public decimal? Gpa { get; set; }
    public string MaDot { get; set; } = "";
    public string? CongTy { get; set; }
    public string? TenCongTy => CongTy;
    public string? MaGiangVien { get; set; }
    public string? GiangVien { get; set; }
    public string? ChuyenMonGV { get; set; }
    public string? MaSo { get; set; }
    public DateTime? NgayPC { get; set; }
}

public sealed class AssignmentListService(AppDbContext db)
{
    private async Task Validate(AssignmentListQuery f, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(f.MaDot) || f.MaDot.Length > 20 || f.Page is < 1 or > 1_000_000 || f.PageSize is < 1 or > 100
            || f.Search?.Length > 200 || f.Lop?.Length > 50 || f.CongTy?.Length > 300
            || f.TrangThai is not ("all" or "assigned" or "unassigned") || f.Gpa is not ("all" or "high" or "low"))
            throw new ArgumentException("Bộ lọc danh sách phân công không hợp lệ.");
        if (!await db.DotThucTaps.AnyAsync(x => x.MaSo == f.MaDot, ct)) throw new KeyNotFoundException("Không tìm thấy đợt thực tập.");
    }

    private IQueryable<AssignmentStudentRow> Rows(string round)
    {
        var placements = db.PhanBoThucTaps.Where(x => x.MaDot == round && x.TrangThai != "Huy" && x.DaDuocKhoaDuyet);
        var assignments = db.GVHuongDans.Where(x => x.MaDot == round && x.TrangThai == "DangHuongDan");
        return db.SinhViens.AsNoTracking().Where(s => placements.Any(p => p.MaSinhVien == s.MaSV)).Select(s => new AssignmentStudentRow {
            MaSV = s.MaSV, HoTen = s.HoTen, Lop = s.Lop, ChuyenNganh = s.ChuyenNganh, Gpa = s.Gpa, MaDot = round,
            CongTy = placements.Where(p => p.MaSinhVien == s.MaSV).OrderByDescending(p => p.NgayPhanBo).ThenByDescending(p => p.MaPhanBo)
                .Select(p => p.TenCongTyXacNhan ?? p.CongTy.TenCongTy).FirstOrDefault(),
            MaGiangVien = assignments.Where(a => a.MaSinhVien == s.MaSV).OrderByDescending(a => a.NgayPC).ThenBy(a => a.MaSo).Select(a => a.MaGiangVien).FirstOrDefault(),
            GiangVien = assignments.Where(a => a.MaSinhVien == s.MaSV).OrderByDescending(a => a.NgayPC).ThenBy(a => a.MaSo).Select(a => a.GiangVien.HoTen).FirstOrDefault(),
            ChuyenMonGV = assignments.Where(a => a.MaSinhVien == s.MaSV).OrderByDescending(a => a.NgayPC).ThenBy(a => a.MaSo).Select(a => a.GiangVien.ChuyenMon).FirstOrDefault(),
            MaSo = assignments.Where(a => a.MaSinhVien == s.MaSV).OrderByDescending(a => a.NgayPC).ThenBy(a => a.MaSo).Select(a => a.MaSo).FirstOrDefault(),
            NgayPC = assignments.Where(a => a.MaSinhVien == s.MaSV).OrderByDescending(a => a.NgayPC).ThenBy(a => a.MaSo).Select(a => (DateTime?)a.NgayPC).FirstOrDefault()
        });
    }

    private static IQueryable<AssignmentStudentRow> Filter(IQueryable<AssignmentStudentRow> query, AssignmentListQuery f)
    {
        if (f.TrangThai == "assigned") query = query.Where(x => x.MaGiangVien != null);
        if (f.TrangThai == "unassigned") query = query.Where(x => x.MaGiangVien == null);
        if (!string.IsNullOrWhiteSpace(f.Lop)) query = query.Where(x => x.Lop == f.Lop);
        if (!string.IsNullOrWhiteSpace(f.CongTy)) query = query.Where(x => x.CongTy == f.CongTy);
        if (f.Gpa == "high") query = query.Where(x => x.Gpa >= 3.2m);
        if (f.Gpa == "low") query = query.Where(x => x.Gpa.HasValue && x.Gpa < 2.5m);
        if (!string.IsNullOrWhiteSpace(f.Search)) {
            var keyword = f.Search.Trim().ToLower();
            query = query.Where(x => x.MaSV.ToLower().Contains(keyword) || x.HoTen.ToLower().Contains(keyword)
                || x.Lop != null && x.Lop.ToLower().Contains(keyword) || x.CongTy != null && x.CongTy.ToLower().Contains(keyword)
                || x.GiangVien != null && x.GiangVien.ToLower().Contains(keyword));
        }
        return query;
    }

    public async Task<object> ListAsync(AssignmentListQuery f, CancellationToken ct = default)
    {
        await Validate(f, ct);
        var all = Rows(f.MaDot);
        var total = await all.CountAsync(ct);
        var assigned = await all.CountAsync(x => x.MaGiangVien != null, ct);
        var facets = f.TrangThai == "unassigned" ? all.Where(x => x.MaGiangVien == null) : all;
        var classes = await facets.Where(x => x.Lop != null && x.Lop != "").Select(x => x.Lop!).Distinct().OrderBy(x => x).ToListAsync(ct);
        var companies = await facets.Where(x => x.CongTy != null && x.CongTy != "").Select(x => x.CongTy!).Distinct().OrderBy(x => x).ToListAsync(ct);
        var query = Filter(all, f);
        var count = await query.CountAsync(ct);
        var page = Math.Min(f.Page, Math.Max(1, (int)Math.Ceiling(count / (double)f.PageSize)));
        var items = await query.OrderBy(x => x.HoTen).ThenBy(x => x.MaSV).Skip((page - 1) * f.PageSize).Take(f.PageSize).ToListAsync(ct);
        var lecturers = await db.GiangViens.AsNoTracking().OrderBy(x => x.HoTen).ThenBy(x => x.MaGV).Select(g => new {
            g.MaGV, g.HoTen, g.ChuyenMon, ChiTieu = g.ChiTieuHD, SoLuongSVHD = g.ChiTieuHD,
            SoLuongHienTai = db.GVHuongDans.Count(a => a.MaDot == f.MaDot && a.MaGiangVien == g.MaGV && a.TrangThai == "DangHuongDan"),
            AssignedCount = db.GVHuongDans.Count(a => a.MaDot == f.MaDot && a.MaGiangVien == g.MaGV && a.TrangThai == "DangHuongDan")
        }).ToListAsync(ct);
        return new { f.MaDot, Items = items, TotalCount = count, Page = page, f.PageSize, Total = total, Assigned = assigned,
            Unassigned = total - assigned, Lecturers = lecturers, Lops = classes, CongTys = companies };
    }

    public async Task<List<AssignmentStudentRow>> ExportRowsAsync(AssignmentListQuery f, CancellationToken ct = default)
    {
        await Validate(f, ct);
        var rows = await Filter(Rows(f.MaDot), f).OrderBy(x => x.HoTen).ThenBy(x => x.MaSV).Take(AdminListService.ExportLimit + 1).ToListAsync(ct);
        if (rows.Count > AdminListService.ExportLimit)
            throw new ArgumentException("Danh sách xuất vượt 10.000 sinh viên. Vui lòng lọc theo lớp hoặc đơn vị thực tập.");
        return rows;
    }
}
