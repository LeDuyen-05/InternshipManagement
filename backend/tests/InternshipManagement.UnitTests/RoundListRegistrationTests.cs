using InternshipManagement.BLL.DTOs.ThucTapTuTim;
using InternshipManagement.BLL.Services.DangKyThucTap;
using InternshipManagement.BLL.Services.ThucTapTuTim;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Common;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InternshipManagement.UnitTests;

// Chỉ sinh viên thuộc đợt (có tên do Khoa lập hoặc đã có hồ sơ trong đợt) mới tự đăng ký nguyện vọng hoặc nộp hồ sơ tự tìm.
public class RoundListRegistrationTests
{
    private static AppDbContext Db(bool roundHasList)
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.DotThucTaps.Add(new DotThucTap { MaSo = "DOT", TenDot = "Đợt A", NamHoc = "2026", TrangThai = "DangDienRa", MaRubric = "R" });
        foreach (var id in new[] { "LISTED", "REMOVED", "OUTSIDE", "LEGACY" }) db.SinhViens.Add(new SinhVien { MaSV = id, HoTen = id });
        if (roundHasList)
        {
            db.SinhVienThamGiaDots.Add(Member("LISTED", true));
            db.SinhVienThamGiaDots.Add(Member("REMOVED", false));
        }
        // SV đã có hồ sơ trong đợt từ trước khi đợt có danh sách.
        db.DangKyThucTaps.Add(new DangKyThucTap { MaDK = "DK", MaSV = "LEGACY", MaCongTy = "CT", MaDot = "DOT", NgayDangKy = DateTime.Today, TrangThai = "TuChoi" });
        db.SaveChanges();
        return db;
    }

    private static SinhVienThamGiaDot Member(string id, bool active) => new()
    {
        MaDot = "DOT", MaSV = id, DangThamGia = active, NgayThem = DateTimeOffset.UtcNow, NguoiThem = "KHOA", NgayCapNhat = DateTimeOffset.UtcNow, NguoiCapNhat = "KHOA"
    };

    private static DangKyThucTapService Registration(AppDbContext db)
        => new(new DangKyThucTapRepository(db), new Mock<ICongTyRepository>().Object, new Mock<ISinhVienRepository>().Object);

    [Fact]
    public async Task ListedStudentsMayRegisterButOutsidersAndRemovedStudentsMayNot()
    {
        await using var db = Db(roundHasList: true);
        var service = Registration(db);

        Assert.Null(await service.KiemTraDieuKienDangKyAsync("LISTED", "DOT"));
        Assert.Contains("chưa có tên trong danh sách sinh viên của đợt Đợt A", await service.KiemTraDieuKienDangKyAsync("OUTSIDE", "DOT"));
        Assert.Contains("đưa ra khỏi danh sách", await service.KiemTraDieuKienDangKyAsync("REMOVED", "DOT"));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task StudentsWithRecordsInTheRoundKeepParticipating(bool roundHasList)
    {
        // Như danh sách đợt của Khoa: SV đã có hồ sơ trong đợt vẫn thuộc đợt, kể cả khi Khoa lập danh sách sau.
        await using var db = Db(roundHasList);
        var service = Registration(db);

        Assert.Equal(ThamGiaDot.CoHoSoTrongDot, await DanhSachDot.ThamGiaAsync(db, "LEGACY", "DOT"));
        Assert.Null(await service.KiemTraDieuKienDangKyAsync("LEGACY", "DOT"));
        Assert.Contains("chưa có tên trong danh sách", await service.KiemTraDieuKienDangKyAsync("OUTSIDE", "DOT"));
    }

    [Fact]
    public async Task SelfFoundPlacementRequiresTheRoundList()
    {
        await using var db = Db(roundHasList: true);
        var outside = new ThucTapTuTimService(db);
        GuiHoSoTuTimRequest Request() => new("DOT", null, "Công ty ngoài", "Địa chỉ", "Thực tập sinh", "Nhân sự", "hr@example.test",
            new(2026, 10, 1), new(2026, 12, 31), true);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => outside.SubmitAsync("OUTSIDE", Request()));
        Assert.Contains("nộp hồ sơ nơi thực tập tự tìm", error.Message);
        Assert.NotNull(await outside.SubmitAsync("LISTED", Request()));
    }
}
