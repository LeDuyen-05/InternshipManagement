using System.Text.Json;
using InternshipManagement.BLL.DTOs.DangKyThucTap;
using InternshipManagement.BLL.Services.DangKyThucTap;
using InternshipManagement.BLL.Services.SinhVienTheoDot;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Database;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace InternshipManagement.WorkflowTests;

// 04/11/2026: một hồ sơ đang xử lý/SV/đợt; ba lượt tổng cộng. Nghiệm thu thủ công: chưa chạy.
public class SequentialApplicationTests
{
    sealed class Clock : TimeProvider { public override DateTimeOffset GetUtcNow()=>new(2029,1,10,3,0,0,TimeSpan.Zero); }
    static readonly TimeProvider Time=new Clock();
    static AppDbContext Memory()=>new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options){RoundClock=Time};
    static DangKyThucTapService Service(AppDbContext db)=>new(new DangKyThucTapRepository(db,Time),new CongTyRepository(db),new SinhVienRepository(db));
    static UngTuyenHoTroService Tracking(AppDbContext db)=>new(db,new SinhVienTheoDotService(db,Time),Time);
    static CreateDangKyThucTapRequest Request(string company,int attempt=1,string round="SEQ_A")=>new(){MaSV="SEQ_S",MaCongTy=company,MaDot=round,ThuTuUuTien=attempt};
    static DangKyThucTap Row(string id,string company,int attempt=1)=>new(){MaDK=id,MaSV="SEQ_S",MaCongTy=company,MaDot="SEQ_A",ThuTuUuTien=attempt};
    static async Task Seed(AppDbContext db,string type="TTKS") {
        foreach(var r in new[]{"SEQ_A","SEQ_B"}) db.DotThucTaps.Add(new(){MaSo=r,TenDot="Đợt kiểm tra ứng tuyển",NamHoc="2028-2029",MaLoaiThucTap=type,MaRubric=type+"_V1",TrangThai="DangDienRa",ThoiGianBD=new(2029,2,1),ThoiGianKT=new(2029,5,1)});
        db.SinhViens.Add(new(){MaSV="SEQ_S",HoTen="Sinh viên kiểm tra"});
        foreach(var r in new[]{"SEQ_A","SEQ_B"}) db.SinhVienThamGiaDots.Add(new(){MaDot=r,MaSV="SEQ_S",NguoiThem="K",NguoiCapNhat="K"});
        foreach(var c in new[]{"SEQ_C1","SEQ_C2","SEQ_C3","SEQ_C4"}) {
            db.CongTys.Add(new(){MaCongTy=c,TenCongTy=c,TrangThai="DaDuyet"});
            foreach(var r in new[]{"SEQ_A","SEQ_B"}) db.CongTyTheoDots.Add(new(){MaCongTy=c,MaDot=r,ViTriTuyen="Lập trình viên",YeuCau="C#, SQL",SoLuongNhan=5,MoDangKy=Time.GetUtcNow().AddDays(-1),HanDangKy=Time.GetUtcNow().AddDays(10)});
        }
        await db.SaveChangesAsync();
    }

    [Theory]
    [InlineData("ChoDuyet","TTNN")]
    [InlineData("DaDuyet","TTNN")]
    [InlineData("ChoDuyet","TTKS")]
    [InlineData("DaDuyet","TTKS")]
    public async Task PendingOrApprovedApplicationBlocksAnotherCompanyAndEligibility(string status,string type) {
        await using var db=Memory(); await Seed(db,type);
        await Service(db).DangKyNguyenVongAsync(Request("SEQ_C1"));
        (await db.DangKyThucTaps.SingleAsync()).TrangThai=status; await db.SaveChangesAsync();
        Assert.NotNull(await Service(db).KiemTraDieuKienDangKyAsync("SEQ_S","SEQ_A"));
        var context=JsonSerializer.SerializeToElement(await Tracking(db).RegistrationContextAsync("SEQ_A","SEQ_S"));
        Assert.False(context.GetProperty("DuocDangKy").GetBoolean());
        await Assert.ThrowsAsync<InvalidOperationException>(()=>Service(db).DangKyNguyenVongAsync(Request("SEQ_C2",2)));
        await Assert.ThrowsAsync<InvalidOperationException>(()=>new DangKyThucTapRepository(db,Time).AddWithinLimitAsync(Row("BYPASS","SEQ_C3",3),3));
        Assert.Equal(1,await db.DangKyThucTaps.CountAsync());
    }

    [Fact]
    public async Task RejectionThenWithdrawalAllowsDifferentCompanyUntilThreeAttemptsAndPreservesHistory() {
        await using var db=Memory(); await Seed(db); var service=Service(db);
        await service.DangKyNguyenVongAsync(Request("SEQ_C1"));
        var first=await db.DangKyThucTaps.SingleAsync(); first.TrangThai="TuChoi"; first.KetQuaHoSo="KhongDat"; first.LyDoKetThuc="Không đạt yêu cầu vị trí."; await db.SaveChangesAsync();
        Assert.Null(await service.KiemTraDieuKienDangKyAsync("SEQ_S","SEQ_A"));
        await Assert.ThrowsAsync<InvalidOperationException>(()=>service.DangKyNguyenVongAsync(Request("SEQ_C1",2)));
        var second=await service.DangKyNguyenVongAsync(Request("SEQ_C2",1)); // Older clients may still submit priority 1.
        Assert.Equal(2,second.ThuTuUuTien);
        Assert.True(await service.HuyDangKyAsync(second.MaDK,"SEQ_S",false));
        await service.DangKyNguyenVongAsync(Request("SEQ_C3",3));
        var third=await db.DangKyThucTaps.SingleAsync(x=>x.MaCongTy=="SEQ_C3"); third.TrangThai="TuChoi"; await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(()=>service.DangKyNguyenVongAsync(Request("SEQ_C4",3)));
        var history=await db.DangKyThucTaps.OrderBy(x=>x.ThuTuUuTien).ToListAsync();
        Assert.Equal(3,history.Count); Assert.Equal("Không đạt yêu cầu vị trí.",history[0].LyDoKetThuc); Assert.Contains("rút",history[1].LyDoKetThuc);
        Assert.Equal(new[]{1,2,3},history.Select(x=>x.ThuTuUuTien));
    }

    [Theory]
    [InlineData("Expired")]
    [InlineData("NotOpen")]
    [InlineData("Paused")]
    [InlineData("Full")]
    [InlineData("ClosedRound")]
    public async Task FailedApplicantStillNeedsOpenRoundAndAvailableCompany(string restriction) {
        await using var db=Memory(); await Seed(db);
        var old=Row("OLD","SEQ_C1"); old.TrangThai="TuChoi"; db.DangKyThucTaps.Add(old);
        var plan=await db.CongTyTheoDots.FindAsync("SEQ_C2","SEQ_A");
        if(restriction=="Expired") plan!.HanDangKy=Time.GetUtcNow().AddSeconds(-1);
        if(restriction=="NotOpen") plan!.MoDangKy=Time.GetUtcNow().AddSeconds(1);
        if(restriction=="Paused") plan!.HoatDong=false;
        if(restriction=="Full") plan!.SoLuongNhan=0;
        if(restriction=="ClosedRound") (await db.DotThucTaps.FindAsync("SEQ_A"))!.TrangThai="DaKetThuc";
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(()=>Service(db).DangKyNguyenVongAsync(Request("SEQ_C2",2)));
        Assert.Equal(1,await db.DangKyThucTaps.CountAsync());
    }

    [Fact]
    public async Task PendingInOtherRoundDoesNotBlockThisRoundAndOldParallelRowsArePreserved() {
        await using var db=Memory(); await Seed(db);
        await Service(db).DangKyNguyenVongAsync(Request("SEQ_C1"));
        await Service(db).DangKyNguyenVongAsync(Request("SEQ_C2",round:"SEQ_B"));
        db.DangKyThucTaps.Add(Row("LEGACY","SEQ_C3",2)); await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(()=>Service(db).DangKyNguyenVongAsync(Request("SEQ_C4",3)));
        Assert.Equal(2,await db.DangKyThucTaps.CountAsync(x=>x.MaDot=="SEQ_A"));
        Assert.Equal(1,await db.DangKyThucTaps.CountAsync(x=>x.MaDot=="SEQ_B"));
    }

    [LocalSqlFact]
    public async Task TwoSimultaneousCompaniesProduceOnlyOnePendingApplicationOnSqlServer() {
        var name="CodexSequentialAudit_"+Guid.NewGuid().ToString("N");
        var connection=$"Server=(localdb)\\MSSQLLocalDB;Database={name};Integrated Security=True;TrustServerCertificate=True";
        var options=new DbContextOptionsBuilder<AppDbContext>().UseSqlServer(connection).Options;
        try {
            await DatabaseInitializer.InitializeAsync(connection,NullLogger.Instance);
            await using var seed=new AppDbContext(options){RoundClock=Time}; await Seed(seed);
            async Task<bool> Submit(string company) {
                await using var db=new AppDbContext(options){RoundClock=Time};
                try { await Service(db).DangKyNguyenVongAsync(Request(company)); return true; }
                catch(InvalidOperationException) { return false; }
            }
            var outcomes=await Task.WhenAll(Submit("SEQ_C1"),Submit("SEQ_C2"));
            Assert.Equal(1,outcomes.Count(x=>x));
            var first=await seed.DangKyThucTaps.SingleAsync(x=>x.MaSV=="SEQ_S");
            first.TrangThai="TuChoi"; first.LyDoKetThuc="Không đạt sau phỏng vấn."; await seed.SaveChangesAsync();
            var nextCompany=first.MaCongTy=="SEQ_C1"?"SEQ_C2":"SEQ_C1";
            await Service(seed).DangKyNguyenVongAsync(Request(nextCompany,2));
            Assert.Equal(2,await seed.DangKyThucTaps.CountAsync(x=>x.MaSV=="SEQ_S"));
            Assert.Equal(1,await seed.DangKyThucTaps.CountAsync(x=>x.MaSV=="SEQ_S"&&x.TrangThai=="ChoDuyet"));
        }
        finally { await using var cleanup=new AppDbContext(options); await cleanup.Database.EnsureDeletedAsync(); }
    }
}
