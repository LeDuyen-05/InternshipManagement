using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public interface ICongTyRepository : IRepository<CongTy>
{
    Task<IReadOnlyList<CongTy>> GetDanhSachTuyenDungAsync();
    Task<bool> ExistsByNameAsync(string tenCongTy);
    /// <summary>Đợt "DangDienRa" bắt đầu gần nhất — đợt đang tiếp nhận đăng ký.</summary>
    Task<DotThucTap?> GetDotDangDienRaAsync();
    /// <summary>Số SV đã được tiếp nhận (phân bổ chưa hủy) theo từng công ty trong đợt.</summary>
    Task<Dictionary<string, int>> DemDaTiepNhanTheoCongTyAsync(string maDot);
}
