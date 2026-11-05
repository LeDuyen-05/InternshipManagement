using System.Text.Json;
using InternshipManagement.BLL.DTOs.DangKyThucTap;
using InternshipManagement.BLL.Services.DangKyThucTap;
using InternshipManagement.BLL.Services.SinhVienTheoDot;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Common;
using InternshipManagement.DAL.Database;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace InternshipManagement.WorkflowTests;

// 04/11/2026: faculty-approved supplemental attempts and application outcome counts.
// Manual acceptance is not inferred from these checks.
public class SupplementalRegistrationTests
{
    sealed class Clock : TimeProvider { public DateTimeOffset Now=new(2029,1,10,3,0,0,TimeSpan.Zero); public override DateTimeOffset GetUtcNow()=>Now; }
    sealed class Fixture : IAsyncDisposable
    {
        public Clock Clock { get; }=new();
        public AppDbContext Db { get; }
        public Fixture(DbContextOptions<AppDbContext>? options=null) { Db=new(options??new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options){RoundClock=Clock}; }
        public LanHoTroService Support=>new(Db,new SinhVienTheoDotService(Db,Clock),Clock);
        public UngTuyenHoTroService Tracking=>new(Db,new SinhVienTheoDotService(Db,Clock),Clock);
        public DangKyThucTapService Registration=>new(new DangKyThucTapRepository(Db,Clock),new CongTyRepository(Db),new SinhVienRepository(Db));
        public async Task Seed() {
            Db.DotThucTaps.Add(new(){MaSo="EXTRA_D",TenDot="Đợt bổ sung",NamHoc="2028-2029",TrangThai="DangDienRa",MaRubric="TTKS_V1",MaLoaiThucTap="TTKS",ThoiGianBD=new(2029,2,1),ThoiGianKT=new(2029,5,1)});
            Db.SinhViens.Add(new(){MaSV="EXTRA_S",HoTen="Sinh viên bổ sung"});
            Db.SinhVienThamGiaDots.Add(new(){MaDot="EXTRA_D",MaSV="EXTRA_S",NguoiThem="K",NguoiCapNhat="K"});
            for(var i=1;i<=7;i++) {
                Db.CongTys.Add(new(){MaCongTy=$"EXTRA_C{i}",TenCongTy=$"Đối tác {i}",TrangThai="DaDuyet"});
                Db.CongTyTheoDots.Add(new(){MaDot="EXTRA_D",MaCongTy=$"EXTRA_C{i}",ViTriTuyen="Dev",YeuCau="SQL",SoLuongNhan=10,MoDangKy=Clock.Now.AddDays(-1),HanDangKy=Clock.Now.AddDays(10)});
                if(i<=3) Db.DangKyThucTaps.Add(new(){MaDK=$"EXTRA_OLD{i}",MaSV="EXTRA_S",MaDot="EXTRA_D",MaCongTy=$"EXTRA_C{i}",ThuTuUuTien=i,TrangThai="TuChoi",KetQuaHoSo="KhongDat"});
            }
            await Db.SaveChangesAsync();
            await Support.SaveAsync("EXTRA_D",null,new("Hỗ trợ sinh viên hết lượt",new(2029,1,10),["EXTRA_S"]),"K");
        }
        public async Task<string> Session()=>await Db.LanHoTroThucTaps.Where(x=>x.MaDot=="EXTRA_D").Select(x=>x.MaLan).FirstAsync();
        public async Task MarkNeedsHelp(string? session=null) { var id=session??await Session(); var version=(await Db.LanHoTroThucTaps.AsNoTracking().SingleAsync(x=>x.MaLan==id)).PhienBan; await Support.ResultAsync("EXTRA_D",id,"EXTRA_S",new("CanHoTro","Đã rà soát, SV chưa có nơi và cần hỗ trợ tiếp.",version),"K"); }
        public async Task Open(int count=1,string? session=null) { var id=session??await Session(); await MarkNeedsHelp(id); var version=(await Db.LanHoTroThucTaps.AsNoTracking().SingleAsync(x=>x.MaLan==id)).PhienBan; await Support.OpenRegistrationAsync("EXTRA_D",id,"EXTRA_S",new(version,count,Clock.Now.AddDays(2),"Đã rà soát các lượt không đạt; cho đăng ký bổ sung."),"K"); }
        public async Task Apply(int company,string? session=null)=>await Registration.DangKyNguyenVongAsync(new(){MaSV="EXTRA_S",MaDot="EXTRA_D",MaCongTy=$"EXTRA_C{company}",MaLanHoTro=session??await Session(),ThuTuUuTien=1});
        public ValueTask DisposeAsync()=>Db.DisposeAsync();
    }

    [Fact]
    public async Task SessionAloneGrantsNothingButFacultyApprovalAllowsFourthAttemptAndQuotaCannotReset() {
        await using var f=new Fixture(); await f.Seed(); var id=await f.Session();
        await Assert.ThrowsAsync<InvalidOperationException>(()=>f.Apply(4));
        var unconfirmedVersion=(await f.Db.LanHoTroThucTaps.AsNoTracking().SingleAsync(x=>x.MaLan==id)).PhienBan;
        await Assert.ThrowsAsync<InvalidOperationException>(()=>f.Support.OpenRegistrationAsync("EXTRA_D",id,"EXTRA_S",new(unconfirmedVersion,1,f.Clock.Now.AddDays(2),"Cần hỗ trợ"),"K"));
        await f.Open();
        var context=JsonSerializer.SerializeToElement(await f.Tracking.RegistrationContextAsync("EXTRA_D","EXTRA_S"));
        Assert.True(context.GetProperty("DuocDangKy").GetBoolean()); Assert.Equal(1,context.GetProperty("CacLanHoTro")[0].GetProperty("SoLuotConLai").GetInt32());
        await f.Apply(4);
        var fourth=await f.Db.DangKyThucTaps.SingleAsync(x=>x.MaCongTy=="EXTRA_C4"); Assert.Equal(4,fourth.ThuTuUuTien); Assert.Equal(id,fourth.MaLanHoTro);
        await Assert.ThrowsAsync<InvalidOperationException>(()=>f.Apply(5));
        fourth.TrangThai="TuChoi"; await f.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(()=>f.Apply(5));
        await Assert.ThrowsAsync<InvalidOperationException>(()=>f.Open());
        var session=await f.Db.LanHoTroThucTaps.FindAsync(id); Assert.Contains("MoDangKyBoSung",session!.NhatKyJson);
        Assert.Equal(4,await f.Db.DangKyThucTaps.CountAsync());
    }

    [Fact]
    public async Task WithdrawalConsumesSupplementalQuotaAndASecondGrantNeedsANewExplicitDecision() {
        await using var f=new Fixture(); await f.Seed(); await f.Open(2); await f.Apply(4);
        var fourth=await f.Db.DangKyThucTaps.SingleAsync(x=>x.MaCongTy=="EXTRA_C4");
        Assert.True(await f.Registration.HuyDangKyAsync(fourth.MaDK,"EXTRA_S",false));
        await f.Apply(5); var fifth=await f.Db.DangKyThucTaps.SingleAsync(x=>x.MaCongTy=="EXTRA_C5"); fifth.TrangThai="TuChoi"; await f.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(()=>f.Apply(6));
        var next=await f.Support.SaveAsync("EXTRA_D",null,new("Rà soát hỗ trợ tiếp",new(2029,1,10),["EXTRA_S"]),"K");
        await Assert.ThrowsAsync<InvalidOperationException>(()=>f.Apply(6,next));
        await f.Open(session:next); await f.Apply(6,next);
        Assert.Equal(6,await f.Db.DangKyThucTaps.CountAsync());
        Assert.Equal(3,await f.Db.DangKyThucTaps.CountAsync(x=>x.MaLanHoTro==null));
    }

    [Theory]
    [InlineData("Expired")]
    [InlineData("RoundStart")]
    [InlineData("Published")]
    [InlineData("Closed")]
    [InlineData("CompanyExpired")]
    [InlineData("CompanyFull")]
    public async Task SupplementalApprovalCannotBypassTimePublicationLockOrCompanyCapacity(string restriction) {
        await using var f=new Fixture(); await f.Seed(); await f.Open();
        if(restriction=="Expired") f.Clock.Now=f.Clock.Now.AddDays(2);
        if(restriction=="RoundStart") f.Clock.Now=new(2029,2,1,0,0,0,TimeSpan.FromHours(7));
        if(restriction=="Published") await f.Db.DatabaseSafeSetPublication();
        if(restriction=="Closed") { f.Db.ChotDotThucTaps.Add(new(){MaDot="EXTRA_D",TrangThai="DaChot"}); await f.Db.SaveRoundControlAsync(); }
        if(restriction is "CompanyExpired" or "CompanyFull") { var plan=await f.Db.CongTyTheoDots.FindAsync("EXTRA_C4","EXTRA_D"); if(restriction=="CompanyExpired") plan!.HanDangKy=f.Clock.Now.AddSeconds(-1); else plan!.SoLuongNhan=0; await f.Db.SaveChangesAsync(); }
        await Assert.ThrowsAnyAsync<InvalidOperationException>(()=>f.Apply(4));
        Assert.Equal(3,await f.Db.DangKyThucTaps.CountAsync());
    }

    [Theory]
    [InlineData(0,2,"Hợp lệ")]
    [InlineData(4,2,"Hợp lệ")]
    [InlineData(1,0,"Hợp lệ")]
    [InlineData(1,30,"Hợp lệ")]
    [InlineData(1,2,"")]
    public async Task InvalidGrantIsRejected(int quota,int days,string reason) {
        await using var f=new Fixture(); await f.Seed(); var id=await f.Session(); var version=(await f.Db.LanHoTroThucTaps.FindAsync(id))!.PhienBan;
        await Assert.ThrowsAsync<ArgumentException>(()=>f.Support.OpenRegistrationAsync("EXTRA_D",id,"EXTRA_S",new(version,quota,f.Clock.Now.AddDays(days),reason),"K"));
    }

    [Fact]
    public async Task WrongStudentRoundVersionUnexhaustedAndDuplicateLiveGrantsAreBlocked() {
        await using var f=new Fixture(); await f.Seed(); var id=await f.Session();
        await Assert.ThrowsAnyAsync<Exception>(()=>f.Support.OpenRegistrationAsync("WRONG",id,"EXTRA_S",new(1,1,f.Clock.Now.AddDays(1),"Lý do"),"K"));
        await Assert.ThrowsAnyAsync<Exception>(()=>f.Support.OpenRegistrationAsync("EXTRA_D",id,"OTHER",new(1,1,f.Clock.Now.AddDays(1),"Lý do"),"K"));
        await Assert.ThrowsAnyAsync<Exception>(()=>f.Support.OpenRegistrationAsync("EXTRA_D",id,"EXTRA_S",new(0,1,f.Clock.Now.AddDays(1),"Lý do"),"K"));
        var old=await f.Db.DangKyThucTaps.FindAsync("EXTRA_OLD3"); f.Db.Remove(old!); await f.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(()=>f.Open()); f.Db.Add(old!); await f.Db.SaveChangesAsync();
        await f.Open();
        var second=await f.Support.SaveAsync("EXTRA_D",null,new("Hỗ trợ khác",new(2029,1,10),["EXTRA_S"]),"K");
        await Assert.ThrowsAsync<InvalidOperationException>(()=>f.Open(session:second));
        await Assert.ThrowsAsync<InvalidOperationException>(()=>f.Apply(1)); // Same company remains prohibited.
    }

    [Fact]
    public async Task CountsUseLatestInterviewPerApplicationAndKeepAbsenceAndWithdrawalSeparate() {
        await using var f=new Fixture(); await f.Seed();
        f.Db.DaiDienDoanhNghieps.Add(new(){MaSo="REP",MaCongTy="EXTRA_C1",HoTen="Đại diện"});
        var first=await f.Db.DangKyThucTaps.FindAsync("EXTRA_OLD1"); first!.TrangThai="DaDuyet"; first.KetQuaHoSo=null;
        f.Db.PhongVans.AddRange(new PhongVan{MaPV="PV_OLD",MaDK=first.MaDK,MaSinhVien="EXTRA_S",MaDaiDien="REP",NgayPV=new(2029,1,1),KetQua="KhongDat"},new PhongVan{MaPV="PV_NEW",MaPVTruoc="PV_OLD",MaDK=first.MaDK,MaSinhVien="EXTRA_S",MaDaiDien="REP",NgayPV=new(2029,1,2),KetQua="Dat"});
        var second=await f.Db.DangKyThucTaps.FindAsync("EXTRA_OLD2"); second!.MaPVKetThuc="PV_ABSENT";
        f.Db.PhongVans.Add(new(){MaPV="PV_ABSENT",MaDK=second.MaDK,MaSinhVien="EXTRA_S",MaDaiDien="REP",NgayPV=new(2029,1,3),KetQua="Vang"});
        var third=await f.Db.DangKyThucTaps.FindAsync("EXTRA_OLD3"); third!.KetQuaHoSo="DaRut";
        await f.Db.SaveChangesAsync();
        var detail=JsonSerializer.SerializeToElement(await f.Tracking.DetailAsync("EXTRA_D","EXTRA_S")).GetProperty("SinhVien");
        Assert.Equal(1,detail.GetProperty("SoLanDatUngTuyen").GetInt32()); Assert.Equal(0,detail.GetProperty("SoLanRotUngTuyen").GetInt32());
        Assert.Equal(1,detail.GetProperty("SoLanVangPhongVan").GetInt32()); Assert.Equal(1,detail.GetProperty("SoHoSoKetThucKhac").GetInt32());
    }

    [LocalSqlFact]
    public async Task OneSupplementalAttemptCannotBeConsumedTwiceByConcurrentSqlRequests() {
        var name="CodexSupplementalAudit_"+Guid.NewGuid().ToString("N"); var connection=$"Server=(localdb)\\MSSQLLocalDB;Database={name};Integrated Security=True;TrustServerCertificate=True";
        var options=new DbContextOptionsBuilder<AppDbContext>().UseSqlServer(connection).Options;
        try {
            await DatabaseInitializer.InitializeAsync(connection,NullLogger.Instance); await using var f=new Fixture(options); await f.Seed(); await f.Open(); var id=await f.Session();
            async Task<bool> Apply(int company) { await using var request=new Fixture(options); try { await request.Apply(company,id); return true; } catch(InvalidOperationException) { return false; } }
            Assert.Equal(1,(await Task.WhenAll(Apply(4),Apply(5))).Count(x=>x));
            var fourth=await f.Db.DangKyThucTaps.SingleAsync(x=>x.MaSV=="EXTRA_S"&&x.TrangThai=="ChoDuyet"); fourth.TrangThai="TuChoi"; await f.Db.SaveChangesAsync();
            await Assert.ThrowsAsync<InvalidOperationException>(()=>f.Apply(6)); Assert.Equal(4,await f.Db.DangKyThucTaps.CountAsync(x=>x.MaSV=="EXTRA_S"));
        }
        finally { await using var cleanup=new AppDbContext(options); await cleanup.Database.EnsureDeletedAsync(); }
    }
}

internal static class SupplementalTestPublication
{
    public static async Task DatabaseSafeSetPublication(this AppDbContext db) { var round=await db.DotThucTaps.FindAsync("EXTRA_D"); round!.TrangThaiDanhSachNoi="DuKien"; await db.SaveDanhSachControlAsync(); }
}
