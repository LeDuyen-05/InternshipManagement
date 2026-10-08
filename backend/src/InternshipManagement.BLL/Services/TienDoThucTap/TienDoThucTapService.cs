using InternshipManagement.BLL.DTOs.TienDoThucTap;
using InternshipManagement.DAL.Repositories;

namespace InternshipManagement.BLL.Services.TienDoThucTap;

public class TienDoThucTapService : ITienDoThucTapService
{
    private readonly ITienDoThucTapRepository _tienDoThucTapRepository;

    public TienDoThucTapService(ITienDoThucTapRepository tienDoThucTapRepository)
    {
        _tienDoThucTapRepository = tienDoThucTapRepository;
    }

    public async Task<IEnumerable<TienDoThucTapDto>> GetTienDoBySinhVienAsync(string maSV)
    {
        var entities = await _tienDoThucTapRepository.GetBySinhVienAsync(maSV);
        return entities.Select(e => new TienDoThucTapDto
        {
            MaTienDo = e.MaTienDo,
            MocThoiGian = e.MocThoiGian,
            NoiDungBaoCao = e.NoiDungBaoCao,
            NgayNop = e.NgayNop,
            TrangThaiDuyet = e.TrangThaiDuyet,
            MaDot = e.MaDot,
            MaSV = e.MaSV,
            HoTenSinhVien = e.SinhVien?.HoTen ?? string.Empty
        });
    }

    public async Task<IEnumerable<TienDoThucTapDto>> GetTienDoBySinhVienAndDotAsync(string maSV, string maDot)
    {
        var entities = await _tienDoThucTapRepository.GetBySinhVienAndDotAsync(maSV, maDot);
        return entities.Select(e => new TienDoThucTapDto
        {
            MaTienDo = e.MaTienDo,
            MocThoiGian = e.MocThoiGian,
            NoiDungBaoCao = e.NoiDungBaoCao,
            NgayNop = e.NgayNop,
            TrangThaiDuyet = e.TrangThaiDuyet,
            MaDot = e.MaDot,
            MaSV = e.MaSV,
            HoTenSinhVien = e.SinhVien?.HoTen ?? string.Empty
        });
    }

    public async Task<IEnumerable<TienDoThucTapDto>> GetBaoCaoChoDuyetByGiangVienAsync(string maGV)
    {
        var entities = await _tienDoThucTapRepository.GetBaoCaoChoDuyetByGiangVienAsync(maGV);
        return entities.Select(e => new TienDoThucTapDto
        {
            MaTienDo = e.MaTienDo,
            MocThoiGian = e.MocThoiGian,
            NoiDungBaoCao = e.NoiDungBaoCao,
            NgayNop = e.NgayNop,
            TrangThaiDuyet = e.TrangThaiDuyet,
            MaDot = e.MaDot,
            MaSV = e.MaSV,
            HoTenSinhVien = e.SinhVien?.HoTen ?? string.Empty
        });
    }

    public async Task<TienDoThucTapDto?> GetChiTietTienDoAsync(string maTienDo)
    {
        var e = await _tienDoThucTapRepository.GetChiTietAsync(maTienDo);
        if (e == null) return null;

        return new TienDoThucTapDto
        {
            MaTienDo = e.MaTienDo,
            MocThoiGian = e.MocThoiGian,
            NoiDungBaoCao = e.NoiDungBaoCao,
            NgayNop = e.NgayNop,
            TrangThaiDuyet = e.TrangThaiDuyet,
            MaDot = e.MaDot,
            MaSV = e.MaSV,
            HoTenSinhVien = e.SinhVien?.HoTen ?? string.Empty
        };
    }

    public async Task<bool> DuyetTienDoAsync(string maTienDo, DuyetTienDoRequest request)
    {
        var validStatuses = new[] { "ChuaNop", "DaNop", "DaDuyet", "YeuCauSua" };
        if (!validStatuses.Contains(request.TrangThaiDuyet))
        {
            throw new ArgumentException("Trạng thái duyệt không hợp lệ.");
        }

        return await _tienDoThucTapRepository.CapNhatTrangThaiDuyetAsync(maTienDo, request.TrangThaiDuyet);
    }
}
