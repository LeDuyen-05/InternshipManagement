using InternshipManagement.BLL.DTOs.SinhVien;
using InternshipManagement.BLL.Exceptions;
using InternshipManagement.BLL.Services.SinhVien;
using InternshipManagement.BLL.Validators.SinhVien;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Moq;
using Xunit;

namespace InternshipManagement.UnitTests;

public class SinhVienServiceTests
{
    private readonly Mock<ISinhVienRepository> _repoMock = new();
    private readonly CreateSinhVienValidator _validator = new();

    private SinhVienService CreateService() => new(_repoMock.Object, _validator);

    [Theory]
    [InlineData(-0.1)]
    [InlineData(4.1)]
    public async Task CreateAsync_WithInvalidGpa_ShouldThrow(decimal invalidGpa)
    {
        var service = CreateService();
        var dto = new CreateSinhVienDto { MaSV = "SV001", HoTen = "Nguyen Van A", Gpa = invalidGpa };

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(dto));
    }

    [Fact]
    public async Task UpdateAsync_NonExistentStudent_ThrowsNotFoundException()
    {
        var service = CreateService();
        _repoMock.Setup(r => r.GetByIdAsync("SV999")).ReturnsAsync((SinhVien?)null);

        var dto = new UpdateSinhVienDto { HoTen = "Nguyen Van B", Gpa = 3.5m };

        await Assert.ThrowsAsync<NotFoundException>(() => service.UpdateAsync("SV999", dto));
    }

    [Theory]
    [InlineData(-0.5)]
    [InlineData(4.5)]
    public async Task UpdateAsync_WithInvalidGpa_ThrowsArgumentException(decimal invalidGpa)
    {
        var service = CreateService();
        var dto = new UpdateSinhVienDto { HoTen = "Nguyen Van A", Gpa = invalidGpa };

        await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateAsync("SV001", dto));
    }

    [Theory]
    [InlineData(0.0)]
    [InlineData(4.0)]
    public async Task UpdateAsync_WithBoundaryGpa_Succeeds(decimal boundaryGpa)
    {
        var service = CreateService();
        var student = new SinhVien { MaSV = "SV001", HoTen = "Nguyen Van A", Gpa = 2.5m };
        _repoMock.Setup(r => r.GetByIdAsync("SV001")).ReturnsAsync(student);
        _repoMock.Setup(r => r.SaveChangesAsync()).ReturnsAsync(1);

        var dto = new UpdateSinhVienDto { HoTen = "Nguyen Van A", Gpa = boundaryGpa };

        await service.UpdateAsync("SV001", dto);

        Assert.Equal(boundaryGpa, student.Gpa);
        _repoMock.Verify(r => r.Update(student), Times.Once);
        _repoMock.Verify(r => r.SaveChangesAsync(), Times.Once);
    }
}
