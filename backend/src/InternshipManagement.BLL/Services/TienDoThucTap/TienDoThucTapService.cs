using InternshipManagement.BLL.DTOs.TienDoThucTap;
using InternshipManagement.BLL.Common;
using InternshipManagement.DAL.Repositories;
using TienDoEntity = InternshipManagement.DAL.Entities.TienDoThucTap;

namespace InternshipManagement.BLL.Services.TienDoThucTap;

public class TienDoThucTapService : ITienDoThucTapService
{
    private readonly ITienDoThucTapRepository _tienDoThucTapRepository;
    private readonly TimeProvider _clock;

    public TienDoThucTapService(ITienDoThucTapRepository tienDoThucTapRepository, TimeProvider? clock = null)
    {
        _tienDoThucTapRepository = tienDoThucTapRepository;
        _clock = clock ?? TimeProvider.System;
    }

    public async Task<IReadOnlyList<TienDoThucTapDto>> GetTienDoBySinhVienAsync(string maSV)
    {
        var entities = await _tienDoThucTapRepository.GetBySinhVienAsync(maSV);
        return entities.Select(e => new TienDoThucTapDto
        {
            MaTienDo = e.MaTienDo,
            NopTre = e.NopTre,
            HanNopBoSung = e.HanNopBoSung,
            MocThoiGian = e.MocThoiGian,
            NoiDungBaoCao = e.NoiDungBaoCao,
            NgayNop = e.NgayNop,
            TrangThaiDuyet = e.TrangThaiDuyet,
            MaPhanBoLuuTru = e.MaPhanBoLuuTru,
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
            NopTre = e.NopTre,
            HanNopBoSung = e.HanNopBoSung,
            MocThoiGian = e.MocThoiGian,
            NoiDungBaoCao = e.NoiDungBaoCao,
            NgayNop = e.NgayNop,
            TrangThaiDuyet = e.TrangThaiDuyet,
            MaPhanBoLuuTru = e.MaPhanBoLuuTru,
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
            NopTre = e.NopTre,
            HanNopBoSung = e.HanNopBoSung,
            MocThoiGian = e.MocThoiGian,
            NoiDungBaoCao = e.NoiDungBaoCao,
            NgayNop = e.NgayNop,
            TrangThaiDuyet = e.TrangThaiDuyet,
            MaPhanBoLuuTru = e.MaPhanBoLuuTru,
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
            NopTre = e.NopTre,
            HanNopBoSung = e.HanNopBoSung,
            MocThoiGian = e.MocThoiGian,
            NoiDungBaoCao = e.NoiDungBaoCao,
            NgayNop = e.NgayNop,
            TrangThaiDuyet = e.TrangThaiDuyet,
            MaPhanBoLuuTru = e.MaPhanBoLuuTru,
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
            if (string.IsNullOrWhiteSpace(actorMaGV) || !await _tienDoThucTapRepository.IsSupervisorAsync(actorMaGV, entity.MaSV, entity.MaDot))
            {
                throw new UnauthorizedAccessException("Giảng viên không phụ trách hướng dẫn sinh viên này.");
            }
        }

        var nhanXet = request.NhanXet ?? request.NhanXetGV;
        if (entity.MaPhanBoLuuTru != null)
            throw new InvalidOperationException("Báo cáo đã lưu trữ khi đổi nơi thực tập; chỉ xem lịch sử, không duyệt lại thành báo cáo của nơi mới.");
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

        if (existing.MaPhanBoLuuTru != null)
            throw new InvalidOperationException("Báo cáo đã lưu trữ khi đổi nơi thực tập; không sửa đè lịch sử, liên hệ GVHD/Khoa để có mốc báo cáo mới.");
        if (existing.TrangThaiDuyet is not ("ChuaNop" or "YeuCauSua"))
        {
            throw new InvalidOperationException("Báo cáo đã nộp/đã duyệt, không thể sửa.");
        }

        // Chỉ nộp báo cáo tuần khi đã có quyết định tiếp nhận và sinh viên đã xác nhận nhận việc
        var trangThaiPhanBo = await _tienDoThucTapRepository.GetTrangThaiPhanBoAsync(existing.MaSV, existing.MaDot);
        if (trangThaiPhanBo == null)
            throw new InvalidOperationException("Bạn chưa có quyết định tiếp nhận thực tập trong đợt này nên chưa thể nộp báo cáo tiến độ.");
        if (trangThaiPhanBo == "ChuaNhanViec")
            throw new InvalidOperationException("Bạn cần xác nhận nhận quyết định tiếp nhận (mục Lịch phỏng vấn & Phân bổ) trước khi nộp báo cáo tiến độ.");
        if (trangThaiPhanBo != "DangThucTap")
            throw new InvalidOperationException("Chỉ được nộp tiến độ khi đang thực tập và nơi thực tập đã được Khoa chốt.");

        var placement = await _tienDoThucTapRepository.GetActivePlacementAsync(existing.MaSV, existing.MaDot);
        var verifiedStart = placement == null ? null : PlacementPeriod.Resolve(placement).Start;
        if (verifiedStart.HasValue && _clock.GetUtcNow() < InternshipDeadlinePolicy.StartOfDay(verifiedStart.Value))
            throw new InvalidOperationException("Chưa đến ngày bắt đầu tại DN đã được Khoa xác minh, chưa được nộp tiến độ.");
        if (!verifiedStart.HasValue && existing.DotThucTap != null && _clock.GetUtcNow() < InternshipDeadlinePolicy.StartOfDay(existing.DotThucTap.ThoiGianBD))
            throw new InvalidOperationException("Chưa đến ngày bắt đầu thực tập của đợt, chưa được nộp tiến độ.");

        if (InternshipDeadlinePolicy.SubmissionClosed(existing, _clock.GetUtcNow()))
            throw new InvalidOperationException("Đã hết hạn nộp báo cáo. Sinh viên phải lên Khoa trình bày lý do; chỉ được nộp khi Khoa chấp thuận và mở hạn bổ sung.");
        existing.NoiDungBaoCao = request.NoiDungBaoCao.Trim();
        existing.NgayNop = _clock.GetUtcNow().ToOffset(InternshipDeadlinePolicy.VietnamOffset).DateTime;
        existing.NopTre = InternshipDeadlinePolicy.IsLate(existing.NgayNop.Value, existing.MocThoiGian);
        existing.TrangThaiDuyet = "DaNop";

        var entity = await _tienDoThucTapRepository.UpdateAsync(existing);

        return new TienDoThucTapDto
        {
            MaTienDo = entity.MaTienDo,
            NopTre = entity.NopTre,
            HanNopBoSung = entity.HanNopBoSung,
            MaDot = entity.MaDot,
            TenDot = entity.DotThucTap?.TenDot,
            MaSV = entity.MaSV,
            MocThoiGian = entity.MocThoiGian,
            NoiDungBaoCao = entity.NoiDungBaoCao,
            NgayNop = entity.NgayNop,
            TrangThaiDuyet = entity.TrangThaiDuyet,
            MaPhanBoLuuTru = entity.MaPhanBoLuuTru,
            NhanXet = entity.NhanXet ?? entity.NhanXetGV,
            NhanXetGV = entity.NhanXetGV
        };
    }
}

