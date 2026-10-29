using InternshipManagement.BLL.DTOs.DangKyThucTap;

namespace InternshipManagement.BLL.Services.DangKyThucTap;

public interface IDangKyThucTapService
{
    Task<IReadOnlyList<CongTyDto>> GetDanhSachCongTyTuyenDungAsync();
    Task<CongTyDto> DeXuatCongTyMoiAsync(DeXuatCongTyRequest request);
    Task<IReadOnlyList<CongTyDto>> GetDeXuatCuaSinhVienAsync(string maSV);
    Task<string?> KiemTraDieuKienDangKyAsync(string maSV, string maDot, string hanhDong = "đăng ký thêm nguyện vọng");
    Task<IReadOnlyList<DangKyThucTapDto>> GetDanhSachDangKyBySinhVienAsync(string maSV);
    Task<DangKyThucTapDto> DangKyNguyenVongAsync(CreateDangKyThucTapRequest request);
    Task<bool> HuyDangKyAsync(string maDK);
    Task<bool> HuyDangKyAsync(string maDK, string? requesterMaSV, bool isStaff);
}
