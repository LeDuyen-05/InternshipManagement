using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public interface IGioiThieuRepository : IRepository<GioiThieu>
{
    Task<IReadOnlyList<GioiThieu>> GetWithDetailsAsync();
    Task<IReadOnlyList<GioiThieu>> GetByGiangVienAsync(string maGV);
    Task<GioiThieu> DeXuatCongTyMoiAsync(string maGV, CongTy congTy);
    Task<bool> ExistsCongTyByNameAsync(string tenCongTy);
}
