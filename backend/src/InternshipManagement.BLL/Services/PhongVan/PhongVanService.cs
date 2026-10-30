using InternshipManagement.BLL.DTOs.PhongVan;
using InternshipManagement.BLL.DTOs.PhanBoThucTap;
using InternshipManagement.DAL.Repositories;
using InternshipManagement.BLL.Common;

namespace InternshipManagement.BLL.Services.PhongVan;

public class PhongVanService : IPhongVanService
{
    private readonly IPhongVanRepository _phongVanRepo;
    private readonly IPhanBoThucTapRepository _phanBoRepo;
    private readonly TimeProvider _clock;

    public PhongVanService(IPhongVanRepository phongVanRepo, IPhanBoThucTapRepository phanBoRepo, TimeProvider? clock = null)
    {
        _phongVanRepo = phongVanRepo;
        _phanBoRepo = phanBoRepo;
        _clock = clock ?? TimeProvider.System;
    }

    public async Task<IReadOnlyList<PhongVanDto>> GetLichPhongVanBySinhVienAsync(string maSV)
    {
        var list = await _phongVanRepo.GetBySinhVienAsync(maSV);
        return list.Select(p => new PhongVanDto
        {
            MaPV = p.MaPV, PhienBan = p.PhienBan, MaPVTruoc = p.MaPVTruoc, DaThayThe = p.CacBuoiThayThe.Any(),
            LichSu = p.NhatKy.OrderBy(n => n.ThoiDiem).Select(n => new InterviewHistoryDto(n.Loai, n.KetQuaCu, n.KetQuaMoi, n.LyDo, n.ThoiDiem)).ToList(),
            MaSinhVien = p.MaSinhVien,
            TenCongTy = p.DaiDienDoanhNghiep?.CongTy?.TenCongTy,
            ViTriTuyen = p.DangKyThucTap?.ViTriDangKy ?? p.DaiDienDoanhNghiep?.CongTy?.ViTriTuyen,
            NguoiPhongVan = p.DaiDienDoanhNghiep?.HoTen,
            ChucVuNguoiPV = p.DaiDienDoanhNghiep?.ChucVu,
            HinhThuc = p.HinhThuc,
            NgayPV = InterviewTimePolicy.WithOffset(p.NgayPV),
            KetQua = p.KetQua,
            MaDK = p.MaDK, MaDot = p.DangKyThucTap?.MaDot, LyDoKetQua = p.LyDoKetQua,
            NguonKetQua = p.NguonKetQua, ThoiDiemKetQua = p.ThoiDiemKetQua,
        }).ToList();
    }

    /// <summary>SV xác nhận nơi nhận việc; nhánh qua trường mới chờ Khoa chốt trước khi thực tập.</summary>
    public async Task<PhanBoThucTapDto> XacNhanTiepNhanAsync(string maPhanBo, string maSV)
    {
        var pb = await _phanBoRepo.ConfirmAsync(maPhanBo, maSV, _clock);
        return (await GetPhanBoBySinhVienAsync(maSV, pb.MaDot))!;
    }

    public async Task<PhanBoThucTapDto?> GetPhanBoBySinhVienAsync(string maSV, string? maDot = null)
    {
        var pb = await _phanBoRepo.GetBySinhVienAsync(maSV, maDot);
        if (pb == null) return null;

        var gv = pb.SinhVien?.GVHuongDans?.FirstOrDefault(g => g.MaDot == pb.MaDot && g.TrangThai == "DangHuongDan")?.GiangVien;
        var hd = pb.HuongDanDoanhNghieps?.FirstOrDefault();

        return new PhanBoThucTapDto
        {
            MaPhanBo = pb.MaPhanBo,
            MaSinhVien = pb.MaSinhVien,
            MaCongTy = pb.MaCongTy,
            TenCongTy = pb.CongTy?.TenCongTy,
            ViTriTuyen = pb.HoSoTuTim?.ViTri ?? pb.ViTri?.TenViTri ?? pb.CongTy?.ViTriTuyen,
            ThoiGianThucTap = pb.HoSoTuTim == null ? pb.CongTy?.ThoiGian : $"{pb.HoSoTuTim.NgayBatDau:dd/MM/yyyy} - {pb.HoSoTuTim.NgayKetThuc:dd/MM/yyyy}",
            MaDot = pb.MaDot,
            TenDot = pb.DotThucTap?.TenDot,
            NgayPhanBo = pb.NgayPhanBo,
            TrangThai = pb.TrangThai,
            DaDuocKhoaDuyet = pb.DaDuocKhoaDuyet,
            NgaySVXacNhan = pb.NgaySVXacNhan,
            HanXacNhanSV = !pb.DaDuocKhoaDuyet ? pb.DotThucTap?.HanXacNhanSV : null,
            QuaHanXacNhan = InternshipManagement.DAL.Common.ConfirmationDeadlinePolicy.Overdue(pb, _clock.GetUtcNow()),
            NgayKhoaDuyet = pb.NgayKhoaDuyet,

            GiangVienHD = gv?.HoTen,
            ChuyenMonGV = gv?.ChuyenMon,

            MentorDoanhNghiep = hd?.DaiDienDoanhNghiep?.HoTen,
            ChucVuMentor = hd?.DaiDienDoanhNghiep?.ChucVu,
            DanhGiaMentor = hd?.DanhGia,
        };
    }
}
