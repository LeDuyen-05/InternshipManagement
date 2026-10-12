using InternshipManagement.BLL.DTOs.TienDoThucTap;
using InternshipManagement.DAL.Repositories;
using TienDoEntity = InternshipManagement.DAL.Entities.TienDoThucTap;

namespace InternshipManagement.BLL.Services.TienDoThucTap;

public class TienDoThucTapService : ITienDoThucTapService
{
    private readonly ITienDoThucTapRepository _tienDoThucTapRepository;

    public TienDoThucTapService(ITienDoThucTapRepository tienDoThucTapRepository)
    {
        _tienDoThucTapRepository = tienDoThucTapRepository;
    }

    public async Task<IReadOnlyList<TienDoThucTapDto>> GetTienDoBySinhVienAsync(string maSV)
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
            TenDot = e.DotThucTap?.TenDot,
            MaSV = e.MaSV,
            HoTenSinhVien = e.SinhVien?.HoTen ?? string.Empty
        }).ToList();
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
            TenDot = e.DotThucTap?.TenDot,
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
            TenDot = e.DotThucTap?.TenDot,
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
            TenDot = e.DotThucTap?.TenDot,
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

    public async Task<TienDoThucTapDto> NopBaoCaoTienDoAsync(NopBaoCaoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NoiDungBaoCao))
        {
            throw new ArgumentException("Nội dung báo cáo tiến độ không được để trống.");
        }

        TienDoEntity entity;

        if (!string.IsNullOrWhiteSpace(request.MaTienDo))
        {
            var existing = await _tienDoThucTapRepository.GetByIdAsync(request.MaTienDo);
            if (existing != null)
            {
                existing.NoiDungBaoCao = request.NoiDungBaoCao;
                existing.NgayNop = DateTime.Now;
                existing.TrangThaiDuyet = "DaNop"; // Đã nộp, chờ giảng viên phê duyệt
                entity = await _tienDoThucTapRepository.UpdateAsync(existing);
            }
            else
            {
                entity = new TienDoEntity
                {
                    MaTienDo = request.MaTienDo,
                    MaSV = request.MaSV,
                    MaDot = request.MaDot,
                    MocThoiGian = request.MocThoiGian != default ? request.MocThoiGian : DateTime.Now,
                    NoiDungBaoCao = request.NoiDungBaoCao,
                    NgayNop = DateTime.Now,
                    TrangThaiDuyet = "DaNop"
                };
                entity = await _tienDoThucTapRepository.CreateAsync(entity);
            }
        }
        else
        {
            var newId = "TD" + DateTime.Now.ToString("yyMMddHHmmss");
            entity = new TienDoEntity
            {
                MaTienDo = newId,
                MaSV = request.MaSV,
                MaDot = request.MaDot,
                MocThoiGian = request.MocThoiGian != default ? request.MocThoiGian : DateTime.Now,
                NoiDungBaoCao = request.NoiDungBaoCao,
                NgayNop = DateTime.Now,
                TrangThaiDuyet = "DaNop"
            };
            entity = await _tienDoThucTapRepository.CreateAsync(entity);
        }

        return new TienDoThucTapDto
        {
            MaTienDo = entity.MaTienDo,
            MaDot = entity.MaDot,
            TenDot = entity.DotThucTap?.TenDot,
            MaSV = entity.MaSV,
            MocThoiGian = entity.MocThoiGian,
            NoiDungBaoCao = entity.NoiDungBaoCao,
            NgayNop = entity.NgayNop,
            TrangThaiDuyet = entity.TrangThaiDuyet,
        };
    }
}

