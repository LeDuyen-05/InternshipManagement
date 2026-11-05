using InternshipManagement.BLL.DTOs.GVHuongDan;
using InternshipManagement.BLL.Services.GVHuongDan;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Moq;
using Xunit;

namespace InternshipManagement.UnitTests;

public class GVHuongDanServiceTests
{
    private readonly Mock<IGVHuongDanRepository> _repoMock = new();
    private readonly GVHuongDanService _service;

    public GVHuongDanServiceTests()
    {
        _service = new GVHuongDanService(_repoMock.Object);
        _repoMock.Setup(r => r.GetDotThucTapAsync("DOT01")).ReturnsAsync(new DotThucTap { MaSo = "DOT01", TrangThai = "DangDienRa" });
        _repoMock.Setup(r => r.SinhVienCoPhanBoAsync(It.IsAny<string>(), "DOT01")).ReturnsAsync(true);

        _repoMock.Setup(r => r.ExecuteInTransactionAsync(It.IsAny<Func<Task<SVHuongDanDto>>>()))
            .Returns<Func<Task<SVHuongDanDto>>>(op => op());

        _repoMock.Setup(r => r.ExecuteInTransactionAsync(It.IsAny<Func<Task<PhanCongHangLoatResult>>>()))
            .Returns<Func<Task<PhanCongHangLoatResult>>>(op => op());

        _repoMock.Setup(r => r.ExecuteInTransactionAsync(It.IsAny<Func<Task<bool>>>()))
            .Returns<Func<Task<bool>>>(op => op());
    }

    [Fact]
    public async Task PhanCongDonLeAsync_WhenUnderQuota_Succeeds()
    {
        var gv = new GiangVien { MaGV = "GV001", HoTen = "Nguyen Van A", ChiTieuHD = 5 };
        _repoMock.Setup(r => r.GetGiangVienByIdAsync("GV001")).ReturnsAsync(gv);
        _repoMock.Setup(r => r.SinhVienTonTaiAsync("SV001")).ReturnsAsync(true);
        _repoMock.Setup(r => r.SinhVienDaCoGVHDAsync("SV001", "DOT01")).ReturnsAsync(false);
        _repoMock.Setup(r => r.CountSVHienTaiByGiangVienAsync("GV001", "DOT01")).ReturnsAsync(2);

        var assignment = new GVHuongDan
        {
            MaSo = "HD001", MaDot = "DOT01",
            MaGiangVien = "GV001",
            MaSinhVien = "SV001",
            NgayPC = DateTime.Now,
            TrangThai = "DangHuongDan",
            GiangVien = gv,
            SinhVien = new SinhVien { MaSV = "SV001", HoTen = "Sinh Vien 1" }
        };
        _repoMock.Setup(r => r.PhanCongAsync("GV001", "SV001", "DOT01")).ReturnsAsync(assignment);

        var req = new PhanCongDonLeRequest { MaDot = "DOT01", MaGV = "GV001", MaSV = "SV001" };
        var result = await _service.PhanCongDonLeAsync(req);

        Assert.NotNull(result);
        Assert.Equal("SV001", result.MaSV);
        Assert.Equal("Sinh Vien 1", result.HoTen);
    }

    [Fact]
    public async Task PhanCongDonLeAsync_WhenQuotaReached_ThrowsInvalidOperationException()
    {
        var gv = new GiangVien { MaGV = "GV001", HoTen = "Nguyen Van A", ChiTieuHD = 2 };
        _repoMock.Setup(r => r.GetGiangVienByIdAsync("GV001")).ReturnsAsync(gv);
        _repoMock.Setup(r => r.SinhVienTonTaiAsync("SV001")).ReturnsAsync(true);
        _repoMock.Setup(r => r.SinhVienDaCoGVHDAsync("SV001", "DOT01")).ReturnsAsync(false);
        _repoMock.Setup(r => r.CountSVHienTaiByGiangVienAsync("GV001", "DOT01")).ReturnsAsync(2);

        var req = new PhanCongDonLeRequest { MaDot = "DOT01", MaGV = "GV001", MaSV = "SV001" };
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.PhanCongDonLeAsync(req));
    }

    [Fact]
    public async Task DoiGiangVienAsync_WhenTargetFull_ThrowsInvalidOperationException()
    {
        var current = new GVHuongDan
        {
            MaSo = "HD001", MaDot = "DOT01",
            MaGiangVien = "GV001",
            MaSinhVien = "SV001",
            TrangThai = "DangHuongDan"
        };
        _repoMock.Setup(r => r.GetChiTietPhanCongAsync("HD001")).ReturnsAsync(current);

        var targetGv = new GiangVien { MaGV = "GV002", HoTen = "Tran Van B", ChiTieuHD = 3 };
        _repoMock.Setup(r => r.GetGiangVienByIdAsync("GV002")).ReturnsAsync(targetGv);
        _repoMock.Setup(r => r.CountSVHienTaiByGiangVienAsync("GV002", "DOT01")).ReturnsAsync(3);

        var req = new DoiGiangVienRequest { MaDot = "DOT01", MaSo = "HD001", MaGVMoi = "GV002" };
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.DoiGiangVienAsync(req));
    }

    [Fact]
    public async Task PhanCongHangLoatAsync_ReturnsCorrectSuccessAndFailureLists()
    {
        var gv = new GiangVien { MaGV = "GV001", HoTen = "Nguyen Van A", ChiTieuHD = 2 };
        _repoMock.Setup(r => r.GetGiangVienByIdAsync("GV001")).ReturnsAsync(gv);
        _repoMock.Setup(r => r.SinhVienTonTaiAsync("SV001")).ReturnsAsync(true);
        _repoMock.Setup(r => r.SinhVienTonTaiAsync("SV002")).ReturnsAsync(true);
        _repoMock.Setup(r => r.SinhVienDaCoGVHDAsync("SV001", "DOT01")).ReturnsAsync(false);
        _repoMock.Setup(r => r.SinhVienDaCoGVHDAsync("SV002", "DOT01")).ReturnsAsync(true); // SV002 đã có GVHD
        _repoMock.Setup(r => r.CountSVHienTaiByGiangVienAsync("GV001", "DOT01")).ReturnsAsync(0);

        var assignment = new GVHuongDan
        {
            MaSo = "HD001", MaDot = "DOT01",
            MaGiangVien = "GV001",
            MaSinhVien = "SV001",
            GiangVien = gv,
            SinhVien = new SinhVien { MaSV = "SV001", HoTen = "SV 1" }
        };
        _repoMock.Setup(r => r.PhanCongAsync("GV001", "SV001", "DOT01")).ReturnsAsync(assignment);

        var req = new PhanCongHangLoatRequest
        {
            MaDot = "DOT01", MaGV = "GV001",
            DanhSachMaSV = new List<string> { "SV001", "SV002" }
        };

        var result = await _service.PhanCongHangLoatAsync(req);

        Assert.Single(result.ThanhCong);
        Assert.Single(result.KhongThanhCong);
        Assert.Contains(result.ThanhCong, x => x.MaSV == "SV001");
        Assert.Contains(result.KhongThanhCong, x => x.MaSV == "SV002");
    }
}
