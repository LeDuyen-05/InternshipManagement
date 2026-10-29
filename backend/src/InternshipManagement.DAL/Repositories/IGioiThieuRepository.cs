using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public interface IGioiThieuRepository : IRepository<GioiThieu>
{
    Task<IReadOnlyList<GioiThieu>> GetWithDetailsAsync();
    Task<IReadOnlyList<GioiThieu>> GetByGiangVienAsync(string maGV);
    Task<GioiThieu?> GetByIdWithDetailsAsync(string maSo);
    Task<GioiThieu> DeXuatCongTyMoiAsync(string maGV, CongTy congTy);
    Task<bool> ExistsCongTyByNameAsync(string tenCongTy);
    Task<bool> ExistsAsync(string maGV, string maCongTy);
    Task<bool> ExistsGiangVienAsync(string maGV);
    Task<CongTy?> GetCongTyByIdAsync(string maCongTy);
    void UpdateCongTy(CongTy congTy);
}
