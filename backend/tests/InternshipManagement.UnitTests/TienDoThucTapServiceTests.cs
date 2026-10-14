using InternshipManagement.BLL.DTOs.TienDoThucTap;
using InternshipManagement.BLL.Services.TienDoThucTap;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Moq;
using Xunit;

namespace InternshipManagement.UnitTests;

public class TienDoThucTapServiceTests
{
    private readonly Mock<ITienDoThucTapRepository> _repoMock = new();

    private TienDoThucTapService CreateService() => new(_repoMock.Object);

    [Fact]
    public async Task NopBaoCaoTienDoAsync_SubmittingForOtherStudent_ThrowsUnauthorizedAccessException()
    {
        var service = CreateService();
        var existing = new TienDoThucTap
        {
            MaTienDo = "TD001",
            MaSV = "SV001",
            TrangThaiDuyet = "ChuaNop"
        };
        _repoMock.Setup(r => r.GetByIdAsync("TD001")).ReturnsAsync(existing);

        var request = new NopBaoCaoRequest
        {
            MaTienDo = "TD001",
            MaSV = "SV002",
            NoiDungBaoCao = "Báo cáo tuần 1"
        };

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.NopBaoCaoTienDoAsync(request, userMaSV: "SV002"));
    }

    [Fact]
    public async Task NopBaoCaoTienDoAsync_WhenAlreadyApproved_ThrowsInvalidOperationException()
    {
        var service = CreateService();
        var existing = new TienDoThucTap
        {
            MaTienDo = "TD001",
            MaSV = "SV001",
            TrangThaiDuyet = "DaDuyet"
        };
        _repoMock.Setup(r => r.GetByIdAsync("TD001")).ReturnsAsync(existing);

        var request = new NopBaoCaoRequest
        {
            MaTienDo = "TD001",
            MaSV = "SV001",
            NoiDungBaoCao = "Nộp lại bài"
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.NopBaoCaoTienDoAsync(request, userMaSV: "SV001"));
    }

    [Fact]
    public async Task NopBaoCaoTienDoAsync_ValidInput_TransitionsToDaNop()
    {
        var service = CreateService();
        var existing = new TienDoThucTap
        {
            MaTienDo = "TD001",
            MaSV = "SV001",
            TrangThaiDuyet = "ChuaNop"
        };
        _repoMock.Setup(r => r.GetByIdAsync("TD001")).ReturnsAsync(existing);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<TienDoThucTap>()))
            .ReturnsAsync((TienDoThucTap t) => t);

        var request = new NopBaoCaoRequest
        {
            MaTienDo = "TD001",
            MaSV = "SV001",
            NoiDungBaoCao = "Báo cáo tuần 1 hoàn thành"
        };

        var result = await service.NopBaoCaoTienDoAsync(request, userMaSV: "SV001");

        Assert.Equal("DaNop", result.TrangThaiDuyet);
        Assert.Equal("Báo cáo tuần 1 hoàn thành", result.NoiDungBaoCao);
        _repoMock.Verify(r => r.UpdateAsync(It.Is<TienDoThucTap>(t => t.TrangThaiDuyet == "DaNop")), Times.Once);
    }

    [Fact]
    public async Task DuyetTienDoAsync_WhenStatusNotDaNop_ThrowsInvalidOperationException()
    {
        var service = CreateService();
        var existing = new TienDoThucTap
        {
            MaTienDo = "TD001",
            MaSV = "SV001",
            TrangThaiDuyet = "ChuaNop"
        };
        _repoMock.Setup(r => r.GetByIdAsync("TD001")).ReturnsAsync(existing);

        var request = new DuyetTienDoRequest
        {
            TrangThaiDuyet = "DaDuyet",
            NhanXet = "Tốt"
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.DuyetTienDoAsync("TD001", request, actorMaGV: "GV001", isStaff: false));
    }

    [Fact]
    public async Task DuyetTienDoAsync_LecturerNotSupervisor_ThrowsUnauthorizedAccessException()
    {
        var service = CreateService();
        var existing = new TienDoThucTap
        {
            MaTienDo = "TD001",
            MaSV = "SV001",
            TrangThaiDuyet = "DaNop"
        };
        _repoMock.Setup(r => r.GetByIdAsync("TD001")).ReturnsAsync(existing);
        _repoMock.Setup(r => r.IsSupervisorAsync("GV002", "SV001")).ReturnsAsync(false);

        var request = new DuyetTienDoRequest
        {
            TrangThaiDuyet = "DaDuyet",
            NhanXet = "Duyệt"
        };

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.DuyetTienDoAsync("TD001", request, actorMaGV: "GV002", isStaff: false));
    }

    [Fact]
    public async Task DuyetTienDoAsync_LecturerIsSupervisor_ApprovesSuccessfully()
    {
        var service = CreateService();
        var existing = new TienDoThucTap
        {
            MaTienDo = "TD001",
            MaSV = "SV001",
            TrangThaiDuyet = "DaNop"
        };
        _repoMock.Setup(r => r.GetByIdAsync("TD001")).ReturnsAsync(existing);
        _repoMock.Setup(r => r.IsSupervisorAsync("GV001", "SV001")).ReturnsAsync(true);
        _repoMock.Setup(r => r.CapNhatTrangThaiDuyetAsync("TD001", "DaDuyet", "Đạt yêu cầu"))
            .ReturnsAsync(true);

        var request = new DuyetTienDoRequest
        {
            TrangThaiDuyet = "DaDuyet",
            NhanXet = "Đạt yêu cầu"
        };

        var result = await service.DuyetTienDoAsync("TD001", request, actorMaGV: "GV001", isStaff: false);

        Assert.True(result);
        _repoMock.Verify(r => r.CapNhatTrangThaiDuyetAsync("TD001", "DaDuyet", "Đạt yêu cầu"), Times.Once);
    }
}
