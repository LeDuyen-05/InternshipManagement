using System.Data;
using System.Net.Mail;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Common;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.Admin;

public record CreateRepresentativeRequest(string MaCongTy, string HoTen, string? ChucVu, string Email, bool DaXacMinh);
public record UpdateRepresentativeRequest(string HoTen, string? ChucVu, string Email, bool DaXacMinh);
public record RepresentativeDto(string MaDaiDien, string HoTen, string? ChucVu, string? Email, int SoTaiKhoan, int TaiKhoanHoatDong);
public record EnterpriseContactDto(string NguoiLienHe, string LienHe);
public record EnterpriseOnboardingDto(string MaCongTy, string TenCongTy, bool ChiTiepNhanTuTim,
    List<RepresentativeDto> DaiDiens, List<EnterpriseContactDto> LienHeHoSo);

// QTV xác minh danh tính trước khi tạo/sửa; mỗi công ty chỉ có 01 người đại diện duy nhất làm đầu mối liên hệ và cấp tài khoản VT05.
public class EnterpriseRepresentativeService(AppDbContext db)
{
    public async Task<List<EnterpriseOnboardingDto>> GetAsync()
    {
        var companies = await db.CongTys.AsNoTracking().Where(x => x.TrangThai == "DaDuyet").OrderBy(x => x.TenCongTy).ToListAsync();
        var reps = await db.DaiDienDoanhNghieps.AsNoTracking().ToListAsync();
        var accounts = await db.TaiKhoans.AsNoTracking().Where(x => x.MaVaiTro == "VT05").ToListAsync();
        var contacts = await db.DeXuatThucTapTuTims.AsNoTracking().Where(x => x.TrangThai == "DaDuyet" && x.MaCongTy != null).ToListAsync();
        return companies.Select(c => new EnterpriseOnboardingDto(c.MaCongTy, c.TenCongTy, c.ChiTiepNhanTuTim,
            reps.Where(d => d.MaCongTy == c.MaCongTy).OrderBy(d => d.MaSo).Select(d => new RepresentativeDto(d.MaSo, d.HoTen, d.ChucVu, d.Email,
                accounts.Count(a => a.MaDaiDien == d.MaSo), accounts.Count(a => a.MaDaiDien == d.MaSo && a.TrangThai == "HoatDong"))).ToList(),
            contacts.Where(h => h.MaCongTy == c.MaCongTy).Select(h => new EnterpriseContactDto(h.NguoiLienHe, h.LienHe)).Distinct().ToList())).ToList();
    }

    public async Task<DaiDienDoanhNghiep> CreateAsync(CreateRepresentativeRequest request)
    {
        if (!request.DaXacMinh) throw new ArgumentException("Cần xác minh người đại diện được DN ủy quyền trước khi cấp quyền truy cập công ty.");
        var name = request.HoTen?.Trim() ?? "";
        var email = request.Email?.Trim() ?? "";
        var title = request.ChucVu?.Trim();
        if (name.Length is < 1 or > 100 || email.Length is < 1 or > 200 || title?.Length > 100
            || !MailAddress.TryCreate(email, out var address) || address.Address != email)
            throw new ArgumentException("Họ tên/email không hợp lệ hoặc vượt độ dài cho phép (họ tên/chức vụ 100 ký tự; email 200).");
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        if (!await db.CongTys.AnyAsync(x => x.MaCongTy == request.MaCongTy && x.TrangThai == "DaDuyet"))
            throw new InvalidOperationException("Chọn đúng doanh nghiệp đã được Khoa công nhận.");
        // Mỗi công ty chỉ có tối đa 01 đại diện duy nhất
        if (await db.DaiDienDoanhNghieps.AnyAsync(x => x.MaCongTy == request.MaCongTy))
            throw new InvalidOperationException("Doanh nghiệp này đã có người đại diện. Mỗi công ty chỉ có một đại diện duy nhất; vui lòng cập nhật thông tin đại diện hiện có.");
        var rep = new DaiDienDoanhNghiep { MaSo = IdGenerator.New("DD"), MaCongTy = request.MaCongTy, HoTen = name, Email = email, ChucVu = title };
        db.DaiDienDoanhNghieps.Add(rep);
        await db.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
        return rep;
    }

    public async Task<DaiDienDoanhNghiep> UpdateAsync(string maDaiDien, UpdateRepresentativeRequest request)
    {
        if (!request.DaXacMinh) throw new ArgumentException("Cần xác minh người đại diện được DN ủy quyền trước khi cập nhật thông tin.");
        var name = request.HoTen?.Trim() ?? "";
        var email = request.Email?.Trim() ?? "";
        var title = request.ChucVu?.Trim();
        if (name.Length is < 1 or > 100 || email.Length is < 1 or > 200 || title?.Length > 100
            || !MailAddress.TryCreate(email, out var address) || address.Address != email)
            throw new ArgumentException("Họ tên/email không hợp lệ hoặc vượt độ dài cho phép (họ tên/chức vụ 100 ký tự; email 200).");

        var rep = await db.DaiDienDoanhNghieps.FirstOrDefaultAsync(d => d.MaSo == maDaiDien);
        if (rep == null) throw new KeyNotFoundException("Không tìm thấy thông tin người đại diện doanh nghiệp.");

        rep.HoTen = name;
        rep.ChucVu = title;
        rep.Email = email;
        await db.SaveChangesAsync();
        return rep;
    }
}
