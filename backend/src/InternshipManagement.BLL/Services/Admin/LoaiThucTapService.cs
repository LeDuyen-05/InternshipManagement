using System.Text.RegularExpressions;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Common;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.Admin;

public record SaveLoaiThucTapRequest(string MaLoai, string TenLoai, bool HoatDong = true);

/// <summary>
/// Danh mục loại thực tập dùng chung toàn trường (TTNN, TTKS, thực tập tốt nghiệp...). Khoa chọn loại khi tạo bộ tiêu chí và đợt.
/// Không xóa loại đã dùng để giữ lịch sử; ngừng sử dụng bằng cách tắt hoạt động.
/// </summary>
public partial class LoaiThucTapService(AppDbContext db)
{
    [GeneratedRegex("^[A-Z0-9_]{2,20}$")]
    private static partial Regex MaHopLe();

    public async Task<List<LoaiThucTap>> ListAsync(CancellationToken ct = default) =>
        await db.LoaiThucTaps.AsNoTracking().OrderBy(x => x.MaLoai).ToListAsync(ct);

    public async Task<LoaiThucTap> CreateAsync(SaveLoaiThucTapRequest request, CancellationToken ct = default)
    {
        var (ma, ten) = Validate(request);
        if (await db.LoaiThucTaps.AnyAsync(x => x.MaLoai == ma, ct)) throw new InvalidOperationException($"Mã loại thực tập {ma} đã tồn tại.");
        if (await db.LoaiThucTaps.AnyAsync(x => x.TenLoai == ten, ct)) throw new InvalidOperationException("Tên loại thực tập đã tồn tại.");
        var loai = new LoaiThucTap { MaLoai = ma, TenLoai = ten, HoatDong = request.HoatDong };
        db.LoaiThucTaps.Add(loai);
        await db.SaveChangesAsync(ct);
        TenLoaiThucTap.CapNhat(ma, ten);
        return loai;
    }

    public async Task<LoaiThucTap> UpdateAsync(string maLoai, SaveLoaiThucTapRequest request, CancellationToken ct = default)
    {
        var (_, ten) = Validate(request with { MaLoai = maLoai });
        var loai = await db.LoaiThucTaps.SingleOrDefaultAsync(x => x.MaLoai == maLoai, ct) ?? throw new KeyNotFoundException("Không tìm thấy loại thực tập.");
        if (await db.LoaiThucTaps.AnyAsync(x => x.MaLoai != maLoai && x.TenLoai == ten, ct)) throw new InvalidOperationException("Tên loại thực tập đã tồn tại.");
        if (loai.HoatDong && !request.HoatDong && !await db.LoaiThucTaps.AnyAsync(x => x.MaLoai != maLoai && x.HoatDong, ct))
            throw new InvalidOperationException("Phải còn ít nhất một loại thực tập đang sử dụng.");
        loai.TenLoai = ten;
        loai.HoatDong = request.HoatDong;
        await db.SaveChangesAsync(ct);
        TenLoaiThucTap.CapNhat(loai.MaLoai, ten);
        return loai;
    }

    private static (string Ma, string Ten) Validate(SaveLoaiThucTapRequest request)
    {
        var ma = request.MaLoai?.Trim().ToUpperInvariant() ?? "";
        var ten = request.TenLoai?.Trim() ?? "";
        if (!MaHopLe().IsMatch(ma)) throw new ArgumentException("Mã loại gồm 2–20 ký tự chữ in hoa, số hoặc dấu gạch dưới (ví dụ TTTN).");
        if (ten.Length is < 3 or > 100) throw new ArgumentException("Tên loại thực tập từ 3 đến 100 ký tự.");
        return (ma, ten);
    }
}
