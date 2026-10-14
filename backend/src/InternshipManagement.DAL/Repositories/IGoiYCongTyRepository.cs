using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public interface IGoiYCongTyRepository
{
    Task<SinhVien?> GetSinhVienWithHoSoAsync(string maSV);
    Task<HoSoNangLuc> EnsureHoSoNangLucAsync(string maSV);
    Task<IReadOnlyList<GoiYCongTy>> GetGoiYByHoSoAsync(string maHoSo, int topK = 5);
    Task<IReadOnlyList<CongTy>> GetCongTyDaDuyetAsync();
    Task LuuGoiYAsync(string maHoSo, IEnumerable<GoiYCongTy> danhSachGoiY);
    Task CapNhatHoSoAsync(string maSV, string? ndHoSo, string? kyNang, string? congNghe, string? duAn);
}
