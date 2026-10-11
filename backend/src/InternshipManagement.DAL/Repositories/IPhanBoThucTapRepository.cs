using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public interface IPhanBoThucTapRepository
{
    Task<PhanBoThucTap?> GetBySinhVienAsync(string maSV);
}
