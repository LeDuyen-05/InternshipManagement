using System.Data;
using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.PhanBo;

public record ChotPhanBoRequest(string MaDot);

public class KhoaChotPhanBoService(AppDbContext db)
{
    public async Task<object> GetListAsync(string maDot)
    {
        if (string.IsNullOrWhiteSpace(maDot)) throw new ArgumentException("Vui lòng chọn đợt thực tập.");
        if (!await db.DotThucTaps.AnyAsync(d => d.MaSo == maDot)) throw new KeyNotFoundException("Không tìm thấy đợt thực tập.");
        return await db.PhanBoThucTaps.AsNoTracking()
            .Where(p => p.MaDot == maDot && p.TrangThai != "Huy" && p.HoSoTuTim == null)
            .OrderBy(p => p.DaDuocKhoaDuyet).ThenBy(p => p.NgaySVXacNhan).ThenBy(p => p.MaSinhVien)
            .Select(p => new
            {
                p.MaPhanBo, p.MaSinhVien, sinhVien = p.SinhVien.HoTen, p.SinhVien.Lop,
                p.MaCongTy, p.MaViTri, viTri = p.ViTri == null ? null : p.ViTri.TenViTri, congTy = p.CongTy.TenCongTy, p.MaDot, dot = p.DotThucTap.TenDot,
                p.TrangThai, p.DaDuocKhoaDuyet, p.NgaySVXacNhan, p.NgayKhoaDuyet, p.NguoiKhoaDuyet,
            }).ToListAsync();
    }

    public async Task ChotAsync(string maPhanBo, string maDot, string actor)
    {
        if (string.IsNullOrWhiteSpace(maDot)) throw new ArgumentException("Vui lòng chọn đợt thực tập.");
        if (string.IsNullOrWhiteSpace(actor) || actor.Length > 20) throw new UnauthorizedAccessException();
        await using var transaction = db.Database.IsRelational()
            ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var placement = await db.PhanBoThucTaps.Include(p => p.DotThucTap).Include(p => p.CongTy).Include(p => p.HoSoTuTim)
            .FirstOrDefaultAsync(p => p.MaPhanBo == maPhanBo)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ tiếp nhận.");
        if (placement.MaDot != maDot) throw new InvalidOperationException("Hồ sơ không thuộc đợt đang chọn. Vui lòng tải lại danh sách.");
        if (placement.HoSoTuTim != null) throw new InvalidOperationException("Hồ sơ tự tìm được công nhận tại tab Tự tìm, không chốt lại ở đây.");
        if (placement.DotThucTap.TrangThai is not ("ChuaBatDau" or "DangDienRa"))
            throw new InvalidOperationException("Đợt thực tập không còn cho phép chốt phân bổ.");
        // Request lặp lại không ghi đè người duyệt/thời điểm đã chốt.
        if (placement.DaDuocKhoaDuyet && placement.NgayKhoaDuyet.HasValue && placement.TrangThai == "DangThucTap") return;
        if (placement.DaDuocKhoaDuyet || placement.TrangThai != "ChoKhoaDuyet" || !placement.NgaySVXacNhan.HasValue)
            throw new InvalidOperationException("Chỉ chốt hồ sơ DN đã tiếp nhận và sinh viên đã xác nhận, đang chờ Khoa duyệt.");
        if (placement.CongTy.TrangThai != "DaDuyet") throw new InvalidOperationException("Công ty chưa được Khoa phê duyệt.");
        if (!await db.DangKyThucTaps.AnyAsync(d => d.MaSV == placement.MaSinhVien && d.MaDot == maDot
                && d.MaCongTy == placement.MaCongTy && d.TrangThai == "DaDuyet"))
            throw new InvalidOperationException("Nguyện vọng tiếp nhận không còn hợp lệ. Vui lòng kiểm tra hồ sơ.");
        if (await db.PhanBoThucTaps.AnyAsync(p => p.MaSinhVien == placement.MaSinhVien && p.MaDot == maDot
                && p.MaPhanBo != maPhanBo && p.TrangThai != "Huy"))
            throw new InvalidOperationException("Sinh viên đang có hồ sơ tiếp nhận khác trong đợt.");
        var capacity = await InternshipManagement.DAL.Common.CompanyRoundCapacity.LimitAsync(db, placement.MaCongTy, maDot, placement.CongTy.SoLuongNhan);
        if (capacity > 0 && await db.PhanBoThucTaps.CountAsync(p => p.MaCongTy == placement.MaCongTy && p.MaDot == maDot && p.TrangThai != "Huy") > capacity)
            throw new InvalidOperationException("Số lượng tiếp nhận vượt chỉ tiêu công ty; Khoa cần kiểm tra trước khi chốt.");
        if (placement.MaViTri != null)
        {
            var position = await db.ViTriTheoDots.SingleOrDefaultAsync(x => x.MaViTri == placement.MaViTri && x.MaCongTy == placement.MaCongTy && x.MaDot == maDot)
                ?? throw new InvalidOperationException("Vị trí tiếp nhận không còn thuộc kế hoạch.");
            if (await db.PhanBoThucTaps.CountAsync(x => x.MaViTri == position.MaViTri && x.MaDot == maDot && x.TrangThai != "Huy") > position.SoLuongNhan)
                throw new InvalidOperationException("Số tiếp nhận vượt chỉ tiêu vị trí; Khoa cần rà trước khi chốt.");
        }
        placement.DaDuocKhoaDuyet = true;
        placement.TrangThai = "DangThucTap";
        placement.NgayKhoaDuyet = DateTime.Now;
        placement.NguoiKhoaDuyet = actor;
        await db.SaveChangesAsync();
        if (transaction != null) await transaction.CommitAsync();
    }
}
