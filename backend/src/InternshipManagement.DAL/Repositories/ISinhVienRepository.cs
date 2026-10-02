using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public interface ISinhVienRepository : IRepository<SinhVien>
{
    Task<SinhVien?> GetByIdWithHoSoAsync(string maSV);
}
