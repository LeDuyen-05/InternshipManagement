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
            NhanXetGV = e.NhanXetGV,
            NhanXet = e.NhanXet ?? e.NhanXetGV,
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
            NhanXetGV = e.NhanXetGV,
            NhanXet = e.NhanXet ?? e.NhanXetGV,
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
            NhanXetGV = e.NhanXetGV,
            NhanXet = e.NhanXet ?? e.NhanXetGV,
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
            NhanXetGV = e.NhanXetGV,
            NhanXet = e.NhanXet ?? e.NhanXetGV,
            MaDot = e.MaDot,
            TenDot = e.DotThucTap?.TenDot,
            MaSV = e.MaSV,
            HoTenSinhVien = e.SinhVien?.HoTen ?? string.Empty
        };
    }

    public async Task<bool> DuyetTienDoAsync(string maTienDo, DuyetTienDoRequest request, string? actorMaGV = null, bool isStaff = false)
    {
        var validStatuses = new[] { "DaDuyet", "YeuCauSua" };
        if (!validStatuses.Contains(request.TrangThaiDuyet))
        {
            throw new ArgumentException("Trạng thái duyệt không hợp lệ. Chỉ chấp nhận: DaDuyet, YeuCauSua.");
        }

        var entity = await _tienDoThucTapRepository.GetByIdAsync(maTienDo)
            ?? throw new KeyNotFoundException("Không tìm thấy báo cáo tiến độ.");

        if (entity.TrangThaiDuyet != "DaNop")
        {
            throw new InvalidOperationException("Chỉ có thể duyệt hoặc yêu cầu sửa báo cáo khi ở trạng thái Đã nộp.");
        }

        if (!isStaff)
        {
            if (string.IsNullOrWhiteSpace(actorMaGV) || !await _tienDoThucTapRepository.IsSupervisorAsync(actorMaGV, entity.MaSV))
            {
                throw new UnauthorizedAccessException("Giảng viên không phụ trách hướng dẫn sinh viên này.");
            }
        }

        var nhanXet = request.NhanXet ?? request.NhanXetGV;
        return await _tienDoThucTapRepository.CapNhatTrangThaiDuyetAsync(maTienDo, request.TrangThaiDuyet, nhanXet);
    }

    public async Task<TienDoThucTapDto> NopBaoCaoTienDoAsync(NopBaoCaoRequest request, string? userMaSV = null)
    {
        if (string.IsNullOrWhiteSpace(request.MaTienDo))
        {
            throw new ArgumentException("Mã tiến độ không được để trống.", nameof(request.MaTienDo));
        }

        if (string.IsNullOrWhiteSpace(request.NoiDungBaoCao))
        {
            throw new ArgumentException("Nội dung báo cáo tiến độ không được để trống.", nameof(request.NoiDungBaoCao));
        }

        var existing = await _tienDoThucTapRepository.GetByIdAsync(request.MaTienDo)
            ?? throw new KeyNotFoundException($"Không tìm thấy mốc báo cáo tiến độ có mã {request.MaTienDo}.");

        var currentMaSV = userMaSV ?? request.MaSV;
        if (!string.Equals(existing.MaSV, currentMaSV, StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException("Bạn không có quyền nộp báo cáo cho sinh viên khác.");
        }

        if (existing.TrangThaiDuyet is not ("ChuaNop" or "YeuCauSua"))
        {
            throw new InvalidOperationException("Báo cáo đã nộp/đã duyệt, không thể sửa.");
        }

        existing.NoiDungBaoCao = request.NoiDungBaoCao.Trim();
        existing.NgayNop = DateTime.Now;
        existing.TrangThaiDuyet = "DaNop";

        var entity = await _tienDoThucTapRepository.UpdateAsync(existing);

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
            NhanXet = entity.NhanXet ?? entity.NhanXetGV,
            NhanXetGV = entity.NhanXetGV
        };
    }
}

