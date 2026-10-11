using InternshipManagement.BLL.DTOs.DangKyThucTap;
using InternshipManagement.BLL.Exceptions;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;

namespace InternshipManagement.BLL.Services.DangKyThucTap;

public class DangKyThucTapService : IDangKyThucTapService
{
    private readonly IDangKyThucTapRepository _dangKyRepo;
    private readonly ICongTyRepository _congTyRepo;
    private readonly ISinhVienRepository _sinhVienRepo;

    public DangKyThucTapService(
        IDangKyThucTapRepository dangKyRepo,
        ICongTyRepository congTyRepo,
        ISinhVienRepository sinhVienRepo)
    {
        _dangKyRepo = dangKyRepo;
        _congTyRepo = congTyRepo;
        _sinhVienRepo = sinhVienRepo;
    }

    public async Task<IReadOnlyList<CongTyDto>> GetDanhSachCongTyTuyenDungAsync()
    {
        var list = await _congTyRepo.GetDanhSachTuyenDungAsync();
        return list.Select(c => new CongTyDto
        {
            MaCongTy = c.MaCongTy,
            TenCongTy = c.TenCongTy,
            ViTriTuyen = c.ViTriTuyen,
            ThoiGian = c.ThoiGian,
            SoLuongNhan = c.SoLuongNhan,
            YeuCau = c.YeuCau,
            TrangThai = c.TrangThai
        }).ToList();
    }

    public async Task<CongTyDto> DeXuatCongTyMoiAsync(DeXuatCongTyRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TenCongTy))
            throw new ArgumentException("Tên công ty không được để trống.");

        var maCT = "CT" + DateTime.Now.ToString("yyMMddHHmmss");
        var congTy = new CongTy
        {
            MaCongTy = maCT,
            TenCongTy = request.TenCongTy,
            ViTriTuyen = request.ViTriTuyen ?? "Thực tập sinh",
            ThoiGian = request.ThoiGian ?? "3 tháng",
            SoLuongNhan = request.SoLuongNhan ?? 1,
            YeuCau = request.YeuCau ?? "Theo thỏa thuận",
            TrangThai = "ChoDuyet"
        };

        await _congTyRepo.AddAsync(congTy);
        await _congTyRepo.SaveChangesAsync();

        return new CongTyDto
        {
            MaCongTy = congTy.MaCongTy,
            TenCongTy = congTy.TenCongTy,
            ViTriTuyen = congTy.ViTriTuyen,
            ThoiGian = congTy.ThoiGian,
            SoLuongNhan = congTy.SoLuongNhan,
            YeuCau = congTy.YeuCau,
            TrangThai = congTy.TrangThai
        };
    }

    public async Task<IReadOnlyList<DangKyThucTapDto>> GetDanhSachDangKyBySinhVienAsync(string maSV)
    {
        var list = await _dangKyRepo.GetBySinhVienAsync(maSV);
        return list.Select(d => new DangKyThucTapDto
        {
            MaDK = d.MaDK,
            MaSV = d.MaSV,
            MaCongTy = d.MaCongTy,
            TenCongTy = d.CongTy?.TenCongTy ?? d.MaCongTy,
            ViTriTuyen = d.CongTy?.ViTriTuyen,
            MaDot = d.MaDot,
            TenDot = d.DotThucTap?.TenDot,
            NgayDangKy = d.NgayDangKy,
            ThuTuUuTien = d.ThuTuUuTien,
            TrangThai = d.TrangThai
        }).ToList();
    }

    public async Task<DangKyThucTapDto> DangKyNguyenVongAsync(CreateDangKyThucTapRequest request)
    {
        var sv = await _sinhVienRepo.GetByIdAsync(request.MaSV)
            ?? throw new NotFoundException("SinhVien", request.MaSV);

        var congTy = await _congTyRepo.GetByIdAsync(request.MaCongTy)
            ?? throw new NotFoundException("CongTy", request.MaCongTy);

        var already = await _dangKyRepo.HasRegisteredAsync(request.MaSV, request.MaCongTy, request.MaDot);
        if (already)
            throw new InvalidOperationException("Sinh viên đã đăng ký công ty này trong đợt hiện tại.");

        var maDK = "DK" + DateTime.Now.ToString("yyMMddHHmmss");
        var dangKy = new DAL.Entities.DangKyThucTap
        {
            MaDK = maDK,
            MaSV = request.MaSV,
            MaCongTy = request.MaCongTy,
            MaDot = request.MaDot,
            NgayDangKy = DateTime.Now,
            ThuTuUuTien = request.ThuTuUuTien,
            TrangThai = "ChoDuyet"
        };

        await _dangKyRepo.AddAsync(dangKy);
        await _dangKyRepo.SaveChangesAsync();

        return new DangKyThucTapDto
        {
            MaDK = dangKy.MaDK,
            MaSV = dangKy.MaSV,
            MaCongTy = dangKy.MaCongTy,
            TenCongTy = congTy.TenCongTy,
            ViTriTuyen = congTy.ViTriTuyen,
            MaDot = dangKy.MaDot,
            NgayDangKy = dangKy.NgayDangKy,
            ThuTuUuTien = dangKy.ThuTuUuTien,
            TrangThai = dangKy.TrangThai
        };
    }

    public async Task<bool> HuyDangKyAsync(string maDK)
    {
        var dangKy = await _dangKyRepo.GetByIdAsync(maDK);
        if (dangKy == null) return false;

        _dangKyRepo.Delete(dangKy);
        await _dangKyRepo.SaveChangesAsync();
        return true;
    }
}
