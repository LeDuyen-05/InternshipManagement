using InternshipManagement.BLL.DTOs.GVHuongDan;
using InternshipManagement.BLL.DTOs.GiangVien;

namespace InternshipManagement.BLL.Services.GVHuongDan;

public interface IGVHuongDanService
{
    Task<IReadOnlyList<SVHuongDanDto>> GetDanhSachSVTheoGiangVienAsync(string maGV, string? keyword = null, string? maDot = null);
    Task<IReadOnlyList<TatCaPhanCongDto>> GetTatCaPhanCongAsync(string? maDot = null);
    Task<IReadOnlyList<SVChuaPhanCongDto>> GetDanhSachSVChuaPhanCongAsync(string maDot, string? keyword = null);
    Task<IReadOnlyList<GiangVienTaiDto>> GetDanhSachGiangVienKemTaiAsync(string? maDot = null);
    Task<SVHuongDanDto> PhanCongDonLeAsync(PhanCongDonLeRequest request);
    Task<PhanCongHangLoatResult> PhanCongHangLoatAsync(PhanCongHangLoatRequest request);
    Task<bool> DoiGiangVienAsync(DoiGiangVienRequest request);
    Task<bool> HuyPhanCongAsync(string maSo, string maDot);
    Task<bool> CapNhatChiTieuAsync(string maGV, int soLuongMoi);
    Task<GiangVienProfileDto?> GetProfileAsync(string maGV);
    Task<bool> UpdateProfileAsync(string maGV, UpdateGiangVienProfileRequest request);
    Task<TuDongPhanCongResult> DeXuatPhanCongTuDongAsync(string maDot, IReadOnlyCollection<string>? maSV = null);
    Task<PhanCongHangLoatResult> XacNhanPhanCongTuDongAsync(TuDongPhanCongConfirmRequest request);
}
