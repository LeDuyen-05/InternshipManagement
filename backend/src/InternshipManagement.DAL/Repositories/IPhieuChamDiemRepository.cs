using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public interface IPhieuChamDiemRepository : IRepository<PhieuChamDiem>
{
    Task<IReadOnlyList<TieuChi>> GetDanhSachTieuChiAsync(string maDot);
    Task<DotThucTap?> GetDotThucTapAsync(string maDot);
    Task<PhieuChamDiem?> GetPhieuChamBySinhVienAndDotAsync(string maSV, string maDot);
    Task<IReadOnlyList<PhieuChamDiem>> GetDanhSachPhieuChamByGiangVienAsync(string maGV, string maDot);
    Task<PhieuChamDiem> LuuPhieuChamDiemAsync(PhieuChamDiem phieu, IEnumerable<ChiTietChamDiem> chiTiets);
}
