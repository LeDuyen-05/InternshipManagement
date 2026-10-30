using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Common;

public static class PositionCapacity
{
    // Legacy callers may omit the ID only when there is a single unambiguous position.
    public static async Task<ViTriTheoDot?> ResolveAsync(AppDbContext db, string company, string round, string? id)
    {
        var positions = await db.Set<ViTriTheoDot>().AsNoTracking().Where(x => x.MaCongTy == company && x.MaDot == round).ToListAsync();
        if (positions.Count == 0 && id == null) return null;
        var position = id == null ? (positions.Count == 1 ? positions[0] : null) : positions.SingleOrDefault(x => x.MaViTri == id);
        return position ?? throw new InvalidOperationException("Cần chọn đúng vị trí thuộc công ty và đợt đang xử lý.");
    }

    public static async Task<ViTriTheoDot?> RequireRoomAsync(AppDbContext db, string company, string round, string? id, string? excluding = null, bool allowInactive = false)
    {
        var position = await ResolveAsync(db, company, round, id);
        if (position == null) return null;
        if (!allowInactive && !position.HoatDong) throw new InvalidOperationException("Vị trí đã ngừng tiếp nhận mới.");
        var count = await db.PhanBoThucTaps.CountAsync(x => x.MaCongTy == company && x.MaDot == round
            && x.MaViTri == position.MaViTri && x.TrangThai != "Huy" && x.MaPhanBo != excluding);
        if (count >= position.SoLuongNhan) throw new InvalidOperationException("Vị trí đã đủ chỉ tiêu — đóng nhận mới.");
        return position;
    }
}
