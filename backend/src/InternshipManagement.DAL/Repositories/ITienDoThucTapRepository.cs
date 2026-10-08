using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public interface ITienDoThucTapRepository : IRepository<TienDoThucTap>
{
    Task<IReadOnlyList<TienDoThucTap>> GetBySinhVienAsync(string maSV);
    Task<IReadOnlyList<TienDoThucTap>> GetBySinhVienAndDotAsync(string maSV, string maDot);
    Task<IReadOnlyList<TienDoThucTap>> GetBaoCaoChoDuyetByGiangVienAsync(string maGV);
    Task<TienDoThucTap?> GetChiTietAsync(string maTienDo);
    Task<bool> CapNhatTrangThaiDuyetAsync(string maTienDo, string trangThaiDuyet);
}
