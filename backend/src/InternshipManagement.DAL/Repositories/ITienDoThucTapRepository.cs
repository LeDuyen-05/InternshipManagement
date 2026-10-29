using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public interface ITienDoThucTapRepository : IRepository<TienDoThucTap>
{
    // Dành cho Sinh viên xem danh sách tiến độ
    Task<IReadOnlyList<TienDoThucTap>> GetBySinhVienAsync(string maSV);
    Task<IReadOnlyList<TienDoThucTap>> GetBySinhVienAndDotAsync(string maSV, string maDot);

    // Dành cho Giảng viên duyệt báo cáo
    Task<IReadOnlyList<TienDoThucTap>> GetBaoCaoChoDuyetByGiangVienAsync(string maGV);
    Task<TienDoThucTap?> GetChiTietAsync(string maTienDo);
    Task<bool> CapNhatTrangThaiDuyetAsync(string maTienDo, string trangThaiDuyet, string? nhanXet = null);
    Task<bool> IsSupervisorAsync(string maGV, string maSV);
    /// <summary>Trạng thái quyết định tiếp nhận còn hiệu lực của SV trong đợt (null nếu chưa có).</summary>
    Task<string?> GetTrangThaiPhanBoAsync(string maSV, string maDot);

    // Dành cho Sinh viên nộp / cập nhật báo cáo tuần
    Task<TienDoThucTap> CreateAsync(TienDoThucTap entity);
    Task<TienDoThucTap> UpdateAsync(TienDoThucTap entity);
}

