using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public interface IPhongVanRepository
{
    Task<IReadOnlyList<PhongVan>> GetBySinhVienAsync(string maSV);
}
