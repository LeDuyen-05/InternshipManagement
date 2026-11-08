using InternshipManagement.BLL.DTOs.GioiThieu;
using InternshipManagement.BLL.Services.GioiThieu;
using InternshipManagement.BLL.Validators.GioiThieu;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternshipManagement.UnitTests;

// Khoa duyệt/từ chối lời giới thiệu của GV: chỉ công ty còn chờ duyệt (GV đề xuất mới) đổi theo;
// đối tác đã duyệt từ trước giữ nguyên, nhất là khi khoa khác đang dùng.
public class IntroductionCompanyStatusTests
{
    private static readonly DateTime Ngay = new(2026, 11, 8);

    private static AppDbContext Db(string name, string? khoa = null) =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(name).Options, new FixedKhoaScope(khoa));

    private static async Task<string> SeedAsync()
    {
        var name = Guid.NewGuid().ToString();
        await using var db = Db(name);
        db.Khoas.AddRange(new Khoa { MaKhoa = "CNTT", TenKhoa = "Khoa Công nghệ thông tin" }, new Khoa { MaKhoa = "QTKD", TenKhoa = "Khoa Quản trị kinh doanh" });
        db.GiangViens.AddRange(new GiangVien { MaGV = "GA", HoTen = "GV CNTT", MaKhoa = "CNTT" }, new GiangVien { MaGV = "GB", HoTen = "GV QTKD", MaKhoa = "QTKD" });
        db.DotThucTaps.Add(new DotThucTap { MaSo = "DA", TenDot = "Đợt CNTT", NamHoc = "2026-2027", ThoiGianBD = Ngay, ThoiGianKT = Ngay.AddMonths(3), MaRubric = "RA", MaKhoa = "CNTT" });
        db.CongTys.AddRange(
            new CongTy { MaCongTy = "DOITAC", TenCongTy = "Đối tác CNTT đang dùng", TrangThai = "DaDuyet" },
            new CongTy { MaCongTy = "RIENG", TenCongTy = "Đối tác đã duyệt, chưa vào đợt nào", TrangThai = "DaDuyet" },
            new CongTy { MaCongTy = "MOI1", TenCongTy = "Công ty GV đề xuất 1", TrangThai = "ChoDuyet" },
            new CongTy { MaCongTy = "MOI2", TenCongTy = "Công ty GV đề xuất 2", TrangThai = "ChoDuyet" });
        db.PhanBoThucTaps.Add(new PhanBoThucTap { MaPhanBo = "PB1", MaSinhVien = "SV1", MaCongTy = "DOITAC", MaDot = "DA" });
        db.GioiThieus.AddRange(
            new GioiThieu { MaSo = "G1", MaGV = "GB", MaCongTy = "DOITAC", NgayGioiThieu = Ngay, TrangThaiKetNoi = "DangXem" },
            new GioiThieu { MaSo = "G2", MaGV = "GA", MaCongTy = "RIENG", NgayGioiThieu = Ngay, TrangThaiKetNoi = "DaDuyet" },
            new GioiThieu { MaSo = "G3", MaGV = "GB", MaCongTy = "MOI1", NgayGioiThieu = Ngay, TrangThaiKetNoi = "DangXem" },
            new GioiThieu { MaSo = "G4", MaGV = "GB", MaCongTy = "MOI2", NgayGioiThieu = Ngay, TrangThaiKetNoi = "DangXem" });
        await db.SaveChangesAsync();
        return name;
    }

    private static GioiThieuService Service(AppDbContext db) => new(new GioiThieuRepository(db), new CreateGioiThieuValidator());
    private static Task Set(AppDbContext db, string id, string status) => Service(db).UpdateTrangThaiAsync(id, new UpdateTrangThaiGioiThieuDto { TrangThaiKetNoi = status });

    private static async Task<(string Company, string Intro)> StatusAsync(string name, string intro)
    {
        await using var db = Db(name);
        var g = await db.GioiThieus.AsNoTracking().SingleAsync(x => x.MaSo == intro);
        return ((await db.CongTys.AsNoTracking().SingleAsync(x => x.MaCongTy == g.MaCongTy)).TrangThai, g.TrangThaiKetNoi);
    }

    [Fact]
    public async Task RejectingAnIntroductionOfASharedPartnerLeavesTheCompanyApproved()
    {
        var name = await SeedAsync();
        await using (var qtkd = Db(name, "QTKD")) await Set(qtkd, "G1", "TuChoi");
        Assert.Equal(("DaDuyet", "TuChoi"), await StatusAsync(name, "G1"));
    }

    [Fact]
    public async Task RejectingAnIntroductionOfAnApprovedCompanyOnlyChangesTheIntroduction()
    {
        var name = await SeedAsync();
        await using (var cntt = Db(name, "CNTT")) await Set(cntt, "G2", "TuChoi");
        Assert.Equal(("DaDuyet", "TuChoi"), await StatusAsync(name, "G2"));
    }

    [Fact]
    public async Task PendingProposedCompanyFollowsTheDecision()
    {
        var name = await SeedAsync();
        await using (var qtkd = Db(name, "QTKD"))
        {
            await Set(qtkd, "G3", "DaDuyet");
            await Set(qtkd, "G4", "TuChoi");
        }
        Assert.Equal(("DaDuyet", "DaDuyet"), await StatusAsync(name, "G3"));
        Assert.Equal(("TuChoi", "TuChoi"), await StatusAsync(name, "G4"));

        // Đã từ chối thì công ty không còn chờ duyệt: đổi ý phải duyệt công ty ở chức năng quản lý công ty.
        await using (var qtkd = Db(name, "QTKD")) await Set(qtkd, "G4", "DaDuyet");
        Assert.Equal(("TuChoi", "DaDuyet"), await StatusAsync(name, "G4"));
    }
}
