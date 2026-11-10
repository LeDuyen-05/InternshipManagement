using System.Security.Claims;
using System.Text.Json;
using InternshipManagement.API.Controllers;
using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.DTOs.ThongKe;
using InternshipManagement.BLL.Services.ThongKe;
using InternshipManagement.DAL;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InternshipManagement.WorkflowTests;

public class StudentRoundSelectionTests
{
    [Theory]
    [InlineData(Roles.SinhVien, "SV1", "CURRENT,HISTORY")]
    [InlineData(Roles.SinhVien, "SV2", "OTHER")]
    [InlineData(Roles.SinhVien, "NO_ROUND", "")]
    [InlineData(Roles.SinhVien, null, "")]
    [InlineData(Roles.Khoa, null, "CURRENT,HISTORY,OTHER,REMOVED")]
    [InlineData(Roles.GiangVien, null, "CURRENT,HISTORY,OTHER,REMOVED")]
    public async Task RoundListUsesAuthenticatedStudentMembershipAndKeepsHistory(string role, string? student, string expected)
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.SinhVienThamGiaDots.AddRange(
            new() { MaDot = "CURRENT", MaSV = "SV1", NguoiThem = "K", NguoiCapNhat = "K" },
            new() { MaDot = "HISTORY", MaSV = "SV1", NguoiThem = "K", NguoiCapNhat = "K" },
            new() { MaDot = "OTHER", MaSV = "SV2", NguoiThem = "K", NguoiCapNhat = "K" },
            new() { MaDot = "REMOVED", MaSV = "SV1", DangThamGia = false, NguoiThem = "K", NguoiCapNhat = "K" });
        await db.SaveChangesAsync();
        var service = new Mock<IThongKeService>();
        service.Setup(x => x.GetDanhSachDotThucTapAsync()).ReturnsAsync(new List<DotThucTapItemDto>
        {
            new() { MaDot = "CURRENT", TrangThai = "DangDienRa" },
            new() { MaDot = "HISTORY", TrangThai = "DaKetThuc" },
            new() { MaDot = "OTHER", TrangThai = "DangDienRa" },
            new() { MaDot = "REMOVED", TrangThai = "DangDienRa" }
        });
        var claims = new List<Claim> { new(ClaimTypes.Role, role) };
        if (student != null) claims.Add(new("maSV", student));
        var controller = new ThongKeController(service.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "test")) }
            }
        };

        var response = Assert.IsType<OkObjectResult>(await controller.GetDanhSachDotThucTap(db));
        var payload = JsonSerializer.SerializeToElement(response.Value);
        var rounds = payload.GetProperty("Data").EnumerateArray().Select(x => x.GetProperty("MaDot").GetString());
        Assert.Equal(expected, string.Join(",", rounds));
    }
}
