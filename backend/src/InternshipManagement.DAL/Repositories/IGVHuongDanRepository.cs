using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

public interface IGVHuongDanRepository : IRepository<GVHuongDan>
{
    Task<IReadOnlyList<GVHuongDan>> GetDanhSachSVTheoGiangVienAsync(string maGV, string? keyword = null);
    Task<IReadOnlyList<GVHuongDan>> GetTatCaPhanCongAsync();
    Task<IReadOnlyList<SinhVien>> GetDanhSachSVChuaPhanCongAsync(string? keyword = null);
    Task<IReadOnlyList<GiangVien>> GetDanhSachGiangVienKemTaiAsync();
    Task<GiangVien?> GetGiangVienByIdAsync(string maGV);
    Task<bool> SinhVienTonTaiAsync(string maSV);
    Task<GVHuongDan?> GetChiTietPhanCongAsync(string maSo);
    Task<bool> SinhVienDaCoGVHDAsync(string maSV);
    Task<int> CountSVHienTaiByGiangVienAsync(string maGV);
    Task<GVHuongDan> PhanCongAsync(string maGV, string maSV);
    Task<bool> DoiGiangVienAsync(string maSo, string maGVMoi);
    Task<bool> HuyPhanCongAsync(string maSo);
    Task<bool> CapNhatChiTieuAsync(string maGV, int soLuongMoi);
    Task<bool> UpdateGiangVienChuyenMonAsync(string maGV, string? chuyenMon);
    Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> operation);
    /// <summary>Các quan hệ giảng viên giới thiệu công ty đã được Khoa duyệt.</summary>
    Task<IReadOnlyList<GioiThieu>> GetGioiThieuDaDuyetAsync();
}
