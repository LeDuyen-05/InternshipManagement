using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public interface IDangKyThucTapRepository : IRepository<DangKyThucTap>
{
    Task<IReadOnlyList<DangKyThucTap>> GetBySinhVienAsync(string maSV);
    Task<bool> HasRegisteredAsync(string maSV, string maCongTy, string maDot);
    Task<DotThucTap?> GetDotAsync(string maDot);
    Task<int> CountBySinhVienDotAsync(string maSV, string maDot);
    Task<bool> HasApprovedRegistrationInDotAsync(string maSV, string maDot);
    Task<bool> HasPriorityInDotAsync(string maSV, string maDot, int thuTuUuTien);
    Task<int> CountDaTiepNhanAsync(string maCongTy, string maDot);
    Task<bool> SinhVienDaDuocTiepNhanAsync(string maSV, string maDot);
    /// <summary>Phân bổ chưa hủy của SV ở mọi đợt (kèm công ty, đợt).</summary>
    Task<IReadOnlyList<PhanBoThucTap>> GetPhanBoConHieuLucAsync(string maSV);
    /// <summary>Tổng điểm học phần thực tập của SV trong đợt và đã chấm đủ mọi tiêu chí hay chưa.</summary>
    Task<(decimal? TongDiem, bool DaDuDiem)> GetKetQuaThucTapAsync(string maSV, string maDot);
    /// <summary>(maCongTy, ketQua, ngayPV) các buổi phỏng vấn của SV.</summary>
    Task<IReadOnlyList<(string MaCongTy, string? KetQua, DateTime NgayPV)>> GetKetQuaPhongVanAsync(string maSV);
}
