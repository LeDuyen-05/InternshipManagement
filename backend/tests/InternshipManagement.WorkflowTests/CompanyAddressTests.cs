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

public class CompanyAddressTests
{
    private static AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private static AdminService Service(AppDbContext db) => new(db, Mock.Of<IGVHuongDanService>(), new PasswordService(), new SinhVienValidator());
    private static CreateCompanyRequest Request(string? address = null) => new("CT", "Công ty", "Dev", "3 tháng", 5, "C#", address);

    [Fact]
    public async Task AddressCanBeCreatedEditedAndClearedWhileOlderRequestsPreserveIt()
    {
        await using var db = Db(); var service = Service(db);
        await service.CreateCompanyAsync(Request("  123 Đường A, TP.HCM  "));
        Assert.Equal("123 Đường A, TP.HCM", (await service.CompaniesAsync()).Single().DiaChi);
        await service.UpdateCompanyAsync("CT", Request());
        Assert.Equal("123 Đường A, TP.HCM", (await service.CompaniesAsync()).Single().DiaChi);
        await service.UpdateCompanyAsync("CT", Request("456 Đường B"));
        Assert.Equal("456 Đường B", (await service.CompaniesAsync()).Single().DiaChi);
        await service.UpdateCompanyAsync("CT", Request("  "));
        Assert.Null((await service.CompaniesAsync()).Single().DiaChi);
    }

    [Fact]
    public async Task RejectsOverlongAddressWithoutSavingCompany()
    {
        await using var db = Db(); var service = Service(db);
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateCompanyAsync(Request(new string('x', 501))));
        Assert.Empty(await db.CongTys.ToListAsync());
    }
}
