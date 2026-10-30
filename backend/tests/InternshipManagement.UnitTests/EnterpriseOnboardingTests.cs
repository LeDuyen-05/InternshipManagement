using System.Text.Json;
using InternshipManagement.BLL.DTOs.Admin;
using InternshipManagement.BLL.DTOs.PhieuChamDiem;
using InternshipManagement.BLL.DTOs.ThucTapTuTim;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.Auth;
using InternshipManagement.BLL.Services.PhieuChamDiem;
using InternshipManagement.BLL.Services.ThucTapTuTim;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternshipManagement.UnitTests;

public class EnterpriseOnboardingTests
{
    private static AppDbContext Db()
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.VaiTros.Add(new VaiTro { MaVaiTro = "VT05", TenVaiTro = "DoanhNghiep" });
        db.DotThucTaps.AddRange(new DotThucTap { MaSo = "DOT", TenDot = "Đợt", NamHoc = "2026", TrangThai = "DangDienRa", MaRubric = "R", ThoiGianKT = DateTime.UtcNow.AddDays(-2), HanChamDN = DateTimeOffset.UtcNow.AddDays(1) },
            new DotThucTap { MaSo = "OTHER", TenDot = "Khác", NamHoc = "2026", TrangThai = "DangDienRa", MaRubric = "R" });
        db.SinhViens.Add(new SinhVien { MaSV = "SV", HoTen = "Sinh viên" });
        db.CongTys.AddRange(new CongTy { MaCongTy = "CT", TenCongTy = "Đã duyệt", TrangThai = "DaDuyet" },
            new CongTy { MaCongTy = "PENDING", TenCongTy = "Chờ duyệt", TrangThai = "ChoDuyet" });
        db.TieuChis.Add(new TieuChi { MaTieuChi = "DN", TenTieuChi = "DN", NhomDanhGia = "DN", MaRubric = "R", MaCLO = "CLO4", DiemToiDa = 5 });
        db.SaveChanges(); return db;
    }
    private static AdminService Admin(AppDbContext db) => new(db, null!, new PasswordService(), null!);

    [Fact]
    public async Task OutsideAcceptance_ToVerifiedRepresentativeAccount_ToOwnCompanyGrading()
    {
        await using var db = Db();
        var outside = new ThucTapTuTimService(db);
        var dossier = await outside.SubmitAsync("SV", new GuiHoSoTuTimRequest("DOT", null, "Ngoài hệ thống", "Địa chỉ", "Backend", "Nhân sự", "hr@example.test",
            new(2026, 10, 1), new(2026, 12, 31), true));
        await outside.ReviewAsync(dossier.MaHoSo, "KHOA", new("DaDuyet"));
        var pb = Assert.Single(db.PhanBoThucTaps);
        Assert.Equal("TiepNhanBenNgoai", pb.NguonPhanBo);
        Assert.Equal("ChuaNhanViec", pb.TrangThai);
        Assert.Empty(db.PhongVans); Assert.Empty(db.DangKyThucTaps); Assert.Empty(db.DaiDienDoanhNghieps);
        var reps = new EnterpriseRepresentativeService(db);
        var company = (await reps.GetAsync()).Single(x => x.MaCongTy == dossier.MaCongTy);
        Assert.Equal("hr@example.test", Assert.Single(company.LienHeHoSo).LienHe);
        Assert.Empty(company.DaiDiens);
        var rep = await reps.CreateAsync(new(dossier.MaCongTy!, "Mentor được xác minh", "Mentor", "mentor@example.test", true));
        await Admin(db).CreateAccountAsync(new("TK", "outside-mentor", "test-password", "VT05", null, null, rep.MaSo));
        Assert.NotNull(await new AuthService(db, new PasswordService()).AuthenticateAsync("outside-mentor", "test-password"));
        var status = JsonSerializer.SerializeToElement(await outside.GetForFacultyAsync("DOT"));
        Assert.Equal(1, status[0].GetProperty("TaiKhoanDNHoatDong").GetInt32());
        var score = new PhieuChamDiemService(new PhieuChamDiemRepository(db));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => score.LuuDiemDoanhNghiepAsync("SV", "DOT", rep.MaSo, new List<ChiTietDiemInput> { new("DN", 4m) }, null));
        // Bước xác nhận nhận việc hiện có chuyển nơi đã Khoa duyệt thành DangThucTap.
        var confirmation = new InternshipManagement.BLL.Services.PhongVan.PhongVanService(new PhongVanRepository(db), new PhanBoThucTapRepository(db));
        await confirmation.XacNhanTiepNhanAsync(pb.MaPhanBo, "SV");
        var saved = await score.LuuDiemDoanhNghiepAsync("SV", "DOT", rep.MaSo, new List<ChiTietDiemInput> { new("DN", 4m) }, "Đánh giá trực tiếp");
        Assert.Equal(4m, saved.DiemDN);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => score.LuuDiemDoanhNghiepAsync("SV", "OTHER", rep.MaSo, new List<ChiTietDiemInput> { new("DN", 4m) }, null));
        var other = await reps.CreateAsync(new("CT", "Khác", null, "other@example.test", true));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => score.LuuDiemDoanhNghiepAsync("SV", "DOT", other.MaSo, new List<ChiTietDiemInput> { new("DN", 4m) }, null));
        Assert.Single(db.PhieuChamDiems);
    }

    [Fact]
    public async Task RepresentativeRequiresVerifiedApprovedCompanyAndValidIdentity_AndDuplicateReusesExisting()
    {
        await using var db = Db(); var reps = new EnterpriseRepresentativeService(db);
        var request = new CreateRepresentativeRequest("CT", "Mentor", null, "mentor@example.test", true);
        await Assert.ThrowsAsync<ArgumentException>(() => reps.CreateAsync(request with { DaXacMinh = false }));
        await Assert.ThrowsAsync<ArgumentException>(() => reps.CreateAsync(request with { Email = "invalid" }));
        await Assert.ThrowsAsync<ArgumentException>(() => reps.CreateAsync(request with { HoTen = new string('x', 101) }));
        await Assert.ThrowsAsync<InvalidOperationException>(() => reps.CreateAsync(request with { MaCongTy = "PENDING" }));
        await Assert.ThrowsAsync<InvalidOperationException>(() => reps.CreateAsync(request with { MaCongTy = "MISSING" }));
        Assert.Empty(db.DaiDienDoanhNghieps);
        var created = await reps.CreateAsync(request);
        // Chặn tạo đại diện thứ 2 cho cùng 1 doanh nghiệp kể cả khác email
        await Assert.ThrowsAsync<InvalidOperationException>(() => reps.CreateAsync(request with { Email = "MENTOR@example.test" }));
        await Assert.ThrowsAsync<InvalidOperationException>(() => reps.CreateAsync(request with { Email = "another@example.test", HoTen = "Người khác" }));
        Assert.Single(db.DaiDienDoanhNghieps);

        // Cho phép cập nhật thông tin người đại diện duy nhất của công ty
        var updated = await reps.UpdateAsync(created.MaSo, new UpdateRepresentativeRequest("Mentor Cập Nhật", "Tech Lead", "mentor_new@example.test", true));
        Assert.Equal("Mentor Cập Nhật", updated.HoTen);
        Assert.Equal("Tech Lead", updated.ChucVu);
        Assert.Equal("mentor_new@example.test", updated.Email);
    }

    [Fact]
    public async Task ExistingLockedAccountIsReportedAndCannotBeDuplicated()
    {
        await using var db = Db(); var reps = new EnterpriseRepresentativeService(db); var admin = Admin(db);
        var rep = await reps.CreateAsync(new("CT", "Mentor", null, "mentor@example.test", true));
        var request = new CreateAccountRequest("TK", "mentor", "password", "VT05", null, null, rep.MaSo);
        await admin.CreateAccountAsync(request);
        var account = await db.TaiKhoans.SingleAsync(); account.TrangThai = "BiKhoa"; await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => admin.CreateAccountAsync(request with { MaTaiKhoan = "TK2", TenDangNhap = "another" }));
        db.TaiKhoans.Add(new TaiKhoan { MaTaiKhoan = "TK2", TenDangNhap = "other", MatKhau = "hash", MaVaiTro = "VT02" });
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => admin.UpdateAccountAsync("TK2", new("HoatDong", "VT05", MaDaiDien: rep.MaSo)));
        db.TaiKhoans.Remove(await db.TaiKhoans.SingleAsync(a => a.MaTaiKhoan == "TK2"));
        await db.SaveChangesAsync();
        Assert.Single(db.TaiKhoans);
        var dto = Assert.Single((await reps.GetAsync()).Single(c => c.MaCongTy == "CT").DaiDiens);
        Assert.Equal(1, dto.SoTaiKhoan); Assert.Equal(0, dto.TaiKhoanHoatDong);
        Assert.Null(await new AuthService(db, new PasswordService()).AuthenticateAsync("mentor", "password"));
    }
}
