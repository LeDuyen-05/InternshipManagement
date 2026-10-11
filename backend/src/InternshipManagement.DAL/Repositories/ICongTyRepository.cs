using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public interface ICongTyRepository : IRepository<CongTy>
{
    Task<IReadOnlyList<CongTy>> GetDanhSachTuyenDungAsync();
}
