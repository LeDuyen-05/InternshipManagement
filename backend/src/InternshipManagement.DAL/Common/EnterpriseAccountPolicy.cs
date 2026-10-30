using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Common;

public static class EnterpriseAccountPolicy
{
    public static async Task<bool> HasOtherActiveAccountAsync(AppDbContext db, string? representativeId, string? accountId = null)
    {
        var companyId = await db.DaiDienDoanhNghieps.AsNoTracking()
            .Where(x => x.MaSo == representativeId).Select(x => x.MaCongTy).FirstOrDefaultAsync();
        if (companyId is null) return true;

        return await db.TaiKhoans.AsNoTracking().AnyAsync(a => a.MaTaiKhoan != accountId
            && a.MaVaiTro == "VT05" && a.TrangThai == "HoatDong"
            && db.DaiDienDoanhNghieps.Any(d => d.MaSo == a.MaDaiDien && d.MaCongTy == companyId));
    }
}
