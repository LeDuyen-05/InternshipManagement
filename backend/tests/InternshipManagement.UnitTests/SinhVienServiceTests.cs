using InternshipManagement.BLL.DTOs.SinhVien;
using InternshipManagement.BLL.Services.SinhVien;
using InternshipManagement.BLL.Validators.SinhVien;
using InternshipManagement.DAL.Repositories;
using Moq;
using Xunit;

namespace InternshipManagement.UnitTests;

public class SinhVienServiceTests
{
    [Fact]
    public async Task CreateAsync_WithInvalidGpa_ShouldThrow()
    {
        var repoMock = new Mock<ISinhVienRepository>();
        var validator = new CreateSinhVienValidator();
        var service = new SinhVienService(repoMock.Object, validator);

        var dto = new CreateSinhVienDto { MaSV = "SV001", HoTen = "Nguyen Van A", Gpa = 5.0 };

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(dto));
    }
}
