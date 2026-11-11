using InternshipManagement.BLL.Services.GVHuongDan;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Moq;
using Xunit;

namespace InternshipManagement.WorkflowTests;

public class LecturerConfirmedPeriodTests
{
    [Fact]
    public async Task StudentListReturnsDatesOnlyFromApprovedCurrentRoundPlacement()
    {
        var student = new SinhVien { MaSV = "SV", HoTen = "Sinh viên" };
        student.PhanBoThucTaps.Add(new() { MaPhanBo="PB", MaDot="A", TrangThai="DangThucTap", DaDuocKhoaDuyet=true,
            NgayPhanBo=new(2026,9,28), NgayBatDauThucTap=new(2026,10,1), NgayKetThucThucTap=new(2027,1,15) });
        student.PhanBoThucTaps.Add(new() { MaPhanBo="UNAPPROVED", MaDot="A", TrangThai="ChoKhoaDuyet", DaDuocKhoaDuyet=false,
            NgayPhanBo=new(2026,11,1), NgayBatDauThucTap=new(2030,1,1) });
        student.PhanBoThucTaps.Add(new() { MaPhanBo="OTHER", MaDot="B", TrangThai="DangThucTap", DaDuocKhoaDuyet=true,
            NgayPhanBo=new(2026,11,2), NgayBatDauThucTap=new(2031,1,1) });
        var repository = new Mock<IGVHuongDanRepository>();
        repository.Setup(x => x.GetDotThucTapAsync("A")).ReturnsAsync(new DotThucTap { MaSo="A" });
        repository.Setup(x => x.GetDanhSachSVTheoGiangVienAsync("GV",null,"A")).ReturnsAsync(new List<GVHuongDan> {
            new() { MaSo="HD",MaSinhVien="SV",MaDot="A",SinhVien=student }
        });
        var result = Assert.Single(await new GVHuongDanService(repository.Object).GetDanhSachSVTheoGiangVienAsync("GV",maDot:"A"));
        Assert.Equal(new DateTime(2026,10,1),result.NgayBatDauThucTap);
        Assert.Equal(new DateTime(2027,1,15),result.NgayKetThucThucTap);
    }
}
