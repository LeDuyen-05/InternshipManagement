using InternshipManagement.BLL.DTOs.DoanhNghiep;
using InternshipManagement.BLL.Services.DoanhNghiep;
using InternshipManagement.BLL.Services.PhieuChamDiem;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InternshipManagement.UnitTests;

// SV vắng PV ở công ty cũ rồi ứng tuyển công ty khác (cùng "lần" đăng ký, LanDangKy = 1): DN cũ không được
// sửa kết quả hay xếp lại PV cũ, nếu không SV có hai hồ sơ hiệu lực cùng lúc.
public class InterviewCorrectionActiveApplicationTests
{
    private sealed class Clock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(2027, 1, 10, 3, 0, 0, TimeSpan.Zero);
    }

    private static readonly Clock Now = new();

    private static AppDbContext Db(string laterApplicationStatus)
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options) { RoundClock = Now };
        db.DotThucTaps.Add(new DotThucTap { MaSo = "DOT", TenDot = "Đợt", NamHoc = "2026", TrangThai = "DangDienRa", MaRubric = "R",
            ThoiGianBD = new(2027, 2, 1), ThoiGianKT = new(2027, 5, 1) });
        db.CongTys.AddRange(new CongTy { MaCongTy = "CT1", TenCongTy = "Công ty cũ", SoLuongNhan = 3, TrangThai = "DaDuyet" },
            new CongTy { MaCongTy = "CT2", TenCongTy = "Công ty mới", SoLuongNhan = 3, TrangThai = "DaDuyet" });
        db.DaiDienDoanhNghieps.Add(new DaiDienDoanhNghiep { MaSo = "DD1", HoTen = "Đại diện", MaCongTy = "CT1" });
        db.SinhViens.Add(new SinhVien { MaSV = "SV", HoTen = "Sinh viên" });
        db.DangKyThucTaps.AddRange(
            new DangKyThucTap { MaDK = "DK1", MaSV = "SV", MaCongTy = "CT1", MaDot = "DOT", LanDangKy = 1, ThuTuUuTien = 1, TrangThai = "TuChoi",
                MaPVKetThuc = "PV1", LyDoKetThuc = "Vắng phỏng vấn", NgayDangKy = new(2027, 1, 2) },
            new DangKyThucTap { MaDK = "DK2", MaSV = "SV", MaCongTy = "CT2", MaDot = "DOT", LanDangKy = 1, ThuTuUuTien = 2, TrangThai = laterApplicationStatus,
                NgayDangKy = new(2027, 1, 8) });
        db.PhongVans.Add(new PhongVan { MaPV = "PV1", MaDK = "DK1", MaSinhVien = "SV", MaDaiDien = "DD1", NgayPV = new(2027, 1, 5, 9, 0, 0), KetQua = "Vang", PhienBan = 0 });
        db.SaveChanges();
        return db;
    }

    private static DoanhNghiepService Service(AppDbContext db) => new(db, new Mock<IPhieuChamDiemService>().Object, Now);

    private static DieuChinhPhongVanRequest Request(string? result = "Dat") => new()
    {
        MaDot = "DOT", MaDK = "DK1", PhienBan = 0, LyDo = "Nhập nhầm", Nguon = "DoanhNghiep", KetQua = result, NgayPV = new(2027, 1, 20, 9, 0, 0)
    };

    [Fact]
    public async Task OldResultCannotBeCorrectedWhileALaterApplicationIsActive()
    {
        await using var db = Db("ChoDuyet");

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Service(db).SuaKetQuaPhongVanAsync("PV1", Request(), "CT1", "TKDD1", "DoanhNghiep"));

        Assert.Contains("lượt ứng tuyển tiếp", error.Message);
        Assert.Empty(db.PhanBoThucTaps);
        Assert.Equal("TuChoi", db.DangKyThucTaps.Single(x => x.MaDK == "DK1").TrangThai);
    }

    [Fact]
    public async Task OldInterviewCannotBeRescheduledWhileALaterApplicationIsActive()
    {
        await using var db = Db("ChoDuyet");

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Service(db).XepLaiPhongVanAsync("PV1", Request(null), "CT1", "TKDD1", "DoanhNghiep"));

        Assert.Contains("lượt ứng tuyển tiếp", error.Message);
        Assert.Single(db.PhongVans);
        Assert.Equal("TuChoi", db.DangKyThucTaps.Single(x => x.MaDK == "DK1").TrangThai);
    }

    [Fact]
    public async Task OldResultCanBeCorrectedWhenNoOtherApplicationIsActive()
    {
        await using var db = Db("TuChoi");

        await Service(db).SuaKetQuaPhongVanAsync("PV1", Request(), "CT1", "TKDD1", "DoanhNghiep");

        Assert.Equal("Dat", db.PhongVans.Single().KetQua);
        Assert.Equal("CT1", Assert.Single(db.PhanBoThucTaps).MaCongTy);
    }
}
