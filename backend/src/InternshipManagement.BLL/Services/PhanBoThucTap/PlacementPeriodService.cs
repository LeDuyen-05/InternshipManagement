using System.Data;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.PhanBo;

public record SavePlacementPeriodRequest(string MaDot, DateTime? NgayBatDau, DateTime? NgayKetThuc,
    string LyDo, string CanCu, int PhienBanThoiGian);

public class PlacementPeriodService(AppDbContext db, TimeProvider clock)
{
    public async Task SaveAsync(string id, SavePlacementPeriodRequest request, string actor)
    {
        if (string.IsNullOrWhiteSpace(actor) || actor.Length > 20) throw new UnauthorizedAccessException();
        if (string.IsNullOrWhiteSpace(request.LyDo) || string.IsNullOrWhiteSpace(request.CanCu)
            || request.LyDo.Trim().Length > 1000 || request.CanCu.Trim().Length > 1000)
            throw new ArgumentException("Khoa phải ghi lý do và căn cứ điều chỉnh, tối đa 1000 ký tự mỗi mục.");
        if (!request.NgayBatDau.HasValue || !request.NgayKetThuc.HasValue || request.NgayBatDau.Value == default || request.NgayKetThuc.Value.Date < request.NgayBatDau.Value.Date)
            throw new ArgumentException("Cần đủ ngày bắt đầu/kết thúc hợp lệ; ngày kết thúc không trước ngày bắt đầu.");
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var round = await db.DotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaSo == request.MaDot)
            ?? throw new KeyNotFoundException("Không tìm thấy đợt thực tập.");
        var today = clock.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).Date;
        if (round.TrangThaiDanhSachNoi == "ChinhThuc" || await db.DanhSachThucTapChinhThucs.AnyAsync(x => x.MaDot == request.MaDot))
            throw new InvalidOperationException("Danh sách thực tập chính thức đã công bố/chốt; không chỉnh sửa thời gian thực tập.");
        if (round.ThoiGianBD != default && today >= round.ThoiGianBD.Date)
            throw new InvalidOperationException("Đợt thực tập đã bắt đầu theo lịch công bố; không chỉnh sửa thời gian thực tập.");
        var placement = await db.PhanBoThucTaps.SingleOrDefaultAsync(x => x.MaPhanBo == id && x.MaDot == request.MaDot)
            ?? throw new KeyNotFoundException("Không tìm thấy phân bổ trong đợt đang chọn.");
        if (!placement.DaDuocKhoaDuyet || placement.TrangThai is not ("ChuaNhanViec" or "DangThucTap"))
            throw new InvalidOperationException("Chỉ cập nhật nơi chính thức chưa nhận việc/đang thực tập; không sửa nơi đã hủy/hoàn thành hoặc chưa Khoa chốt.");
        if (placement.PhienBanThoiGian != request.PhienBanThoiGian) throw new InvalidOperationException("Thời gian đã đổi. Tải lại trước khi lưu.");
        if (await db.PhanBoThucTaps.AnyAsync(x => x.MaDot == placement.MaDot && x.MaSinhVien == placement.MaSinhVien && x.TrangThai != "Huy" && x.MaPhanBo != id))
            throw new InvalidOperationException("Có nhiều nơi hiệu lực trong đợt, Khoa cần kiểm tra dữ liệu trước.");
        if (await db.PhieuChamDiems.AnyAsync(x => x.MaSV == placement.MaSinhVien && x.MaDot == placement.MaDot))
            throw new InvalidOperationException("SV đã có phiếu điểm, cần Khoa xử lý riêng trước khi thay đổi thời gian.");
        var oldStart = placement.NgayBatDauThucTap ?? round.ThoiGianBD.Date;
        var oldEnd = placement.NgayKetThucThucTap ?? round.ThoiGianKT.Date;
        var old = $"{oldStart:yyyy-MM-dd} → {oldEnd:yyyy-MM-dd}";
        placement.NgayBatDauThucTap = request.NgayBatDau.Value.Date;
        placement.NgayKetThucThucTap = request.NgayKetThuc.Value.Date;
        placement.PhienBanThoiGian++;
        db.NhatKyDieuChinhThucTaps.Add(new NhatKyDieuChinhThucTap {
            MaNhatKy = DAL.Common.IdGenerator.New("DC"), MaDot = placement.MaDot, MaSV = placement.MaSinhVien,
            MaPhanBo = id, Loai = "XacMinhThoiGian", LyDo = request.LyDo.Trim(), CanCu = request.CanCu.Trim(),
            NoiDung = $"Thời gian thực tập riêng: [{old}] → [{placement.NgayBatDauThucTap:yyyy-MM-dd} → {placement.NgayKetThucThucTap:yyyy-MM-dd}].",
            NguoiThucHien = actor, ThoiDiem = clock.GetUtcNow()
        });
        await db.SaveChangesAsync(); if (tx != null) await tx.CommitAsync();
    }
}
