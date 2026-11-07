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

        // Giới hạn lượt được kiểm tra nguyên tử trong repository (khóa theo đợt) → service phải gọi đúng mức tối đa
        _dangKyRepoMock.Setup(r => r.AddWithinLimitAsync(It.IsAny<DangKyThucTap>(), DangKyThucTapService.MaxNguyenVong))
            .ThrowsAsync(new InvalidOperationException("Đã dùng đủ 3 lượt đăng ký trong đợt."));

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.DangKyNguyenVongAsync(request));
        _dangKyRepoMock.Verify(r => r.AddWithinLimitAsync(It.IsAny<DangKyThucTap>(), DangKyThucTapService.MaxNguyenVong), Times.Once);
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
    public async Task HuyDangKyAsync_StaffCancelling_EndsRegistrationAndKeepsHistory()
    {
        var service = CreateService();
        var dangKy = new DangKyThucTap { MaDK = "DK001", MaSV = "SV001", TrangThai = "DaDuyet" };
        _dangKyRepoMock.Setup(r => r.GetByIdAsync("DK001")).ReturnsAsync(dangKy);

        var result = await service.HuyDangKyAsync("DK001", requesterMaSV: null, isStaff: true);

        // Không xóa bản ghi: chuyển sang TuChoi kèm lý do để giữ lịch sử và lượt đăng ký
        Assert.True(result);
        Assert.Equal("TuChoi", dangKy.TrangThai);
        Assert.False(string.IsNullOrWhiteSpace(dangKy.LyDoKetThuc));
        _dangKyRepoMock.Verify(r => r.Delete(It.IsAny<DangKyThucTap>()), Times.Never);
        _dangKyRepoMock.Verify(r => r.SaveChangesAsync(), Times.Once);
    }
}
