using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public interface IDangKyThucTapRepository : IRepository<DangKyThucTap>
{
    Task<IReadOnlyList<DangKyThucTap>> GetBySinhVienAsync(string maSV);
    Task<bool> HasRegisteredAsync(string maSV, string maCongTy, string maDot);
    Task<DotThucTap?> GetDotAsync(string maDot);
    Task<int> CountBySinhVienDotAsync(string maSV, string maDot);
    Task<bool> HasApprovedRegistrationInDotAsync(string maSV, string maDot);
    Task<bool> HasPriorityInDotAsync(string maSV, string maDot, int thuTuUuTien);
    Task<int> CountDaTiepNhanAsync(string maCongTy, string maDot);
    Task<bool> SinhVienDaDuocTiepNhanAsync(string maSV, string maDot);
}
