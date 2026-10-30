using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public record GiangVienGioiThieuTheoDot(string MaDot, string MaCongTy, string MaGV, string HoTenGV);

public interface IGVHuongDanRepository : IRepository<GVHuongDan>
{
    Task<IReadOnlyList<GVHuongDan>> GetDanhSachSVTheoGiangVienAsync(string maGV, string? keyword = null, string? maDot = null);
    Task<IReadOnlyList<GVHuongDan>> GetTatCaPhanCongAsync(string? maDot = null);
    Task<IReadOnlyList<SinhVien>> GetDanhSachSVChuaPhanCongAsync(string maDot, string? keyword = null);
    Task<IReadOnlyList<GiangVien>> GetDanhSachGiangVienKemTaiAsync(string? maDot = null);
    Task<DotThucTap?> GetDotThucTapAsync(string maDot);
    Task<bool> SinhVienCoPhanBoAsync(string maSV, string maDot);
    Task<GiangVien?> GetGiangVienByIdAsync(string maGV);
    Task<bool> SinhVienTonTaiAsync(string maSV);
    Task<GVHuongDan?> GetChiTietPhanCongAsync(string maSo);
    Task<bool> SinhVienDaCoGVHDAsync(string maSV, string maDot);
    Task<int> CountSVHienTaiByGiangVienAsync(string maGV, string? maDot = null);
    Task<GVHuongDan> PhanCongAsync(string maGV, string maSV, string maDot);
    Task<bool> DoiGiangVienAsync(string maSo, string maGVMoi);
    Task<bool> HuyPhanCongAsync(string maSo);
    Task<bool> CapNhatChiTieuAsync(string maGV, int soLuongMoi);
    Task<bool> UpdateGiangVienChuyenMonAsync(string maGV, string? chuyenMon);
    Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> operation);
    /// <summary>GV giới thiệu/đầu mối được Khoa xác nhận riêng cho DN trong đúng đợt.</summary>
    Task<IReadOnlyList<GiangVienGioiThieuTheoDot>> GetGiangVienGioiThieuTheoDotAsync(string maDot);
}
