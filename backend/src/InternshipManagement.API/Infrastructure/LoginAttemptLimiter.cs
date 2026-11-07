using System.Collections.Concurrent;

namespace InternshipManagement.API.Infrastructure;

/// <summary>
/// Chống dò mật khẩu theo từng tài khoản: sai liên tiếp <see cref="SoLanSaiToiDa"/> lần trong cửa sổ
/// <see cref="CuaSoDem"/> thì tạm khóa đăng nhập <see cref="ThoiGianKhoa"/>; đăng nhập đúng xóa bộ đếm.
/// Đếm theo tên đăng nhập (không theo IP) để cả phòng máy dùng chung một IP vẫn đăng nhập bình thường.
/// Lưu trong bộ nhớ: khởi động lại ứng dụng thì bộ đếm về 0 (chấp nhận được với một máy chủ).
/// </summary>
public sealed class LoginAttemptLimiter(TimeProvider clock)
{
    public const int SoLanSaiToiDa = 5;
    public static readonly TimeSpan CuaSoDem = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan ThoiGianKhoa = TimeSpan.FromMinutes(5);
    private const int SoKhoaToiDa = 10_000;

    private sealed record TrangThai(int SoLanSai, DateTimeOffset LanSaiDau, DateTimeOffset? KhoaDen);
    private readonly ConcurrentDictionary<string, TrangThai> _theoTaiKhoan = new(StringComparer.OrdinalIgnoreCase);

    private static string Khoa(string? tenDangNhap) => (tenDangNhap ?? "").Trim();

    /// <summary>Thời gian còn bị khóa; null nếu được phép thử đăng nhập.</summary>
    public TimeSpan? ConBiKhoa(string? tenDangNhap)
    {
        var now = clock.GetUtcNow();
        if (_theoTaiKhoan.TryGetValue(Khoa(tenDangNhap), out var tt) && tt.KhoaDen is { } den && den > now)
            return den - now;
        return null;
    }

    public void GhiNhanThatBai(string? tenDangNhap)
    {
        var key = Khoa(tenDangNhap);
        if (key.Length == 0) return;
        var now = clock.GetUtcNow();
        if (_theoTaiKhoan.Count >= SoKhoaToiDa) DonDep(now);
        _theoTaiKhoan.AddOrUpdate(key,
            _ => new TrangThai(1, now, null),
            (_, cu) =>
            {
                // Hết khóa hoặc quá cửa sổ đếm thì bắt đầu đếm lại
                var tt = (cu.KhoaDen is { } den && den <= now) || now - cu.LanSaiDau > CuaSoDem ? new TrangThai(0, now, null) : cu;
                var soLan = tt.SoLanSai + 1;
                return soLan >= SoLanSaiToiDa ? new TrangThai(0, now, now + ThoiGianKhoa) : tt with { SoLanSai = soLan };
            });
    }

    public void GhiNhanThanhCong(string? tenDangNhap) => _theoTaiKhoan.TryRemove(Khoa(tenDangNhap), out _);

    private void DonDep(DateTimeOffset now)
    {
        foreach (var (key, tt) in _theoTaiKhoan)
            if ((tt.KhoaDen is null || tt.KhoaDen <= now) && now - tt.LanSaiDau > CuaSoDem)
                _theoTaiKhoan.TryRemove(key, out _);
    }
}
