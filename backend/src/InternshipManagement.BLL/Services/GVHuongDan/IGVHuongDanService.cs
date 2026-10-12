using InternshipManagement.BLL.DTOs.GVHuongDan;

namespace InternshipManagement.BLL.Services.GVHuongDan;

public interface IGVHuongDanService
{
    Task<IReadOnlyList<SVHuongDanDto>> GetDanhSachSVTheoGiangVienAsync(string maGV, string? keyword = null);
    Task<IReadOnlyList<SVChuaPhanCongDto>> GetDanhSachSVChuaPhanCongAsync(string? keyword = null);
    Task<IReadOnlyList<GiangVienTaiDto>> GetDanhSachGiangVienKemTaiAsync();
    Task<SVHuongDanDto> PhanCongDonLeAsync(PhanCongDonLeRequest request);
    Task<PhanCongHangLoatResult> PhanCongHangLoatAsync(PhanCongHangLoatRequest request);
    Task<bool> DoiGiangVienAsync(DoiGiangVienRequest request);
    Task<bool> HuyPhanCongAsync(string maSo);
    Task<bool> CapNhatChiTieuAsync(string maGV, int soLuongMoi);
}
