using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.SinhVienTheoDot;

public record RosterCatalogQuery(string MaDot, string? Search = null, string? Lop = null, string? KhoaHoc = null,
    string? ChuyenNganh = null, bool AnDaTrongDot = true, int Page = 1, int PageSize = 20);

public partial class SinhVienTheoDotService
{
    public async Task<object> GetCatalogPagedAsync(RosterCatalogQuery filter, CancellationToken ct = default)
    {
        if (filter.Page is < 1 or > 1_000_000 || filter.PageSize is < 1 or > 100
            || filter.Search?.Length > 200 || filter.Lop?.Length > 50 || filter.KhoaHoc?.Length > 50 || filter.ChuyenNganh?.Length > 200)
            throw new ArgumentException("Bộ lọc danh mục sinh viên không hợp lệ.");
        await RequireRound(filter.MaDot);
        var students = db.SinhViens.AsNoTracking();
        var inRound = StudentIds(filter.MaDot);
        var classes = await students.Where(x => x.Lop != null && x.Lop != "").Select(x => x.Lop!).Distinct().OrderBy(x => x).ToListAsync(ct);
        var cohorts = await students.Where(x => x.KhoaHoc != null && x.KhoaHoc != "").Select(x => x.KhoaHoc!).Distinct().OrderBy(x => x).ToListAsync(ct);
        var majors = await students.Where(x => x.ChuyenNganh != null && x.ChuyenNganh != "").Select(x => x.ChuyenNganh!).Distinct().OrderBy(x => x).ToListAsync(ct);
        if (filter.AnDaTrongDot) students = students.Where(x => !inRound.Contains(x.MaSV));
        if (!string.IsNullOrWhiteSpace(filter.Lop)) students = students.Where(x => x.Lop == filter.Lop);
        if (!string.IsNullOrWhiteSpace(filter.KhoaHoc)) students = students.Where(x => x.KhoaHoc == filter.KhoaHoc);
        if (!string.IsNullOrWhiteSpace(filter.ChuyenNganh)) students = students.Where(x => x.ChuyenNganh == filter.ChuyenNganh);
        if (!string.IsNullOrWhiteSpace(filter.Search)) {
            var keyword = filter.Search.Trim().ToLower();
            students = students.Where(x => x.MaSV.ToLower().Contains(keyword) || x.HoTen.ToLower().Contains(keyword)
                || x.Lop != null && x.Lop.ToLower().Contains(keyword) || x.ChuyenNganh != null && x.ChuyenNganh.ToLower().Contains(keyword));
        }
        var total = await students.CountAsync(ct);
        var page = Math.Min(filter.Page, Math.Max(1, (int)Math.Ceiling(total / (double)filter.PageSize)));
        var items = await students.OrderBy(x => x.MaSV).Skip((page - 1) * filter.PageSize).Take(filter.PageSize)
            .Select(x => new { x.MaSV, x.HoTen, x.Lop, x.KhoaHoc, x.ChuyenNganh, DaTrongDot = inRound.Contains(x.MaSV) }).ToListAsync(ct);
        return new { filter.MaDot, Items = items, TotalCount = total, Page = page, filter.PageSize, Lops = classes, KhoaHocs = cohorts, ChuyenNganhs = majors };
    }

    public async Task<List<string>> PresentAsync(string maDot, List<string> codes, CancellationToken ct = default)
    {
        await RequireRound(maDot);
        if (codes == null || codes.Count > 500 || codes.Any(x => string.IsNullOrWhiteSpace(x) || x.Length > 20))
            throw new ArgumentException("Mỗi lần đối chiếu tối đa 500 MSSV hợp lệ.");
        var normalized = codes.Select(x => x.Trim().ToUpper()).Distinct().ToList();
        return await StudentIds(maDot).Where(x => normalized.Contains(x.ToUpper())).ToListAsync(ct);
    }
}
