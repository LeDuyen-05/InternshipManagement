using System.Data;
using System.Text.RegularExpressions;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.Admin;

public record CreateRubricRequest(string MaRubric, string TenBo, string MaLoaiThucTap, int PhienBan = 1, string? SaoChepTu = null);
public record RubricVersionRequest(int PhienBanCapNhat);

public class RubricService(AppDbContext db, TimeProvider clock)
{
    public async Task<object> ListAsync(string? maLoai) => await db.BoTieuChis.AsNoTracking()
        .Where(x => maLoai == null ? x.MaLoaiThucTap != null : x.MaLoaiThucTap == maLoai).OrderBy(x => x.MaLoaiThucTap).ThenBy(x => x.MaRubric)
        .Select(x => new { x.MaRubric, x.TenBo, x.MaLoaiThucTap, x.PhienBan, x.TrangThai, x.PhienBanCapNhat,
            x.NgayTao, x.NgayPhatHanh, SoTieuChi = db.TieuChis.Count(c => c.MaRubric == x.MaRubric && c.NhomDanhGia != null) }).ToListAsync();

    public async Task<object> DetailAsync(string id)
    {
        var bo = await db.BoTieuChis.AsNoTracking().SingleOrDefaultAsync(x => x.MaRubric == id)
            ?? throw new KeyNotFoundException("Không tìm thấy bộ tiêu chí.");
        var criteria = await db.TieuChis.AsNoTracking().Where(x => x.MaRubric == id && x.NhomDanhGia != null).OrderBy(x => x.ThuTu).ToListAsync();
        return new { BoTieuChi = bo, TieuChis = criteria, TongGV = criteria.Where(x => x.NhomDanhGia == "GV").Sum(x => x.DiemToiDa),
            TongDN = criteria.Where(x => x.NhomDanhGia == "DN").Sum(x => x.DiemToiDa), TongDiem = criteria.Sum(x => x.DiemToiDa) };
    }

    public async Task CreateAsync(CreateRubricRequest request, string actor)
    {
        if (string.IsNullOrWhiteSpace(request.MaRubric) || !Regex.IsMatch(request.MaRubric, "^[A-Z0-9_]{1,12}$") || string.IsNullOrWhiteSpace(request.TenBo)
            || request.TenBo.Length > 200 || request.PhienBan < 1)
            throw new ArgumentException("Mã bộ gồm 1–12 chữ in hoa, số hoặc dấu gạch dưới; tên tối đa 200 ký tự và phiên bản phải dương.");
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        if (!await db.LoaiThucTaps.AnyAsync(x => x.MaLoai == request.MaLoaiThucTap && x.HoatDong))
            throw new ArgumentException("Loại thực tập không tồn tại hoặc đã ngừng sử dụng.");
        if (await db.BoTieuChis.AnyAsync(x => x.MaRubric == request.MaRubric)) throw new ArgumentException("Mã bộ đã tồn tại.");
        var copies = new List<TieuChi>();
        if (request.SaoChepTu != null)
        {
            if (!await db.BoTieuChis.AnyAsync(x => x.MaRubric == request.SaoChepTu)) throw new KeyNotFoundException("Không tìm thấy bộ nguồn.");
            var source = await db.TieuChis.AsNoTracking().Where(x => x.MaRubric == request.SaoChepTu && x.NhomDanhGia != null).ToListAsync();
            copies = source.Select(x => new TieuChi { MaTieuChi = request.MaRubric + "_" + x.MaCLO,
                MaRubric = request.MaRubric, MaCLO = x.MaCLO, TenTieuChi = x.TenTieuChi,
                DiemToiDa = x.DiemToiDa, NhomDanhGia = x.NhomDanhGia, ThuTu = x.ThuTu }).ToList();
            if (copies.Any(x => x.MaTieuChi.Length > 20) || copies.Select(x => x.MaTieuChi).Distinct().Count() != copies.Count)
                throw new ArgumentException("Mã bộ và CLO nguồn tạo mã tiêu chí trùng hoặc vượt 20 ký tự; chọn mã bộ ngắn hơn.");
        }
        db.BoTieuChis.Add(new() { MaRubric = request.MaRubric, TenBo = request.TenBo.Trim(), MaLoaiThucTap = request.MaLoaiThucTap,
            PhienBan = request.PhienBan, NguoiTao = actor, NgayTao = clock.GetUtcNow() });
        db.TieuChis.AddRange(copies);
        await db.SaveChangesAsync(); if (tx != null) await tx.CommitAsync();
    }

    /// <summary>
    /// Bộ đã ban hành là văn bản chính thức: chỉ sửa được mô tả/thứ tự. Đổi điểm, nhóm, CLO hoặc thêm/xóa tiêu chí
    /// (<paramref name="doiCauTruc"/>) phải sao chép thành phiên bản mới để không làm lệch thang điểm đang áp dụng.
    /// </summary>
    public static async Task RequireDraftAsync(AppDbContext db, string id, bool doiCauTruc = true)
    {
        var item = await db.BoTieuChis.SingleOrDefaultAsync(x => x.MaRubric == id)
            ?? throw new ArgumentException("Tạo bộ tiêu chí trước khi thêm/sửa tiêu chí.");
        if (item.TrangThai == "NgungApDung") throw new InvalidOperationException("Bộ tiêu chí đã ngừng áp dụng.");
        if (item.TrangThai == "PhatHanh" && doiCauTruc)
            throw new InvalidOperationException("Bộ tiêu chí đã ban hành: chỉ sửa được mô tả và thứ tự. Muốn đổi điểm, thêm hoặc xóa tiêu chí, hãy sao chép thành phiên bản mới.");
        item.PhienBanCapNhat++;
    }

    public async Task SetStatusAsync(string id, RubricVersionRequest request, string status, string actor)
    {
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var item = await db.BoTieuChis.SingleOrDefaultAsync(x => x.MaRubric == id) ?? throw new KeyNotFoundException("Không tìm thấy bộ tiêu chí.");
        if (item.PhienBanCapNhat != request.PhienBanCapNhat) throw new DbUpdateConcurrencyException();
        if (status == "PhatHanh")
        {
            if (item.TrangThai != "Nhap") throw new InvalidOperationException("Chỉ phát hành bộ nháp.");
            if (!await db.LoaiThucTaps.AnyAsync(x => x.MaLoai == item.MaLoaiThucTap && x.HoatDong)) throw new ArgumentException("Loại thực tập không hợp lệ.");
            var criteria = await db.TieuChis.AsNoTracking().Where(x => x.MaRubric == id && x.NhomDanhGia != null).ToListAsync();
            Validate(criteria);
            item.NguoiPhatHanh = actor; item.NgayPhatHanh = clock.GetUtcNow();
        }
        else if (status != "NgungApDung" || item.TrangThai != "PhatHanh") throw new InvalidOperationException("Chỉ ngừng áp dụng bộ đã phát hành.");
        item.TrangThai = status; item.PhienBanCapNhat++;
        await db.SaveChangesAsync(); if (tx != null) await tx.CommitAsync();
    }

    public static void Validate(IReadOnlyList<TieuChi> criteria)
    {
        if (criteria.Count == 0 || criteria.Select(x => x.MaCLO.ToUpperInvariant()).Distinct().Count() != criteria.Count
            || criteria.Any(x => string.IsNullOrWhiteSpace(x.MaCLO) || x.DiemToiDa <= 0 || decimal.Round(x.DiemToiDa, 2) != x.DiemToiDa
                || x.ThuTu < 1 || x.NhomDanhGia is not ("GV" or "DN"))
            || criteria.Select(x => x.ThuTu).Distinct().Count() != criteria.Count
            || criteria.Where(x => x.NhomDanhGia == "GV").Sum(x => x.DiemToiDa) != 5
            || criteria.Where(x => x.NhomDanhGia == "DN").Sum(x => x.DiemToiDa) != 5
            || criteria.Count(x => x.NhomDanhGia == "DN") != 2
            || !criteria.Any(x => x.NhomDanhGia == "DN" && x.MaCLO == "CLO4.1" && x.DiemToiDa == 2)
            || !criteria.Any(x => x.NhomDanhGia == "DN" && x.MaCLO == "CLO4.2" && x.DiemToiDa == 3))
            throw new ArgumentException("Bộ phải có CLO/thứ tự duy nhất, điểm hợp lệ; GV 5 điểm, DN gồm CLO4.1=2 và CLO4.2=3.");
    }

    public static async Task ValidateRoundRubricAsync(AppDbContext db, string? type, string? rubric)
    {
        if (string.IsNullOrWhiteSpace(type) || string.IsNullOrWhiteSpace(rubric)) throw new ArgumentException("Chọn loại thực tập và bộ tiêu chí.");
        if (!await db.LoaiThucTaps.AnyAsync(x => x.MaLoai == type && x.HoatDong)
            || !await db.BoTieuChis.AnyAsync(x => x.MaRubric == rubric && x.MaLoaiThucTap == type && x.TrangThai == "PhatHanh"))
            throw new ArgumentException("Bộ tiêu chí phải đã phát hành và thuộc đúng loại thực tập đang hoạt động.");
    }
}

