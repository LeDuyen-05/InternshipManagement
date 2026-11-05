using System.Reflection;
using System.Security.Claims;
using InternshipManagement.API.Controllers;
using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.DangKyThucTap;
using InternshipManagement.BLL.Services.PhongVan;
using InternshipManagement.DAL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace InternshipManagement.WorkflowTests;

// 03/11/2026: hồi quy phân quyền 5 vai trò và giới hạn dữ liệu theo đợt; không dùng CSDL thật.
public class RoleAccessTests
{
    private static ClaimsPrincipal User(string role, string student = "SV", string lecturer = "GV") =>
        new(new ClaimsIdentity(new[] { new Claim(ClaimTypes.Role, role), new Claim("maSV", student), new Claim("maGV", lecturer) }, "audit"));

    [Theory]
    [InlineData(Roles.QuanTriVien, false, false)]
    [InlineData(Roles.Khoa, true, true)]
    [InlineData(Roles.GiangVien, true, false)]
    [InlineData(Roles.SinhVien, true, false)]
    [InlineData(Roles.DaiDienDN, false, false)]
    public async Task StudentResourcesRespectRoleOwnershipAndRound(string role, bool own, bool other)
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.GVHuongDans.Add(new() { MaSo = "HD", MaGiangVien = "GV", MaSinhVien = "SV", MaDot = "A", TrangThai = "DangHuongDan" });
        await db.SaveChangesAsync();
        var access = new ResourceAccess(db);
        Assert.Equal(own, await access.CanAccessStudentAsync(User(role), "SV", "A"));
        Assert.Equal(other, await access.CanAccessStudentAsync(User(role), "OTHER", "A"));
        Assert.Equal(role is Roles.Khoa or Roles.SinhVien, await access.CanAccessStudentAsync(User(role), "SV", "B"));
        Assert.False(await access.CanAccessStudentAsync(new ClaimsPrincipal(new ClaimsIdentity()), "SV", "A"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    public async Task LecturerHistoryRequiresExplicitRoundBeforeReadingAnyStudentData(string? round)
    {
        var registrations = new Mock<IDangKyThucTapService>(MockBehavior.Strict);
        var interviews = new Mock<IPhongVanService>(MockBehavior.Strict);
        var access = new Mock<IResourceAccess>(MockBehavior.Strict);
        var context = new ControllerContext { HttpContext = new DefaultHttpContext { User = User(Roles.GiangVien) } };
        var registration = new DangKyThucTapController(registrations.Object, access.Object) { ControllerContext = context };
        var interview = new PhongVanController(interviews.Object, access.Object) { ControllerContext = context };
        Assert.IsType<BadRequestObjectResult>(await registration.GetBySinhVien("SV", round));
        Assert.IsType<BadRequestObjectResult>(await interview.GetLichPhongVan("SV", round));
        Assert.IsType<BadRequestObjectResult>(await interview.GetPhanBoThucTap("SV", round));
        registrations.VerifyNoOtherCalls(); interviews.VerifyNoOtherCalls(); access.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(Roles.QuanTriVien)]
    [InlineData(Roles.Khoa)]
    [InlineData(Roles.GiangVien)]
    [InlineData(Roles.SinhVien)]
    [InlineData(Roles.DaiDienDN)]
    public async Task EndpointPoliciesKeepAdministrativeAndGradingRolesSeparate(string role)
    {
        using var services = new ServiceCollection().AddLogging().AddAuthorization().BuildServiceProvider();
        var provider = services.GetRequiredService<IAuthorizationPolicyProvider>();
        var authorization = services.GetRequiredService<IAuthorizationService>();
        async Task Check(Type controller, string action, bool expected)
        {
            var method = controller.GetMethod(action)!;
            var attributes = controller.GetCustomAttributes<AuthorizeAttribute>().Concat(method.GetCustomAttributes<AuthorizeAttribute>());
            var policy = await AuthorizationPolicy.CombineAsync(provider, attributes);
            Assert.NotNull(policy);
            Assert.Equal(expected, (await authorization.AuthorizeAsync(User(role), null, policy!)).Succeeded);
            Assert.False((await authorization.AuthorizeAsync(new ClaimsPrincipal(new ClaimsIdentity()), null, policy!)).Succeeded);
        }
        await Check(typeof(AdminController), nameof(AdminController.Accounts), role == Roles.QuanTriVien);
        // 04/11/2026: preview and commit must both remain limited to technical administrators.
        await Check(typeof(AdminController), nameof(AdminController.PreviewStudentAccounts), role == Roles.QuanTriVien);
        await Check(typeof(AdminController), nameof(AdminController.ImportStudentAccounts), role == Roles.QuanTriVien);
        await Check(typeof(SinhVienController), nameof(SinhVienController.GetAll), role == Roles.Khoa);
        await Check(typeof(DangKyThucTapController), nameof(DangKyThucTapController.DangKy), role == Roles.SinhVien);
        await Check(typeof(PhieuChamDiemController), nameof(PhieuChamDiemController.ChamDiem), role is Roles.Khoa or Roles.GiangVien);
        await Check(typeof(DoanhNghiepController), nameof(DoanhNghiepController.DanhGiaThucTapSinh), role == Roles.DaiDienDN);
        await Check(typeof(ChotDotController), nameof(ChotDotController.Close), role == Roles.Khoa);
        await Check(typeof(LanHoTroController), nameof(LanHoTroController.OpenRegistration), role == Roles.Khoa);
    }
}
