using InternshipManagement.BLL.DTOs.HoSoNangLuc;
using InternshipManagement.BLL.Services.DangKyThucTap;
using InternshipManagement.BLL.Services.HoSoNangLuc;
using InternshipManagement.BLL.Services.PhongVan;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Moq;
using Xunit;

namespace InternshipManagement.UnitTests;

/// <summary>Quy tắc nghiệp vụ phía sinh viên phát hiện khi rà soát giao diện.</summary>
public class SinhVienNghiepVuTests
{
    [Fact]
    public async Task SinhVien_KhongTuSuaDuocGpaVaThongTinHocVu()
    {
        var sv = new SinhVien { MaSV = "SV001", HoTen = "Nguyễn A", Lop = "CNTT01", Gpa = 2.5m, ChuyenNganh = "CNTT" };
        var svRepo = new Mock<ISinhVienRepository>();
        svRepo.Setup(r => r.GetByIdAsync("SV001")).ReturnsAsync(sv);
        var hsRepo = new Mock<IHoSoNangLucRepository>();
        var service = new HoSoNangLucService(hsRepo.Object, svRepo.Object);

        await service.UpdateHoSoAsync("SV001", new UpdateHoSoNangLucRequest
        {
            HoTen = "Tên khác", Lop = "X", Gpa = 3.9, ChuyenNganh = "AI", KyNang = "React"
        });

        Assert.Equal(("Nguyễn A", "CNTT01", 2.5m, "CNTT"), (sv.HoTen, sv.Lop, sv.Gpa!.Value, sv.ChuyenNganh));
        Assert.Equal("React", sv.KyNang);
    }

    [Fact]
    public async Task Khoa_SuaDuocGpa()
    {
        var sv = new SinhVien { MaSV = "SV001", HoTen = "Nguyễn A", Gpa = 2.5m };
        var svRepo = new Mock<ISinhVienRepository>();
        svRepo.Setup(r => r.GetByIdAsync("SV001")).ReturnsAsync(sv);
        var service = new HoSoNangLucService(new Mock<IHoSoNangLucRepository>().Object, svRepo.Object);

        await service.UpdateHoSoAsync("SV001", new UpdateHoSoNangLucRequest { HoTen = "Nguyễn A", Gpa = 3.1 }, laKhoa: true);

        Assert.Equal(3.1m, sv.Gpa);
    }

    [Fact]
    public async Task NguyenVong_DaDuyetChuaPhanBo_KhongPhaiTrungTuyen()
    {
        var dkRepo = new Mock<IDangKyThucTapRepository>();
        dkRepo.Setup(r => r.GetBySinhVienAsync("SV001")).ReturnsAsync(new List<DangKyThucTap>
        {
            new() { MaDK = "DK1", MaSV = "SV001", MaCongTy = "CT001", MaDot = "DOT02", TrangThai = "DaDuyet" },
            new() { MaDK = "DK2", MaSV = "SV001", MaCongTy = "CT002", MaDot = "DOT02", TrangThai = "DaDuyet" },
        });
        dkRepo.Setup(r => r.GetPhanBoConHieuLucAsync("SV001")).ReturnsAsync(new List<PhanBoThucTap>
        {
            new() { MaSinhVien = "SV001", MaCongTy = "CT002", MaDot = "DOT02", TrangThai = "ChuaNhanViec" }
        });
        dkRepo.Setup(r => r.GetKetQuaPhongVanAsync("SV001"))
            .ReturnsAsync(new List<(string, string?, DateTime)> { ("CT001", "ChuaCoKetQua", DateTime.Today) });
        var service = new DangKyThucTapService(dkRepo.Object, new Mock<ICongTyRepository>().Object, new Mock<ISinhVienRepository>().Object);

        var list = await service.GetDanhSachDangKyBySinhVienAsync("SV001");

        Assert.False(list.Single(d => d.MaDK == "DK1").DaTiepNhan);
        Assert.Equal("ChuaCoKetQua", list.Single(d => d.MaDK == "DK1").KetQuaPhongVan);
        Assert.True(list.Single(d => d.MaDK == "DK2").DaTiepNhan);
    }

    [Fact]
    public async Task DaTrungTuyen_KhongDangKyHayDeXuatThem_VaBaoDungLyDo()
    {
        var dkRepo = new Mock<IDangKyThucTapRepository>();
        var ctRepo = new Mock<ICongTyRepository>();
        var svRepo = new Mock<ISinhVienRepository>();
        svRepo.Setup(r => r.GetByIdAsync("SV020")).ReturnsAsync(new SinhVien { MaSV = "SV020", HoTen = "B" });
        ctRepo.Setup(r => r.GetByIdAsync("CT003")).ReturnsAsync(new CongTy { MaCongTy = "CT003", TenCongTy = "Tiki", TrangThai = "DaDuyet" });
        ctRepo.Setup(r => r.GetByIdAsync("CT004")).ReturnsAsync(new CongTy { MaCongTy = "CT004", TenCongTy = "Sao Việt", TrangThai = "DaDuyet" });
        ctRepo.Setup(r => r.GetDotDangDienRaAsync()).ReturnsAsync(new DotThucTap { MaSo = "DOT02", TrangThai = "DangDienRa" });
        dkRepo.Setup(r => r.GetDotAsync("DOT02")).ReturnsAsync(new DotThucTap { MaSo = "DOT02", TrangThai = "DangDienRa" });
        dkRepo.Setup(r => r.CountBySinhVienDotAsync("SV020", "DOT02")).ReturnsAsync(3); // đã đủ 3 NV
        dkRepo.Setup(r => r.HasApprovedRegistrationInDotAsync("SV020", "DOT02")).ReturnsAsync(true);
        dkRepo.Setup(r => r.GetPhanBoConHieuLucAsync("SV020")).ReturnsAsync(new List<PhanBoThucTap>
        {
            new() { MaSinhVien = "SV020", MaCongTy = "CT004", MaDot = "DOT02", TrangThai = "ChuaNhanViec", CongTy = new CongTy { TenCongTy = "Sao Việt" } }
        });
        var service = new DangKyThucTapService(dkRepo.Object, ctRepo.Object, svRepo.Object);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.DangKyNguyenVongAsync(
            new BLL.DTOs.DangKyThucTap.CreateDangKyThucTapRequest { MaSV = "SV020", MaCongTy = "CT003", MaDot = "DOT02", ThuTuUuTien = 2 }));
        Assert.Contains("trúng tuyển tại Sao Việt", ex.Message);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.DeXuatCongTyMoiAsync(
            new BLL.DTOs.DangKyThucTap.DeXuatCongTyRequest { MaSV = "SV020", TenCongTy = "Công ty mới" }));
        ctRepo.Verify(r => r.AddAsync(It.IsAny<CongTy>()), Times.Never);
    }

    // SV001: đậu phỏng vấn và hoàn thành thực tập ở DOT01, sau đó đăng ký tiếp ở DOT02
    [Theory]
    [InlineData(8.5, true, false)]   // đã đạt học phần → không được đăng ký lại
    [InlineData(3.5, true, true)]    // không đạt (F) → được đăng ký học lại
    [InlineData(null, false, false)] // hoàn thành nhưng chưa có kết quả → chưa được đăng ký
    public async Task DaHoanThanhThucTapDotTruoc_ChiDuocDangKyLaiKhiKhongDat(double? tongDiem, bool daDu, bool duocDangKy)
    {
        var dkRepo = new Mock<IDangKyThucTapRepository>();
        dkRepo.Setup(r => r.GetPhanBoConHieuLucAsync("SV001")).ReturnsAsync(new List<PhanBoThucTap>
        {
            new()
            {
                MaSinhVien = "SV001", MaCongTy = "CT001", MaDot = "DOT01", TrangThai = "HoanThanh",
                CongTy = new CongTy { TenCongTy = "FPT Software" }, DotThucTap = new DotThucTap { TenDot = "Đợt 1" }
            }
        });
        dkRepo.Setup(r => r.GetKetQuaThucTapAsync("SV001", "DOT01"))
            .ReturnsAsync(((decimal?)(tongDiem.HasValue ? (decimal)tongDiem.Value : null), daDu));
        var service = new DangKyThucTapService(dkRepo.Object, new Mock<ICongTyRepository>().Object, new Mock<ISinhVienRepository>().Object);

        var lyDo = await service.KiemTraDieuKienDangKyAsync("SV001", "DOT02");

        Assert.Equal(duocDangKy, lyDo == null);
        if (!duocDangKy) Assert.Contains("FPT Software", lyDo);
    }

    [Fact]
    public async Task DangThucTapDotKhac_KhongDuocDangKy()
    {
        var dkRepo = new Mock<IDangKyThucTapRepository>();
        dkRepo.Setup(r => r.GetPhanBoConHieuLucAsync("SV001")).ReturnsAsync(new List<PhanBoThucTap>
        {
            new() { MaSinhVien = "SV001", MaCongTy = "CT001", MaDot = "DOT01", TrangThai = "DangThucTap" }
        });
        var service = new DangKyThucTapService(dkRepo.Object, new Mock<ICongTyRepository>().Object, new Mock<ISinhVienRepository>().Object);

        Assert.NotNull(await service.KiemTraDieuKienDangKyAsync("SV001", "DOT02"));
    }

    [Fact]
    public async Task HuyNguyenVong_KhiDaCoLichPhongVan_BiChan()
    {
        var dkRepo = new Mock<IDangKyThucTapRepository>();
        dkRepo.Setup(r => r.GetByIdAsync("DK1")).ReturnsAsync(new DangKyThucTap { MaDK = "DK1", MaSV = "SV001", MaCongTy = "CT004", TrangThai = "ChoDuyet" });
        dkRepo.Setup(r => r.GetKetQuaPhongVanAsync("SV001"))
            .ReturnsAsync(new List<(string, string?, DateTime)> { ("CT004", "ChuaCoKetQua", DateTime.Today) });
        var service = new DangKyThucTapService(dkRepo.Object, new Mock<ICongTyRepository>().Object, new Mock<ISinhVienRepository>().Object);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.HuyDangKyAsync("DK1", "SV001", isStaff: false));
        dkRepo.Verify(r => r.Delete(It.IsAny<DangKyThucTap>()), Times.Never);
    }

    [Fact]
    public async Task XacNhanTiepNhan_ChuyenSangDangThucTap_VaChiChoChinhSinhVien()
    {
        var pb = new PhanBoThucTap { MaPhanBo = "PB1", MaSinhVien = "SV001", TrangThai = "ChuaNhanViec", DotThucTap = new DotThucTap { TrangThai = "DangDienRa" } };
        var pbRepo = new Mock<IPhanBoThucTapRepository>();
        pbRepo.Setup(r => r.GetForUpdateAsync("PB1")).ReturnsAsync(pb);
        pbRepo.Setup(r => r.GetBySinhVienAsync("SV001")).ReturnsAsync(pb);
        var service = new PhongVanService(new Mock<IPhongVanRepository>().Object, pbRepo.Object);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.XacNhanTiepNhanAsync("PB1", "SV999"));
        await service.XacNhanTiepNhanAsync("PB1", "SV001");

        Assert.Equal("DangThucTap", pb.TrangThai);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.XacNhanTiepNhanAsync("PB1", "SV001"));
    }
}
