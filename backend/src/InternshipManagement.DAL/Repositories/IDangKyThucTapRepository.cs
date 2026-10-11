using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public interface IDangKyThucTapRepository : IRepository<DangKyThucTap>
{
    Task<IReadOnlyList<DangKyThucTap>> GetBySinhVienAsync(string maSV);
    Task<bool> HasRegisteredAsync(string maSV, string maCongTy, string maDot);
}
