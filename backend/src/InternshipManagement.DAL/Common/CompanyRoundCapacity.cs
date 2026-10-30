using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Common;

public static class CompanyRoundCapacity
{
    // Hồ sơ cũ/nơi tiếp nhận trực tiếp không tự được đưa vào danh sách tuyển đăng ký mới.
    public static async Task<int?> LimitAsync(AppDbContext db, string company, string round, int? legacyLimit)
        => await db.Set<Entities.CongTyTheoDot>().Where(x => x.MaCongTy == company && x.MaDot == round)
            .Select(x => (int?)x.SoLuongNhan).FirstOrDefaultAsync() ?? legacyLimit;
}
