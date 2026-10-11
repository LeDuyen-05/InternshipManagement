using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public interface ITienDoThucTapRepository
{
    Task<IReadOnlyList<TienDoThucTap>> GetBySinhVienAsync(string maSV);
    Task<TienDoThucTap?> GetByIdAsync(string maTienDo);
    Task<TienDoThucTap> CreateAsync(TienDoThucTap entity);
    Task<TienDoThucTap> UpdateAsync(TienDoThucTap entity);
}
