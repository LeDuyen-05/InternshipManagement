namespace InternshipManagement.API.Infrastructure;

/// <summary>
/// Chống dò mật khẩu theo từng tài khoản: sai liên tiếp <see cref="SoLanSaiToiDa"/> lần trong cửa sổ
/// <see cref="CuaSoDem"/> thì tạm khóa đăng nhập <see cref="ThoiGianKhoa"/>; đăng nhập đúng xóa bộ đếm.
/// Đếm theo tên đăng nhập (không theo IP) để cả phòng máy dùng chung một IP vẫn đăng nhập bình thường.
/// Mỗi lần thử phải <see cref="GiuLuotThu"/> trước khi so mật khẩu: lượt đang so cũng tính vào giới hạn,
/// nên gửi nhiều yêu cầu cùng lúc vẫn chỉ được thử tối đa <see cref="SoLanSaiToiDa"/> mật khẩu.
/// Lưu trong bộ nhớ: khởi động lại ứng dụng thì bộ đếm về 0 (chấp nhận được với một máy chủ).
/// </summary>
public sealed class LoginAttemptLimiter(TimeProvider clock)
{
    public const int SoLanSaiToiDa = 5;
    public static readonly TimeSpan CuaSoDem = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan ThoiGianKhoa = TimeSpan.FromMinutes(5);
    /// <summary>Thời gian chờ khi các lượt còn lại đều đang được so mật khẩu (chưa biết đúng hay sai).</summary>
    public static readonly TimeSpan ChoLuotDangThu = TimeSpan.FromSeconds(5);
    private const int SoKhoaToiDa = 10_000;

    private sealed class TrangThai
    {
        public int SoLanSai;
        public int DangThu;
        public DateTimeOffset LanSaiDau;
        public DateTimeOffset? KhoaDen;
    }

    private readonly Dictionary<string, TrangThai> _theoTaiKhoan = new(StringComparer.OrdinalIgnoreCase);
    private readonly object _gate = new();

    private static string Khoa(string? tenDangNhap) => (tenDangNhap ?? "").Trim();

    /// <summary>Thời gian còn bị khóa; null nếu chưa bị khóa (chỉ để xem, không giữ lượt thử).</summary>
    public TimeSpan? ConBiKhoa(string? tenDangNhap)
    {
        var now = clock.GetUtcNow();
        lock (_gate)
        {
            if (_theoTaiKhoan.TryGetValue(Khoa(tenDangNhap), out var tt) && tt.KhoaDen is { } den && den > now)
                return den - now;
            return null;
        }
    }

    /// <summary>
    /// Giữ một lượt thử trước khi so mật khẩu. Null = được thử, sau đó phải gọi đúng một trong
    /// <see cref="GhiNhanThatBai"/>, <see cref="GhiNhanThanhCong"/> hoặc <see cref="TraLuotThu"/>.
    /// Có giá trị = không được thử, là thời gian phải chờ.
    /// </summary>
    public TimeSpan? GiuLuotThu(string? tenDangNhap)
    {
        var key = Khoa(tenDangNhap);
        if (key.Length == 0) return null;
        var now = clock.GetUtcNow();
        lock (_gate)
        {
            var tt = LayHoacTao(key, now);
            if (tt.KhoaDen is { } den && den > now) return den - now;
            if (tt.SoLanSai + tt.DangThu >= SoLanSaiToiDa) return ChoLuotDangThu;
            tt.DangThu++;
            return null;
        }
    }

    public void GhiNhanThatBai(string? tenDangNhap)
    {
        var key = Khoa(tenDangNhap);
        if (key.Length == 0) return;
        var now = clock.GetUtcNow();
        lock (_gate)
        {
            var tt = LayHoacTao(key, now);
            if (tt.DangThu > 0) tt.DangThu--;
            if (tt.KhoaDen is { } den && den > now) return;
            if (tt.SoLanSai == 0) tt.LanSaiDau = now;
            if (++tt.SoLanSai >= SoLanSaiToiDa)
            {
                tt.SoLanSai = 0;
                tt.LanSaiDau = now;
                tt.KhoaDen = now + ThoiGianKhoa;
            }
        }
    }

    public void GhiNhanThanhCong(string? tenDangNhap)
    {
        lock (_gate) _theoTaiKhoan.Remove(Khoa(tenDangNhap));
    }

    /// <summary>Trả lại lượt đã giữ khi không xác định được đúng/sai (lỗi hệ thống, tài khoản không dùng được).</summary>
    public void TraLuotThu(string? tenDangNhap)
    {
        var key = Khoa(tenDangNhap);
        lock (_gate)
        {
            if (!_theoTaiKhoan.TryGetValue(key, out var tt)) return;
            if (tt.DangThu > 0) tt.DangThu--;
            if (tt.DangThu == 0 && tt.SoLanSai == 0 && tt.KhoaDen is null) _theoTaiKhoan.Remove(key);
        }
    }

    // Gọi trong lock. Hết khóa hoặc quá cửa sổ đếm thì bắt đầu đếm lại.
    private TrangThai LayHoacTao(string key, DateTimeOffset now)
    {
        if (_theoTaiKhoan.TryGetValue(key, out var tt))
        {
            if ((tt.KhoaDen is { } den && den <= now) || (tt.KhoaDen is null && now - tt.LanSaiDau > CuaSoDem))
            {
                tt.SoLanSai = 0;
                tt.LanSaiDau = now;
                tt.KhoaDen = null;
            }
            return tt;
        }
        if (_theoTaiKhoan.Count >= SoKhoaToiDa) DonDep(now);
        return _theoTaiKhoan[key] = new TrangThai { LanSaiDau = now };
    }

    private void DonDep(DateTimeOffset now)
    {
        foreach (var (key, tt) in _theoTaiKhoan.ToList())
            if (tt.DangThu == 0 && (tt.KhoaDen is null || tt.KhoaDen <= now) && now - tt.LanSaiDau > CuaSoDem)
                _theoTaiKhoan.Remove(key);
    }
}
