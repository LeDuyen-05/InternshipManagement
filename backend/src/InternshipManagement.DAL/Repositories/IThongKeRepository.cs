using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public interface IThongKeRepository
{
    Task<DotThucTap?> GetDotThucTapAsync(string? maDot);
    Task<IReadOnlyList<DotThucTap>> GetAllDotThucTapAsync();
    Task<IReadOnlyList<SinhVien>> GetSinhViensAsync(string? maDot);
    Task<IReadOnlyList<GVHuongDan>> GetGVHuongDansAsync();
    Task<IReadOnlyList<GiangVien>> GetGiangViensKemTaiAsync();
    Task<IReadOnlyList<TienDoThucTap>> GetTienDoThucTapsAsync(string? maDot);
    Task<IReadOnlyList<PhieuChamDiem>> GetPhieuChamDiemsAsync(string? maDot);
    Task<IReadOnlyList<TieuChi>> GetTieuChisAsync(string maDot);
    Task<IReadOnlyList<KhongHoanTatDot>> GetKhongHoanTatAsync(string maDot);
    Task<ChotDotThucTap?> GetChotDotAsync(string maDot);
}
