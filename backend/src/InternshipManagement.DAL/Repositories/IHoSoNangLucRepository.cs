using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public interface IHoSoNangLucRepository : IRepository<HoSoNangLuc>
{
    Task<HoSoNangLuc?> GetByMaSinhVienAsync(string maSV);
}
