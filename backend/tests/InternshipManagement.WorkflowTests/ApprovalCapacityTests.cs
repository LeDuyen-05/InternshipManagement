using InternshipManagement.BLL.DTOs.Admin;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.Auth;
using InternshipManagement.BLL.Services.GVHuongDan;
using InternshipManagement.BLL.Validators.SinhVien;
using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InternshipManagement.WorkflowTests;

// 04/11/2026: duyệt hồ sơ dùng chỉ tiêu DN–đợt và phân bổ còn hiệu lực, không đếm số đơn.
public class ApprovalCapacityTests
{
    private static AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private static AdminService Service(AppDbContext db) => new(db, Mock.Of<IGVHuongDanService>(), new PasswordService(), new SinhVienValidator());
    private static async Task Seed(AppDbContext db, int globalLimit, int roundLimit)
    {
        db.SinhViens.AddRange(new() { MaSV = "TARGET", HoTen = "Sinh viên cần xét" }, new() { MaSV = "OTHER", HoTen = "Sinh viên đã tiếp nhận" });
        db.CongTys.Add(new() { MaCongTy = "CT", TenCongTy = "Đơn vị mẫu", SoLuongNhan = globalLimit, TrangThai = "DaDuyet" });
        db.DotThucTaps.Add(new() { MaSo = "D", TenDot = "Đợt mẫu", NamHoc = "2026-2027", TrangThai = "DangDienRa" });
        db.CongTyTheoDots.Add(new() { MaCongTy = "CT", MaDot = "D", ViTriTuyen = "Dev", YeuCau = "C#", SoLuongNhan = roundLimit, HoatDong = false });
        db.DangKyThucTaps.Add(new() { MaDK = "REQUEST", MaSV = "TARGET", MaCongTy = "CT", MaDot = "D", TrangThai = "ChoDuyet" });
        await db.SaveChangesAsync();
    }

    [Theory]
    [InlineData("DangThucTap", true)]
    [InlineData("ChuaNhanViec", true)]
    [InlineData("Huy", false)]
    public async Task AllocationAndTemporaryHoldConsumeRoundCapacityButCancelledPlacementDoesNot(string placementStatus, bool blocked)
    {
        await using var db = Db(); await Seed(db, 100, 1);
        db.PhanBoThucTaps.Add(new() { MaPhanBo = "PB", MaSinhVien = "OTHER", MaCongTy = "CT", MaDot = "D", TrangThai = placementStatus, DaDuocKhoaDuyet = false });
        await db.SaveChangesAsync();
        if (blocked) {
            await Assert.ThrowsAsync<InvalidOperationException>(() => Service(db).ApproveRegistrationAsync("REQUEST", new RegistrationApprovalRequest("DaDuyet")));
            Assert.Equal("ChoDuyet", (await db.DangKyThucTaps.FindAsync("REQUEST"))!.TrangThai);
        } else {
            await Service(db).ApproveRegistrationAsync("REQUEST", new RegistrationApprovalRequest("DaDuyet"));
            Assert.Equal("DaDuyet", (await db.DangKyThucTaps.FindAsync("REQUEST"))!.TrangThai);
        }
    }

    [Fact]
    public async Task ApprovedApplicationsDoNotConsumeCapacityAndStoppedIntakeKeepsExistingApplicationProcessable()
    {
        await using var db = Db(); await Seed(db, 1, 1);
        db.DangKyThucTaps.Add(new() { MaDK = "OTHER_REQUEST", MaSV = "OTHER", MaCongTy = "CT", MaDot = "D", TrangThai = "DaDuyet" });
        await db.SaveChangesAsync();
        await Service(db).ApproveRegistrationAsync("REQUEST", new RegistrationApprovalRequest("DaDuyet"));
        Assert.Equal("DaDuyet", (await db.DangKyThucTaps.FindAsync("REQUEST"))!.TrangThai);
        Assert.Empty(db.PhanBoThucTaps);
    }
}
