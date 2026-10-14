using InternshipManagement.BLL.DTOs.GioiThieu;
using InternshipManagement.BLL.Exceptions;
using InternshipManagement.BLL.Services.GioiThieu;
using InternshipManagement.BLL.Validators.GioiThieu;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Moq;
using Xunit;

namespace InternshipManagement.UnitTests;

public class GioiThieuServiceTests
{
    private readonly Mock<IGioiThieuRepository> _repoMock = new();
    private readonly CreateGioiThieuValidator _validator = new();

    private GioiThieuService CreateService() => new(_repoMock.Object, _validator);

    [Fact]
    public async Task CreateAsync_ValidInput_CallsSaveChangesAsync_AndReturnsDto()
    {
        var service = CreateService();
        var dto = new CreateGioiThieuDto { MaGV = "GV001", MaCongTy = "CT001" };

        _repoMock.Setup(r => r.ExistsGiangVienAsync("GV001")).ReturnsAsync(true);
        _repoMock.Setup(r => r.GetCongTyByIdAsync("CT001")).ReturnsAsync(new CongTy { MaCongTy = "CT001", TenCongTy = "FPT Software" });
        _repoMock.Setup(r => r.ExistsAsync("GV001", "CT001")).ReturnsAsync(false);
        _repoMock.Setup(r => r.AddAsync(It.IsAny<GioiThieu>())).Returns(Task.CompletedTask);
        _repoMock.Setup(r => r.SaveChangesAsync()).ReturnsAsync(1);
        _repoMock.Setup(r => r.GetByIdWithDetailsAsync(It.IsAny<string>()))
            .ReturnsAsync((string id) => new GioiThieu
            {
                MaSo = id,
                MaGV = "GV001",
                MaCongTy = "CT001",
                TrangThaiKetNoi = "DangXem"
            });

        var result = await service.CreateAsync(dto);

        Assert.NotNull(result);
        Assert.Equal("GV001", result.MaGV);
        Assert.Equal("CT001", result.MaCongTy);
        Assert.Equal("DangXem", result.TrangThaiKetNoi);
        _repoMock.Verify(r => r.AddAsync(It.Is<GioiThieu>(g => g.MaGV == "GV001" && g.MaCongTy == "CT001")), Times.Once);
        _repoMock.Verify(r => r.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_GiangVienNotFound_ThrowsArgumentException()
    {
        var service = CreateService();
        var dto = new CreateGioiThieuDto { MaGV = "GV999", MaCongTy = "CT001" };

        _repoMock.Setup(r => r.ExistsGiangVienAsync("GV999")).ReturnsAsync(false);

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(dto));
    }

    [Fact]
    public async Task CreateAsync_DuplicateRecommendation_ThrowsInvalidOperationException()
    {
        var service = CreateService();
        var dto = new CreateGioiThieuDto { MaGV = "GV001", MaCongTy = "CT001" };

        _repoMock.Setup(r => r.ExistsGiangVienAsync("GV001")).ReturnsAsync(true);
        _repoMock.Setup(r => r.GetCongTyByIdAsync("CT001")).ReturnsAsync(new CongTy { MaCongTy = "CT001", TenCongTy = "FPT Software" });
        _repoMock.Setup(r => r.ExistsAsync("GV001", "CT001")).ReturnsAsync(true);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(dto));
    }

    [Fact]
    public async Task UpdateTrangThaiAsync_DaDuyet_SyncsCongTyStatusToDaDuyet()
    {
        var service = CreateService();
        var entity = new GioiThieu { MaSo = "GT001", MaCongTy = "CT001", TrangThaiKetNoi = "DangXem" };
        var congTy = new CongTy { MaCongTy = "CT001", TrangThai = "ChoDuyet" };

        _repoMock.Setup(r => r.GetByIdAsync("GT001")).ReturnsAsync(entity);
        _repoMock.Setup(r => r.GetCongTyByIdAsync("CT001")).ReturnsAsync(congTy);

        await service.UpdateTrangThaiAsync("GT001", new UpdateTrangThaiGioiThieuDto { TrangThaiKetNoi = "DaDuyet" });

        Assert.Equal("DaDuyet", entity.TrangThaiKetNoi);
        Assert.Equal("DaDuyet", congTy.TrangThai);
        _repoMock.Verify(r => r.Update(entity), Times.Once);
        _repoMock.Verify(r => r.UpdateCongTy(congTy), Times.Once);
        _repoMock.Verify(r => r.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task UpdateTrangThaiAsync_InvalidStatus_ThrowsArgumentException()
    {
        var service = CreateService();
        var entity = new GioiThieu { MaSo = "GT001", MaCongTy = "CT001" };
        _repoMock.Setup(r => r.GetByIdAsync("GT001")).ReturnsAsync(entity);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.UpdateTrangThaiAsync("GT001", new UpdateTrangThaiGioiThieuDto { TrangThaiKetNoi = "KhongHopLe" }));
    }
}
