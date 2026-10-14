using System.Security.Claims;
using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.API.Infrastructure;

public interface IResourceAccess
{
    Task<bool> CanAccessStudentAsync(ClaimsPrincipal user, string maSV);
    bool IsLecturer(ClaimsPrincipal user, string maGV);
}

public sealed class ResourceAccess(AppDbContext db) : IResourceAccess
{
    public async Task<bool> CanAccessStudentAsync(ClaimsPrincipal u, string maSV)
    {
        if (u.IsStaff()) return true;
        if (u.IsInRole(Roles.SinhVien)) return string.Equals(u.MaSV(), maSV, StringComparison.OrdinalIgnoreCase);
        if (u.IsInRole(Roles.GiangVien) && u.MaGV() is { } gv)
            return await db.GVHuongDans.AnyAsync(x => x.MaGiangVien == gv && x.MaSinhVien == maSV && x.TrangThai == "DangHuongDan");
        return false;
    }

    public bool IsLecturer(ClaimsPrincipal u, string maGV) =>
        u.IsStaff() || (u.IsInRole(Roles.GiangVien) && string.Equals(u.MaGV(), maGV, StringComparison.OrdinalIgnoreCase));
}
