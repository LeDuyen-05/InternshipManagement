using InternshipManagement.BLL.DTOs.HoSoNangLuc;
using InternshipManagement.BLL.Exceptions;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;

namespace InternshipManagement.BLL.Services.HoSoNangLuc;

public class HoSoNangLucService : IHoSoNangLucService
{
    private readonly IHoSoNangLucRepository _hoSoRepository;
    private readonly ISinhVienRepository _sinhVienRepository;

    public HoSoNangLucService(
        IHoSoNangLucRepository hoSoRepository,
        ISinhVienRepository sinhVienRepository)
    {
        _hoSoRepository = hoSoRepository;
        _sinhVienRepository = sinhVienRepository;
    }

    public async Task<HoSoNangLucDto?> GetHoSoBySinhVienAsync(string maSV)
    {
        var sv = await _sinhVienRepository.GetByIdAsync(maSV);
        if (sv == null) return null;

        var hoSo = await _hoSoRepository.GetByMaSinhVienAsync(maSV);

        return new HoSoNangLucDto
        {
            MaHoSo = hoSo?.MaHoSo ?? $"HS_{sv.MaSV}",
            MaSinhVien = sv.MaSV,
            HoTen = sv.HoTen,
            Lop = sv.Lop,
            KhoaHoc = sv.KhoaHoc,
            Gpa = sv.Gpa.HasValue ? (double)sv.Gpa.Value : null,
            KyNang = sv.KyNang,

            ChuyenNganh = sv.ChuyenNganh,
            CongNghe = sv.CongNghe,
            DuAnDaThucHien = sv.DuAnDaThucHien,
            NDHoSo = hoSo?.NDHoSo,
            FileCV = hoSo?.FileCV,
            NgayCapNhat = hoSo?.NgayCapNhat ?? DateTime.Now
        };
    }

    public async Task<HoSoNangLucDto> UpdateHoSoAsync(string maSV, UpdateHoSoNangLucRequest request)
    {
        var sv = await _sinhVienRepository.GetByIdAsync(maSV)
            ?? throw new NotFoundException("SinhVien", maSV);

        if (!string.IsNullOrWhiteSpace(request.HoTen)) sv.HoTen = request.HoTen;
        if (!string.IsNullOrWhiteSpace(request.Lop)) sv.Lop = request.Lop;
        if (!string.IsNullOrWhiteSpace(request.KhoaHoc)) sv.KhoaHoc = request.KhoaHoc;
        if (request.Gpa.HasValue) sv.Gpa = (decimal)request.Gpa.Value;
        if (request.KyNang != null) sv.KyNang = request.KyNang;

        if (request.ChuyenNganh != null) sv.ChuyenNganh = request.ChuyenNganh;
        if (request.CongNghe != null) sv.CongNghe = request.CongNghe;
        if (request.DuAnDaThucHien != null) sv.DuAnDaThucHien = request.DuAnDaThucHien;

        _sinhVienRepository.Update(sv);
        await _sinhVienRepository.SaveChangesAsync();

        var hoSo = await _hoSoRepository.GetByMaSinhVienAsync(maSV);
        if (hoSo == null)
        {
            hoSo = new DAL.Entities.HoSoNangLuc
            {
                MaHoSo = "HS_" + sv.MaSV,
                MaSV = sv.MaSV,
                NDHoSo = request.NDHoSo ?? $"{sv.HoTen} - {sv.ChuyenNganh} - Kỹ năng: {sv.KyNang} - Công nghệ: {sv.CongNghe}",
                FileCV = request.FileCV,
                NgayCapNhat = DateTime.Now
            };
            await _hoSoRepository.AddAsync(hoSo);
        }
        else
        {
            if (request.NDHoSo != null) hoSo.NDHoSo = request.NDHoSo;
            if (request.FileCV != null) hoSo.FileCV = request.FileCV;
            hoSo.NgayCapNhat = DateTime.Now;
            _hoSoRepository.Update(hoSo);
        }

        await _hoSoRepository.SaveChangesAsync();

        return new HoSoNangLucDto
        {
            MaHoSo = hoSo.MaHoSo,
            MaSinhVien = sv.MaSV,
            HoTen = sv.HoTen,
            Lop = sv.Lop,
            KhoaHoc = sv.KhoaHoc,
            Gpa = sv.Gpa.HasValue ? (double)sv.Gpa.Value : null,
            KyNang = sv.KyNang,

            ChuyenNganh = sv.ChuyenNganh,
            CongNghe = sv.CongNghe,
            DuAnDaThucHien = sv.DuAnDaThucHien,
            NDHoSo = hoSo.NDHoSo,
            FileCV = hoSo.FileCV,
            NgayCapNhat = hoSo.NgayCapNhat
        };
    }
}
