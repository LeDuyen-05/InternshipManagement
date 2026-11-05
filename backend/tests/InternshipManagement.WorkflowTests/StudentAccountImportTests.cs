using InternshipManagement.BLL.DTOs.Admin;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.Auth;
using InternshipManagement.BLL.Validators.SinhVien;
using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternshipManagement.WorkflowTests;

// 04/11/2026: Admin import preview/commit. Automated checks; manual acceptance is separate.
public class StudentAccountImportTests
{
    static AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    static StudentAccountImportService Service(AppDbContext db) => new(db,new PasswordService(),new SinhVienValidator());

    [Fact]
    public async Task DuplicateMssvWithWhitespaceAndDifferentCaseBlocksWholeFile()
    {
        await using var db=Db(); var service=Service(db);
        var request=new ImportStudentAccountsRequest([new("sv001","Nguyễn An",Dong:2),new(" SV001 ","Nguyễn An",Dong:9),new("000002","Trần Bình")]);
        var preview=await service.PreviewAsync(request);
        Assert.Equal(2,preview.DuplicateRows); Assert.False(preview.CanImport);
        Assert.Contains("2, 9",preview.Items[0].GhiChu);
        Assert.Equal(0,(await service.ImportAsync(request)).CreatedCount);
        Assert.Empty(await db.SinhViens.ToListAsync()); Assert.Empty(await db.TaiKhoans.ToListAsync());
    }

    [Fact]
    public async Task LargeDuplicateFileHasBoundedMessagesAndCannotBeImported()
    {
        await using var db=Db();
        var rows=Enumerable.Range(0,5000).Select(i=>new ImportStudentAccountRow("000001","Nguyễn An",Dong:i+2)).ToList();
        var preview=await Service(db).PreviewAsync(new(rows));
        Assert.Equal(5000,preview.DuplicateRows); Assert.False(preview.CanImport);
        Assert.All(preview.Items,row=>Assert.True(row.GhiChu.Length<200));
    }

    [Fact]
    public async Task ExistingAccountIsSkippedAndReplayNeverResetsPasswordOrProfile()
    {
        await using var db=Db();
        db.SinhViens.Add(new(){MaSV="000001",HoTen="Nguyễn An",Lop="L1"});
        db.TaiKhoans.Add(new(){MaTaiKhoan="OLD",TenDangNhap="000001",MaSV="000001",MaVaiTro="VT04",MatKhau="KEEP_HASH",TrangThai="BiKhoa"}); await db.SaveChangesAsync();
        var service=Service(db); var request=new ImportStudentAccountsRequest([new("000001","Nguyễn An","L1"),new("000002","Trần Bình","L2")]);
        var preview=await service.PreviewAsync(request); Assert.Equal(1,preview.AlreadyRegistered); Assert.Equal(1,preview.AccountsToCreate);
        Assert.Equal(1,(await service.ImportAsync(request)).CreatedCount); Assert.Equal(0,(await service.ImportAsync(request)).CreatedCount);
        Assert.Equal(2,await db.SinhViens.CountAsync()); Assert.Equal(2,await db.TaiKhoans.CountAsync());
        var old=await db.TaiKhoans.FindAsync("OLD"); Assert.Equal("KEEP_HASH",old!.MatKhau); Assert.Equal("BiKhoa",old.TrangThai);
        Assert.Empty(await db.SinhVienThamGiaDots.ToListAsync());
    }

    [Fact]
    public async Task ExistingStudentGetsAccountWithoutReplacingAcademicInformationAndLongIdTerminates()
    {
        await using var db=Db(); const string id="00000000000000000001";
        db.SinhViens.Add(new(){MaSV=id,HoTen="Lê Minh",Lop="L1",Gpa=3.5m}); await db.SaveChangesAsync();
        var service=Service(db); var request=new ImportStudentAccountsRequest([new(id)]);
        Assert.Equal("CapTaiKhoan",(await service.PreviewAsync(request)).Items.Single().TrangThai);
        Assert.Equal(1,(await service.ImportAsync(request)).CreatedCount);
        var account=await db.TaiKhoans.SingleAsync(); Assert.Equal(id,account.TenDangNhap); Assert.Equal(20,account.MaTaiKhoan.Length);
        Assert.Equal(3.5m,(await db.SinhViens.SingleAsync()).Gpa);
    }

    [Theory]
    [InlineData("", "Nguyễn An", null)]
    [InlineData("000001", "", null)]
    [InlineData("000001", "Nguyễn An", "email-sai")]
    [InlineData("SV 01", "Nguyễn An", null)]
    public async Task InvalidRowsCreateNothing(string id,string name,string? email)
    {
        await using var db=Db(); var request=new ImportStudentAccountsRequest([new(id,name,Email:email)]);
        Assert.Equal(1,(await Service(db).PreviewAsync(request)).InvalidRows);
        Assert.NotEmpty((await Service(db).ImportAsync(request)).Errors); Assert.Empty(await db.TaiKhoans.ToListAsync());
    }

    [Fact]
    public async Task NameMismatchUsernameConflictAndRoundEnrollmentAreRejected()
    {
        await using var db=Db(); db.SinhViens.Add(new(){MaSV="000001",HoTen="Nguyễn An"});
        db.TaiKhoans.Add(new(){MaTaiKhoan="K",TenDangNhap="000002",MaVaiTro="VT01",MatKhau="KEEP",TrangThai="HoatDong"}); await db.SaveChangesAsync();
        Assert.Equal(2,(await Service(db).PreviewAsync(new([new("000001","Tên khác"),new("000002","Trần Bình")]))).InvalidRows);
        await Assert.ThrowsAsync<ArgumentException>(()=>Service(db).PreviewAsync(new([new("000003","Lê Minh")],"DOT01")));
    }
}
