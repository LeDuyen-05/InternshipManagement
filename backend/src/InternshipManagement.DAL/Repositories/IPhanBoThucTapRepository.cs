using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public interface IPhanBoThucTapRepository
{
    Task<PhanBoThucTap?> GetBySinhVienAsync(string maSV, string? maDot = null);
    Task<PhanBoThucTap?> GetForUpdateAsync(string maPhanBo);
    Task SaveChangesAsync();
    Task<PhanBoThucTap> ConfirmAsync(string id, string maSV, TimeProvider clock);
}
