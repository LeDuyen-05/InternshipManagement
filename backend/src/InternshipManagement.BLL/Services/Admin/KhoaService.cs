using System.Text.RegularExpressions;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.Admin;

public record KhoaDto(string MaKhoa, string TenKhoa, bool HoatDong, int SoSinhVien, int SoGiangVien, int SoDot, int SoCanBo);
public record SaveKhoaRequest(string MaKhoa, string TenKhoa, bool HoatDong = true);

/// <summary>Danh mục khoa do Quản trị viên quản lý. Không xóa khoa để giữ lịch sử; muốn ngừng thì tắt hoạt động.</summary>
public partial class KhoaService(AppDbContext db)
{
    // Tối đa 10 ký tự để mã bộ tiêu chí/tiêu chí sinh từ mã khoa vẫn vừa cột (mã tiêu chí 20 ký tự).
    [GeneratedRegex("^[A-Z0-9_]{2,10}$")]
    private static partial Regex MaHopLe();

    public async Task<List<KhoaDto>> ListAsync(CancellationToken ct = default)
    {
        var sv = await db.SinhViens.IgnoreQueryFilters().GroupBy(x => x.MaKhoa).Select(g => new { g.Key, N = g.Count() }).ToListAsync(ct);
        var gv = await db.GiangViens.IgnoreQueryFilters().GroupBy(x => x.MaKhoa).Select(g => new { g.Key, N = g.Count() }).ToListAsync(ct);
        var dot = await db.DotThucTaps.IgnoreQueryFilters().GroupBy(x => x.MaKhoa).Select(g => new { g.Key, N = g.Count() }).ToListAsync(ct);
        var cb = await db.TaiKhoans.Where(x => x.MaVaiTro == "VT02").GroupBy(x => x.MaKhoa).Select(g => new { g.Key, N = g.Count() }).ToListAsync(ct);
        int Dem<T>(IEnumerable<T> rows, Func<T, string?> key, Func<T, int> n, string ma) => rows.Where(r => key(r) == ma).Sum(n);
        return (await db.Khoas.AsNoTracking().OrderBy(x => x.TenKhoa).ToListAsync(ct))
            .Select(k => new KhoaDto(k.MaKhoa, k.TenKhoa, k.HoatDong,
                Dem(sv, x => x.Key, x => x.N, k.MaKhoa), Dem(gv, x => x.Key, x => x.N, k.MaKhoa),
                Dem(dot, x => x.Key, x => x.N, k.MaKhoa), Dem(cb, x => x.Key, x => x.N, k.MaKhoa)))
            .ToList();
    }

    public async Task<KhoaDto> CreateAsync(SaveKhoaRequest request, CancellationToken ct = default)
    {
        var (ma, ten) = Validate(request);
        if (await db.Khoas.AnyAsync(x => x.MaKhoa == ma, ct)) throw new InvalidOperationException($"Mã khoa {ma} đã tồn tại.");
        if (await db.Khoas.AnyAsync(x => x.TenKhoa == ten, ct)) throw new InvalidOperationException("Tên khoa đã tồn tại.");
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(ct) : null;
        db.Khoas.Add(new Khoa { MaKhoa = ma, TenKhoa = ten, HoatDong = request.HoatDong });
        await db.SaveChangesAsync(ct);
        await TaoBoTieuChiMauAsync(ma, ct);
        if (tx != null) await tx.CommitAsync(ct);
        return (await ListAsync(ct)).Single(x => x.MaKhoa == ma);
    }

    public async Task<KhoaDto> UpdateAsync(string maKhoa, SaveKhoaRequest request, CancellationToken ct = default)
    {
        var (_, ten) = Validate(request with { MaKhoa = maKhoa });
        var khoa = await db.Khoas.SingleOrDefaultAsync(x => x.MaKhoa == maKhoa, ct) ?? throw new KeyNotFoundException("Không tìm thấy khoa.");
        if (await db.Khoas.AnyAsync(x => x.MaKhoa != maKhoa && x.TenKhoa == ten, ct)) throw new InvalidOperationException("Tên khoa đã tồn tại.");
        if (khoa.HoatDong && !request.HoatDong && !await db.Khoas.AnyAsync(x => x.MaKhoa != maKhoa && x.HoatDong, ct))
            throw new InvalidOperationException("Phải còn ít nhất một khoa đang hoạt động.");
        khoa.TenKhoa = ten;
        khoa.HoatDong = request.HoatDong;
        await db.SaveChangesAsync(ct);
        return (await ListAsync(ct)).Single(x => x.MaKhoa == maKhoa);
    }

    // Khoa mới nhận bản nháp của hai bộ tiêu chí chuẩn (TTNN, TTKS) để tự rà soát, chỉnh và ban hành trước khi mở đợt.
    private async Task TaoBoTieuChiMauAsync(string ma, CancellationToken ct)
    {
        var loai = await db.LoaiThucTaps.AsNoTracking().Where(x => x.HoatDong && (x.MaLoai == "TTNN" || x.MaLoai == "TTKS")).ToListAsync(ct);
        if (loai.Count == 0) return;
        foreach (var type in loai)
            db.BoTieuChis.Add(new BoTieuChi { MaRubric = $"{ma}_{type.MaLoai}_V1", TenBo = $"{type.TenLoai} (theo mẫu chuẩn)",
                MaLoaiThucTap = type.MaLoai, PhienBan = 1, TrangThai = "Nhap", NguoiTao = "QTV", NgayTao = DateTimeOffset.UtcNow, MaKhoa = ma });
        await db.SaveChangesAsync(ct);
        foreach (var type in loai)
            db.TieuChis.AddRange(InternshipManagement.DAL.Database.InternshipCatalogMigration.Criteria(type.MaLoai).Select(c => new TieuChi
            {
                MaTieuChi = $"{ma}_{type.MaLoai[2..]}_{c.MaCLO}", MaRubric = $"{ma}_{type.MaLoai}_V1", MaCLO = c.MaCLO,
                TenTieuChi = c.TenTieuChi, DiemToiDa = c.DiemToiDa, NhomDanhGia = c.NhomDanhGia, ThuTu = c.ThuTu
            }));
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Khoa hợp lệ cho dữ liệu mới: phải tồn tại và đang hoạt động. Null giữ nguyên để CSDL tự chọn khi chỉ có một khoa.</summary>
    public static async Task<string?> RequireActiveAsync(AppDbContext db, string? maKhoa, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(maKhoa)) return null;
        maKhoa = maKhoa.Trim().ToUpperInvariant();
        if (!await db.Khoas.AnyAsync(x => x.MaKhoa == maKhoa && x.HoatDong, ct))
            throw new InvalidOperationException("Khoa không tồn tại hoặc đã ngừng hoạt động.");
        return maKhoa;
    }

    private static (string Ma, string Ten) Validate(SaveKhoaRequest request)
    {
        var ma = request.MaKhoa?.Trim().ToUpperInvariant() ?? "";
        var ten = request.TenKhoa?.Trim() ?? "";
        if (!MaHopLe().IsMatch(ma)) throw new ArgumentException("Mã khoa gồm 2–10 ký tự chữ in hoa, số hoặc dấu gạch dưới (ví dụ CNTT, QTKD).");
        if (ten.Length is < 3 or > 200) throw new ArgumentException("Tên khoa từ 3 đến 200 ký tự.");
        return (ma, ten);
    }
}
