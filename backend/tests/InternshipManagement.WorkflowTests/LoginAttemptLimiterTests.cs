using InternshipManagement.API.Infrastructure;
using Xunit;

namespace InternshipManagement.WorkflowTests;

public class LoginAttemptLimiterTests
{
    private sealed class Clock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2026, 11, 7, 8, 0, 0, TimeSpan.FromHours(7));
        public override DateTimeOffset GetUtcNow() => Now;
    }

    [Fact]
    public void LocksAfterFiveFailuresAndUnlocksAfterTimeout()
    {
        var clock = new Clock();
        var limiter = new LoginAttemptLimiter(clock);
        for (var i = 0; i < LoginAttemptLimiter.SoLanSaiToiDa - 1; i++) limiter.GhiNhanThatBai("sv001");
        Assert.Null(limiter.ConBiKhoa("sv001"));

        limiter.GhiNhanThatBai("SV001 "); // không phân biệt hoa thường, bỏ khoảng trắng
        Assert.NotNull(limiter.ConBiKhoa("sv001"));
        Assert.Null(limiter.ConBiKhoa("sv002")); // tài khoản khác không bị ảnh hưởng

        clock.Now += LoginAttemptLimiter.ThoiGianKhoa + TimeSpan.FromSeconds(1);
        Assert.Null(limiter.ConBiKhoa("sv001"));
        limiter.GhiNhanThatBai("sv001"); // hết khóa thì đếm lại từ đầu
        Assert.Null(limiter.ConBiKhoa("sv001"));
    }

    [Fact]
    public void SuccessResetsCounterAndOldFailuresExpire()
    {
        var clock = new Clock();
        var limiter = new LoginAttemptLimiter(clock);
        for (var i = 0; i < LoginAttemptLimiter.SoLanSaiToiDa - 1; i++) limiter.GhiNhanThatBai("gv001");
        limiter.GhiNhanThanhCong("gv001");
        limiter.GhiNhanThatBai("gv001");
        Assert.Null(limiter.ConBiKhoa("gv001"));

        for (var i = 0; i < LoginAttemptLimiter.SoLanSaiToiDa - 2; i++) limiter.GhiNhanThatBai("gv001");
        clock.Now += LoginAttemptLimiter.CuaSoDem + TimeSpan.FromMinutes(1); // các lần sai cũ quá cửa sổ đếm
        limiter.GhiNhanThatBai("gv001");
        Assert.Null(limiter.ConBiKhoa("gv001"));
    }

    [Fact]
    public void AttemptsInProgressCountTowardsTheLimit()
    {
        var limiter = new LoginAttemptLimiter(new Clock());
        for (var i = 0; i < LoginAttemptLimiter.SoLanSaiToiDa; i++) Assert.Null(limiter.GiuLuotThu("sv001"));
        Assert.Equal(LoginAttemptLimiter.ChoLuotDangThu, limiter.GiuLuotThu("SV001 ")); // hết lượt dù chưa lần nào sai xong
        Assert.Null(limiter.GiuLuotThu("sv002"));

        limiter.TraLuotThu("sv001"); // lỗi hệ thống thì trả lại lượt
        Assert.Null(limiter.GiuLuotThu("sv001"));
        for (var i = 0; i < LoginAttemptLimiter.SoLanSaiToiDa; i++) limiter.GhiNhanThatBai("sv001");
        Assert.NotNull(limiter.ConBiKhoa("sv001"));
        Assert.True(limiter.GiuLuotThu("sv001") > LoginAttemptLimiter.ChoLuotDangThu);
    }

    [Fact]
    public void SuccessWhileOthersAreInProgressFreesTheAccount()
    {
        var limiter = new LoginAttemptLimiter(new Clock());
        for (var i = 0; i < LoginAttemptLimiter.SoLanSaiToiDa; i++) limiter.GiuLuotThu("gv001");
        limiter.GhiNhanThanhCong("gv001");
        Assert.Null(limiter.GiuLuotThu("gv001"));
    }

    [Fact]
    public async Task ParallelWrongPasswordsAreCappedAtTheLimit()
    {
        var limiter = new LoginAttemptLimiter(new Clock());
        var tried = 0;
        using var start = new ManualResetEventSlim();
        var attempts = Enumerable.Range(0, 64).Select(_ => Task.Run(async () =>
        {
            start.Wait();
            if (limiter.GiuLuotThu("gv002") is not null) return;
            Interlocked.Increment(ref tried);
            await Task.Delay(20); // thời gian so mật khẩu
            limiter.GhiNhanThatBai("gv002");
        })).ToList();
        start.Set();
        await Task.WhenAll(attempts);

        Assert.Equal(LoginAttemptLimiter.SoLanSaiToiDa, tried);
        Assert.NotNull(limiter.ConBiKhoa("gv002"));
    }
}
