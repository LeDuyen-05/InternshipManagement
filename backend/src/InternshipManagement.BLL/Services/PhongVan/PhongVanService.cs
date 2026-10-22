using InternshipManagement.BLL.DTOs.PhongVan;
using InternshipManagement.BLL.DTOs.PhanBoThucTap;
using InternshipManagement.DAL.Repositories;

namespace InternshipManagement.BLL.Services.PhongVan;

public class PhongVanService : IPhongVanService
{
    private readonly IPhongVanRepository _phongVanRepo;
    private readonly IPhanBoThucTapRepository _phanBoRepo;

    public PhongVanService(IPhongVanRepository phongVanRepo, IPhanBoThucTapRepository phanBoRepo)
    {
        _phongVanRepo = phongVanRepo;
        _phanBoRepo = phanBoRepo;
    }

    public async Task<IReadOnlyList<PhongVanDto>> GetLichPhongVanBySinhVienAsync(string maSV)
    {
        var list = await _phongVanRepo.GetBySinhVienAsync(maSV);
        return list.Select(p => new PhongVanDto
        {
            MaPV = p.MaPV,
            MaSinhVien = p.MaSinhVien,
            TenCongTy = p.DaiDienDoanhNghiep?.CongTy?.TenCongTy,
            ViTriTuyen = p.DaiDienDoanhNghiep?.CongTy?.ViTriTuyen,
            NguoiPhongVan = p.DaiDienDoanhNghiep?.HoTen,
            ChucVuNguoiPV = p.DaiDienDoanhNghiep?.ChucVu,
            HinhThuc = p.HinhThuc,
            NgayPV = p.NgayPV,
            KetQua = p.KetQua,
        }).ToList();
    }

    /// <summary>Sinh viên xác nhận nhận quyết định tiếp nhận → bắt đầu thực tập (ChuaNhanViec → DangThucTap).</summary>
    public async Task<PhanBoThucTapDto> XacNhanTiepNhanAsync(string maPhanBo, string maSV)
    {
        var pb = await _phanBoRepo.GetForUpdateAsync(maPhanBo)
                 ?? throw new KeyNotFoundException("Không tìm thấy quyết định tiếp nhận.");
        if (!string.Equals(pb.MaSinhVien, maSV, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Bạn không thể xác nhận quyết định tiếp nhận của sinh viên khác.");
        if (pb.TrangThai != "ChuaNhanViec")
            throw new InvalidOperationException("Quyết định tiếp nhận này không ở trạng thái chờ sinh viên xác nhận.");
        if (pb.DotThucTap?.TrangThai == "DaKetThuc")
            throw new InvalidOperationException("Đợt thực tập đã kết thúc.");

        pb.TrangThai = "DangThucTap";
        await _phanBoRepo.SaveChangesAsync();
        return (await GetPhanBoBySinhVienAsync(maSV))!;
    }

    public async Task<PhanBoThucTapDto?> GetPhanBoBySinhVienAsync(string maSV)
    {
        var pb = await _phanBoRepo.GetBySinhVienAsync(maSV);
        if (pb == null) return null;

        var gv = pb.SinhVien?.GVHuongDans?.FirstOrDefault()?.GiangVien;
        var hd = pb.HuongDanDoanhNghieps?.FirstOrDefault();

        return new PhanBoThucTapDto
        {
            MaPhanBo = pb.MaPhanBo,
            MaSinhVien = pb.MaSinhVien,
            MaCongTy = pb.MaCongTy,
            TenCongTy = pb.CongTy?.TenCongTy,
            ViTriTuyen = pb.CongTy?.ViTriTuyen,
            ThoiGianThucTap = pb.CongTy?.ThoiGian,
            MaDot = pb.MaDot,
            TenDot = pb.DotThucTap?.TenDot,
            NgayPhanBo = pb.NgayPhanBo,
            TrangThai = pb.TrangThai,

            GiangVienHD = gv?.HoTen,
            ChuyenMonGV = gv?.ChuyenMon,

            MentorDoanhNghiep = hd?.DaiDienDoanhNghiep?.HoTen,
            ChucVuMentor = hd?.DaiDienDoanhNghiep?.ChucVu,
            DanhGiaMentor = hd?.DanhGia,
        };
    }
}
