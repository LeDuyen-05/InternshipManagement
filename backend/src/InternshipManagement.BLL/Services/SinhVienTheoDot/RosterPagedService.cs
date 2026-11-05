using InternshipManagement.BLL.DTOs.SinhVienTheoDot;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.SinhVienTheoDot;

public record RosterQuery(string MaDot, string? Search = null, string? Lop = null, string? TrangThai = null,
    string? Nguon = null, bool CanHoTro = false, int Page = 1, int PageSize = 20);
public record RosterPage(string MaDot, string TenDot, int TongSinhVien, int TuDanhSachKhoa, int TuNghiepVu,
    int CanHoTro, int DaPhanBoChinhThuc, List<NhomSinhVienTheoDotDto> ThongKe, List<SinhVienTheoDotDto> SinhViens,
    int TotalCount, int Page, int PageSize, List<string> Lops);

public partial class SinhVienTheoDotService
{
    public async Task<RosterPage> GetPagedAsync(RosterQuery filter, CancellationToken ct = default)
    {
        if (filter.Page is < 1 or > 1_000_000 || filter.PageSize is < 1 or > 100)
            throw new ArgumentException("Trang phải dương; số dòng mỗi trang từ 1 đến 100.");
        if (filter.Search?.Length > 200 || filter.Lop?.Length > 50
            || filter.TrangThai != null && !Groups.Any(x => x.Code == filter.TrangThai)
            || filter.Nguon is not (null or "khoa" or "nghiepvu"))
            throw new ArgumentException("Bộ lọc danh sách sinh viên không hợp lệ.");
        var round = await RequireRound(filter.MaDot);
        var studentIds = StudentIds(filter.MaDot);
        var all = RosterReadQuery.Build(db, studentIds, round, Today);
        var buckets = await all.GroupBy(x => new { x.TrangThai, x.TuDanhSachKhoa, x.CoPhanBoChinhThuc, x.CanHoTro })
            .Select(g => new { g.Key.TrangThai, g.Key.TuDanhSachKhoa, g.Key.CoPhanBoChinhThuc, g.Key.CanHoTro, Count = g.Count() }).ToListAsync(ct);
        var total = buckets.Sum(x => x.Count);
        var manual = buckets.Where(x => x.TuDanhSachKhoa).Sum(x => x.Count);
        var official = buckets.Where(x => x.CoPhanBoChinhThuc).Sum(x => x.Count);
        var support = buckets.Where(x => x.CanHoTro).Sum(x => x.Count);
        var groups = Groups.Select(g => new NhomSinhVienTheoDotDto(g.Code, g.Name,
            buckets.Where(x => x.TrangThai == g.Code).Sum(x => x.Count))).ToList();
        var classes = await all.Where(x => x.Lop != null && x.Lop != "").Select(x => x.Lop!).Distinct().OrderBy(x => x).ToListAsync(ct);
        var query = all;
        if (!string.IsNullOrWhiteSpace(filter.Search)) {
            var keyword = filter.Search.Trim().ToLower();
            query = query.Where(x => x.MaSV.ToLower().Contains(keyword) || x.HoTen.ToLower().Contains(keyword)
                || x.Lop != null && x.Lop.ToLower().Contains(keyword) || x.TenCongTy != null && x.TenCongTy.ToLower().Contains(keyword));
        }
        if (!string.IsNullOrWhiteSpace(filter.Lop)) query = query.Where(x => x.Lop == filter.Lop);
        if (filter.TrangThai != null) query = query.Where(x => x.TrangThai == filter.TrangThai);
        if (filter.Nguon != null) query = query.Where(x => x.TuDanhSachKhoa == (filter.Nguon == "khoa"));
        if (filter.CanHoTro) query = query.Where(x => x.CanHoTro);
        var unfiltered = string.IsNullOrWhiteSpace(filter.Search) && string.IsNullOrWhiteSpace(filter.Lop)
            && filter.TrangThai == null && filter.Nguon == null && !filter.CanHoTro;
        var count = unfiltered ? total : await query.CountAsync(ct);
        var page = Math.Min(filter.Page, Math.Max(1, (int)Math.Ceiling(count / (double)filter.PageSize)));
        // Default paging needs only membership keys. Sorting/offsetting the full classification
        // query makes SQL repeat expensive placement aggregates for every skipped student.
        var keyQuery = unfiltered
            ? db.SinhViens.Where(s => studentIds.Contains(s.MaSV)).Select(s => s.MaSV)
            : query.Select(x => x.MaSV);
        var keys = await keyQuery.OrderBy(x => x).Skip((page - 1) * filter.PageSize).Take(filter.PageSize).ToListAsync(ct);
        var rows = keys.Count == 0 ? [] : (await GetAsync(filter.MaDot, keys)).SinhViens;
        return new(filter.MaDot, round.TenDot, total, manual, total - manual, support, official, groups, rows,
            count, page, filter.PageSize, classes);
    }
}
