using InternshipManagement.BLL.DTOs.PhieuChamDiem;
using InternshipManagement.BLL.Services.PhieuChamDiem;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Moq;
using Xunit;

namespace InternshipManagement.UnitTests;

public class PhieuChamDiemServiceTests
{
    private readonly Mock<IPhieuChamDiemRepository> _repoMock = new();
    private readonly PhieuChamDiemService _service;

    public PhieuChamDiemServiceTests()
    {
        _service = new PhieuChamDiemService(_repoMock.Object);
        _repoMock.Setup(r => r.GetDanhSachTieuChiAsync()).ReturnsAsync(new List<TieuChi>
        {
            new() { MaTieuChi = "TC01", TenTieuChi = "Kỷ luật", DiemToiDa = 3 },
            new() { MaTieuChi = "TC02", TenTieuChi = "Chuyên môn", DiemToiDa = 4 }
        });
        _repoMock.Setup(r => r.GetDotThucTapAsync("DOT01")).ReturnsAsync(new DotThucTap
        {
            MaSo = "DOT01",
            TenDot = "Đợt 1",
            TrangThai = "DangDienRa"
        });
    }

    [Fact]
    public async Task LuuPhieuChamDiemAsync_WhenScoreExceedsMax_ThrowsArgumentException()
    {
        var assignment = new GVHuongDan { MaSo = "HD01", MaGiangVien = "GV001", MaSinhVien = "SV001", TrangThai = "DangHuongDan" };
        _repoMock.Setup(r => r.GetActiveAssignmentAsync("SV001")).ReturnsAsync(assignment);

        var req = new LuuPhieuChamRequest(
            "SV001",
            "DOT01",
            null,
            null,
            new List<ChiTietDiemInput>
            {
                new("TC01", 3.5m) // DiemToiDa là 3
            }
        );

        await Assert.ThrowsAsync<ArgumentException>(() => _service.LuuPhieuChamDiemAsync(req, "GV001", isStaff: false));
    }

    [Fact]
    public async Task LuuPhieuChamDiemAsync_WhenLecturerNotAssigned_ThrowsUnauthorizedAccessException()
    {
        var assignment = new GVHuongDan { MaSo = "HD01", MaGiangVien = "GV001", MaSinhVien = "SV001", TrangThai = "DangHuongDan" };
        _repoMock.Setup(r => r.GetActiveAssignmentAsync("SV001")).ReturnsAsync(assignment);

        var req = new LuuPhieuChamRequest(
            "SV001",
            "DOT01",
            null,
            null,
            new List<ChiTietDiemInput> { new("TC01", 2.5m) }
        );

        // GV002 cố tình chấm cho SV001 do GV001 hướng dẫn
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _service.LuuPhieuChamDiemAsync(req, "GV002", isStaff: false));
    }

    [Fact]
    public async Task LuuPhieuChamDiemAsync_CalculatesTotalAndUsesAssignmentId()
    {
        var assignment = new GVHuongDan { MaSo = "HD999", MaGiangVien = "GV001", MaSinhVien = "SV001", TrangThai = "DangHuongDan" };
        _repoMock.Setup(r => r.GetActiveAssignmentAsync("SV001")).ReturnsAsync(assignment);

        PhieuChamDiem? capturedPhieu = null;
        _repoMock.Setup(r => r.LuuPhieuChamDiemAsync(It.IsAny<PhieuChamDiem>(), It.IsAny<IEnumerable<ChiTietChamDiem>>()))
            .Callback<PhieuChamDiem, IEnumerable<ChiTietChamDiem>>((p, cts) =>
            {
                capturedPhieu = p;
                p.MaPhieu = "PCD001";
            })
            .ReturnsAsync((PhieuChamDiem p, IEnumerable<ChiTietChamDiem> cts) => p);

        _repoMock.Setup(r => r.GetPhieuChamBySinhVienAndDotAsync("SV001", "DOT01"))
            .ReturnsAsync(() => capturedPhieu);

        var req = new LuuPhieuChamRequest(
            "SV001",
            "DOT01",
            "FAKE_GV_CODE",
            9.9m, // Client gửi 9.9 nhưng chi tiết là 2.0 + 3.0 = 5.0
            new List<ChiTietDiemInput>
            {
                new("TC01", 2.0m),
                new("TC02", 3.0m)
            }
        );

        var result = await _service.LuuPhieuChamDiemAsync(req, "GV001", isStaff: false);

        Assert.NotNull(capturedPhieu);
        Assert.Equal("HD999", capturedPhieu.MaGVHuongDan); // Lưu mã phân công, không lưu fake mã GV
        Assert.Equal(5.0m, capturedPhieu.TongDiem); // Bỏ qua 9.9 từ client, tự tính 5.0
        Assert.Equal(5.0m, result.TongDiem);
    }
}
