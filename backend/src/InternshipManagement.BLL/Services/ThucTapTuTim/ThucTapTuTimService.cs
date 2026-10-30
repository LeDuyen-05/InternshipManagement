using System.Data;
using InternshipManagement.BLL.DTOs.ThucTapTuTim;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Common;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.ThucTapTuTim;

public class ThucTapTuTimService(AppDbContext db)
{
    private async Task CheckRoundAsync(string maDot)
    {
        var round = await db.DotThucTaps.SingleOrDefaultAsync(x => x.MaSo == maDot)
            ?? throw new KeyNotFoundException("Không tìm thấy đợt thực tập.");
        if (round.TrangThai != "DangDienRa") throw new InvalidOperationException("Đợt này không mở tiếp nhận hồ sơ tự tìm.");
    }

    private async Task CheckPlacementAsync(string maSV, string maDot)
    {
        if (await db.PhanBoThucTaps.AnyAsync(x => x.MaSinhVien == maSV && x.MaDot == maDot && x.NgayHuy != null))
            throw new InvalidOperationException("Nơi cũ đã được Khoa xử lý hủy/đổi. Cần trình hồ sơ trực tiếp để Khoa phân bổ lại trong hạn, không đi vòng qua hồ sơ tự tìm.");
        if (await db.PhanBoThucTaps.AnyAsync(x => x.MaSinhVien == maSV && x.MaDot == maDot && x.TrangThai != "Huy"))
            throw new InvalidOperationException("Sinh viên đã có nơi thực tập còn hiệu lực trong đợt này.");
        if (await db.PhieuChamDiems.AnyAsync(x => x.MaSV == maSV && x.MaDot == maDot))
            throw new InvalidOperationException("Sinh viên đã có phiếu điểm trong đợt này; liên hệ Khoa để kiểm tra lịch sử.");
    }

    private static string Required(string? value, int maximum, string label)
    {
        var result = value?.Trim() ?? "";
        if (result.Length == 0 || result.Length > maximum) throw new ArgumentException($"{label} bắt buộc và không vượt {maximum} ký tự.");
        return result;
    }

    public async Task<List<DeXuatThucTapTuTim>> GetMineAsync(string maSV, string maDot) =>
        await db.DeXuatThucTapTuTims.AsNoTracking().Where(x => x.MaSV == maSV && x.MaDot == maDot)
            .OrderByDescending(x => x.NgayGui).ToListAsync();

    public async Task<object> GetForFacultyAsync(string? maDot) => await (
        from item in db.DeXuatThucTapTuTims.AsNoTracking()
        join student in db.SinhViens on item.MaSV equals student.MaSV
        where maDot == null || item.MaDot == maDot
        orderby item.NgayGui descending
        select new { HoSo = item, HoTen = student.HoTen,
            SoDaiDien = db.DaiDienDoanhNghieps.Count(d => d.MaCongTy == item.MaCongTy),
            TaiKhoanDNHoatDong = db.TaiKhoans.Count(a => a.MaVaiTro == "VT05" && a.TrangThai == "HoatDong"
                && db.DaiDienDoanhNghieps.Any(d => d.MaSo == a.MaDaiDien && d.MaCongTy == item.MaCongTy)) }).ToListAsync();

    public async Task<DeXuatThucTapTuTim> SubmitAsync(string maSV, GuiHoSoTuTimRequest request)
    {
        var item = new DeXuatThucTapTuTim
        {
            MaHoSo = IdGenerator.New("TT"), MaSV = maSV,
            MaDot = Required(request.MaDot, 20, "Đợt"),
            MaCongTy = string.IsNullOrWhiteSpace(request.MaCongTy) ? null : request.MaCongTy.Trim(),
            TenCongTy = Required(request.TenCongTy, 200, "Tên công ty"),
            DiaChi = Required(request.DiaChi, 500, "Địa chỉ"),
            ViTri = Required(request.ViTri, 200, "Vị trí"),
            NguoiLienHe = Required(request.NguoiLienHe, 200, "Người liên hệ"),
            LienHe = Required(request.LienHe, 200, "Email/số điện thoại liên hệ"),
            NgayBatDau = request.NgayBatDau.Date, NgayKetThuc = request.NgayKetThuc.Date, NgayGui = DateTime.Now
        };
        if (!request.DaDuocTiepNhan) throw new ArgumentException("Chỉ khai báo luồng này khi đã được doanh nghiệp tiếp nhận bên ngoài hệ thống.");
        if (item.NgayBatDau == default || item.NgayKetThuc < item.NgayBatDau)
            throw new ArgumentException("Thời gian thực tập không hợp lệ.");
        await using var transaction = db.Database.IsRelational()
            ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        await CheckRoundAsync(item.MaDot);
        if (!await db.SinhViens.AnyAsync(x => x.MaSV == maSV)) throw new KeyNotFoundException("Tài khoản chưa liên kết sinh viên hợp lệ.");
        await CheckPlacementAsync(maSV, item.MaDot);
        if (await db.DeXuatThucTapTuTims.AnyAsync(x => x.MaSV == maSV && x.MaDot == item.MaDot && x.TrangThai == "ChoDuyet"))
            throw new InvalidOperationException("Bạn đã có hồ sơ tự tìm chờ Khoa duyệt trong đợt này.");
        if (item.MaCongTy != null && !await db.CongTys.AnyAsync(x => x.MaCongTy == item.MaCongTy && x.TrangThai == "DaDuyet"))
            throw new ArgumentException("Công ty đã chọn không tồn tại hoặc chưa được duyệt.");
        db.DeXuatThucTapTuTims.Add(item);
        await db.SaveChangesAsync();
        if (transaction != null) await transaction.CommitAsync();
        return item;
    }

    public async Task<DeXuatThucTapTuTim> ReviewAsync(string maHoSo, string actor, DuyetHoSoTuTimRequest request)
    {
        if (request.TrangThai is not ("DaDuyet" or "TuChoi")) throw new ArgumentException("Chỉ chọn duyệt hoặc từ chối.");
        var reason = request.LyDo?.Trim();
        if (reason?.Length > 1000 || (request.TrangThai == "TuChoi" && string.IsNullOrWhiteSpace(reason)))
            throw new ArgumentException("Cần lý do từ chối, tối đa 1000 ký tự.");
        await using var transaction = db.Database.IsRelational()
            ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var item = await db.DeXuatThucTapTuTims.SingleOrDefaultAsync(x => x.MaHoSo == maHoSo)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ tự tìm.");
        if (item.TrangThai == request.TrangThai) return item;
        if (item.TrangThai != "ChoDuyet") throw new InvalidOperationException("Hồ sơ đã xử lý, không được duyệt/từ chối lại theo hướng khác.");
        await CheckRoundAsync(item.MaDot);
        if (request.TrangThai == "DaDuyet")
        {
            await CheckPlacementAsync(item.MaSV, item.MaDot);
            var companyId = string.IsNullOrWhiteSpace(request.MaCongTy) ? item.MaCongTy : request.MaCongTy.Trim();
            CongTy company;
            if (companyId != null)
            {
                company = await db.CongTys.SingleOrDefaultAsync(x => x.MaCongTy == companyId)
                    ?? throw new KeyNotFoundException("Không tìm thấy công ty đã chọn.");
                if (company.TrangThai != "DaDuyet") throw new InvalidOperationException("Công ty chưa được Khoa công nhận hoặc đang bị khóa.");
                var count = await db.PhanBoThucTaps.CountAsync(x => x.MaCongTy == companyId && x.MaDot == item.MaDot && x.TrangThai != "Huy");
                var capacity = await CompanyRoundCapacity.LimitAsync(db, companyId, item.MaDot, company.SoLuongNhan);
                if (capacity > 0 && count >= capacity)
                    throw new InvalidOperationException("Công ty đã đủ chỉ tiêu trong đợt; Khoa cần xác minh chỉ tiêu trước khi công nhận thêm.");
            }
            else
            {
                if (await db.CongTys.AnyAsync(x => x.TenCongTy.Trim().ToLower() == item.TenCongTy.ToLower()))
                    throw new InvalidOperationException("Tên công ty đã tồn tại. Khoa hãy chọn đúng công ty có sẵn hoặc kiểm tra lại hồ sơ.");
                company = new CongTy { MaCongTy = IdGenerator.New("CT"), TenCongTy = item.TenCongTy,
                    ViTriTuyen = item.ViTri, ThoiGian = $"{item.NgayBatDau:dd/MM/yyyy} - {item.NgayKetThuc:dd/MM/yyyy}",
                    TrangThai = "DaDuyet", MaSVDeXuat = item.MaSV, ChiTiepNhanTuTim = true };
                db.CongTys.Add(company);
            }
            var placement = new PhanBoThucTap { MaPhanBo = IdGenerator.New("PB"), MaSinhVien = item.MaSV,
                MaCongTy = company.MaCongTy, MaDot = item.MaDot, NgayPhanBo = DateTime.Today, TrangThai = "ChuaNhanViec",
                DaDuocKhoaDuyet = true, NgayKhoaDuyet = DateTime.Now, NguoiKhoaDuyet = actor, NguonPhanBo = "TiepNhanBenNgoai" };
            db.PhanBoThucTaps.Add(placement);
            item.MaCongTy = company.MaCongTy;
            item.MaPhanBo = placement.MaPhanBo;
            var applications = await db.DangKyThucTaps.Where(x => x.MaSV == item.MaSV && x.MaDot == item.MaDot
                && (x.TrangThai == "ChoDuyet" || x.TrangThai == "DaDuyet")).ToListAsync();
            applications.ForEach(x => { x.TrangThai = "TuChoi"; x.MaPVKetThuc = null; });

        }
        item.TrangThai = request.TrangThai;
        item.NgayDuyet = DateTime.Now;
        item.NguoiDuyet = Required(actor, 20, "Người duyệt");
        item.LyDo = reason;
        await db.SaveChangesAsync();
        if (transaction != null) await transaction.CommitAsync();
        return item;
    }
}
