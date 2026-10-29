using InternshipManagement.BLL.DTOs.DangKyThucTap;
using InternshipManagement.BLL.Exceptions;
using InternshipManagement.BLL.Services.DangKyThucTap;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Moq;
using Xunit;

namespace InternshipManagement.UnitTests;

public class DangKyThucTapServiceTests
{
    private readonly Mock<IDangKyThucTapRepository> _dangKyRepoMock = new();
    private readonly Mock<ICongTyRepository> _congTyRepoMock = new();
    private readonly Mock<ISinhVienRepository> _sinhVienRepoMock = new();

    private DangKyThucTapService CreateService() =>
        new(_dangKyRepoMock.Object, _congTyRepoMock.Object, _sinhVienRepoMock.Object);

    [Fact]
    public async Task DangKyNguyenVongAsync_ExceedsMaxPreferences_ThrowsInvalidOperationException()
    {
        var service = CreateService();
        var request = new CreateDangKyThucTapRequest
        {
            MaSV = "SV001",
            MaCongTy = "CT001",
            MaDot = "DOT01",
            ThuTuUuTien = 1
        };

        _sinhVienRepoMock.Setup(r => r.GetByIdAsync("SV001"))
            .ReturnsAsync(new SinhVien { MaSV = "SV001", HoTen = "Nguyen Van A" });
        _congTyRepoMock.Setup(r => r.GetByIdAsync("CT001"))
            .ReturnsAsync(new CongTy { MaCongTy = "CT001", TenCongTy = "FPT Software", TrangThai = "DaDuyet" });
        _dangKyRepoMock.Setup(r => r.GetDotAsync("DOT01"))
            .ReturnsAsync(new DotThucTap { MaSo = "DOT01", TenDot = "Đợt 1", TrangThai = "DangDienRa" });

        // Currently has 3 registrations
        _dangKyRepoMock.Setup(r => r.CountBySinhVienDotAsync("SV001", "DOT01"))
            .ReturnsAsync(3);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.DangKyNguyenVongAsync(request));
    }

    [Fact]
    public async Task DangKyNguyenVongAsync_UnapprovedCompany_ThrowsInvalidOperationException()
    {
        var service = CreateService();
        var request = new CreateDangKyThucTapRequest
        {
            MaSV = "SV001",
            MaCongTy = "CT002",
            MaDot = "DOT01",
            ThuTuUuTien = 1
        };

        _sinhVienRepoMock.Setup(r => r.GetByIdAsync("SV001"))
            .ReturnsAsync(new SinhVien { MaSV = "SV001" });
        _congTyRepoMock.Setup(r => r.GetByIdAsync("CT002"))
            .ReturnsAsync(new CongTy { MaCongTy = "CT002", TrangThai = "ChoDuyet" });

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.DangKyNguyenVongAsync(request));
    }

    [Fact]
    public async Task DangKyNguyenVongAsync_EndedRound_ThrowsInvalidOperationException()
    {
        var service = CreateService();
        var request = new CreateDangKyThucTapRequest
        {
            MaSV = "SV001",
            MaCongTy = "CT001",
            MaDot = "DOT01",
            ThuTuUuTien = 1
        };

        _sinhVienRepoMock.Setup(r => r.GetByIdAsync("SV001")).ReturnsAsync(new SinhVien { MaSV = "SV001" });
        _congTyRepoMock.Setup(r => r.GetByIdAsync("CT001")).ReturnsAsync(new CongTy { MaCongTy = "CT001", TrangThai = "DaDuyet" });
        _dangKyRepoMock.Setup(r => r.GetDotAsync("DOT01")).ReturnsAsync(new DotThucTap { MaSo = "DOT01", TrangThai = "DaKetThuc" });

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.DangKyNguyenVongAsync(request));
    }

    [Fact]
    public async Task DangKyNguyenVongAsync_DuplicatePriority_ThrowsInvalidOperationException()
    {
        var service = CreateService();
        var request = new CreateDangKyThucTapRequest
        {
            MaSV = "SV001",
            MaCongTy = "CT001",
            MaDot = "DOT01",
            ThuTuUuTien = 2
        };

        _sinhVienRepoMock.Setup(r => r.GetByIdAsync("SV001")).ReturnsAsync(new SinhVien { MaSV = "SV001" });
        _congTyRepoMock.Setup(r => r.GetByIdAsync("CT001")).ReturnsAsync(new CongTy { MaCongTy = "CT001", TrangThai = "DaDuyet" });
        _dangKyRepoMock.Setup(r => r.GetDotAsync("DOT01")).ReturnsAsync(new DotThucTap { MaSo = "DOT01", TrangThai = "DangDienRa" });
        _dangKyRepoMock.Setup(r => r.CountBySinhVienDotAsync("SV001", "DOT01")).ReturnsAsync(1);
        _dangKyRepoMock.Setup(r => r.HasRegisteredAsync("SV001", "CT001", "DOT01")).ReturnsAsync(false);
        _dangKyRepoMock.Setup(r => r.HasPriorityInDotAsync("SV001", "DOT01", 2)).ReturnsAsync(true);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.DangKyNguyenVongAsync(request));
    }

    [Fact]
    public async Task HuyDangKyAsync_StudentCancellingOtherStudent_ThrowsUnauthorizedAccessException()
    {
        var service = CreateService();
        var dangKy = new DangKyThucTap { MaDK = "DK001", MaSV = "SV001", TrangThai = "ChoDuyet" };
        _dangKyRepoMock.Setup(r => r.GetByIdAsync("DK001")).ReturnsAsync(dangKy);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.HuyDangKyAsync("DK001", requesterMaSV: "SV002", isStaff: false));
    }

    [Fact]
    public async Task HuyDangKyAsync_StudentCancellingNotChoDuyet_ThrowsInvalidOperationException()
    {
        var service = CreateService();
        var dangKy = new DangKyThucTap { MaDK = "DK001", MaSV = "SV001", TrangThai = "DaDuyet" };
        _dangKyRepoMock.Setup(r => r.GetByIdAsync("DK001")).ReturnsAsync(dangKy);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.HuyDangKyAsync("DK001", requesterMaSV: "SV001", isStaff: false));
    }

    [Fact]
    public async Task HuyDangKyAsync_StaffCancelling_DeletesAndSaves()
    {
        var service = CreateService();
        var dangKy = new DangKyThucTap { MaDK = "DK001", MaSV = "SV001", TrangThai = "DaDuyet" };
        _dangKyRepoMock.Setup(r => r.GetByIdAsync("DK001")).ReturnsAsync(dangKy);

        var result = await service.HuyDangKyAsync("DK001", requesterMaSV: null, isStaff: true);

        Assert.True(result);
        _dangKyRepoMock.Verify(r => r.Delete(dangKy), Times.Once);
        _dangKyRepoMock.Verify(r => r.SaveChangesAsync(), Times.Once);
    }
}
