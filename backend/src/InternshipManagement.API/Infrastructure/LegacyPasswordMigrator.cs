using InternshipManagement.BLL.Services.Auth;
using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.API.Infrastructure;

public static class LegacyPasswordMigrator
{
    public static async Task RunAsync(IServiceProvider sp)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var pw = scope.ServiceProvider.GetRequiredService<IPasswordService>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();
        var legacy = await db.TaiKhoans
            .Where(x => x.MatKhau.Length != 64 && !x.MatKhau.StartsWith("AQAAAA")).ToListAsync();
        foreach (var a in legacy) a.MatKhau = pw.Hash(a.MatKhau);
        if (legacy.Count > 0)
        {
            await db.SaveChangesAsync();
            logger.LogWarning("Đã hash {N} mật khẩu plaintext cũ.", legacy.Count);
        }
    }
}
