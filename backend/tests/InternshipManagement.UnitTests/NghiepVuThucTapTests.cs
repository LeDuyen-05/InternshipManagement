using InternshipManagement.BLL.Common;
using InternshipManagement.BLL.DTOs.DoanhNghiep;
using InternshipManagement.BLL.DTOs.PhieuChamDiem;
using InternshipManagement.BLL.Services.DoanhNghiep;
using InternshipManagement.BLL.Services.GVHuongDan;
using InternshipManagement.BLL.Services.PhieuChamDiem;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InternshipManagement.UnitTests;

/// <summary>Các quy tắc nghiệp vụ theo góp ý GVHD: chấm điểm 2 phần, tự đóng tuyển, ưu tiên GV giới thiệu.</summary>
public class NghiepVuThucTapTests
{
    private static List<TieuChi> BoTieuChi() => new()
    {
        new() { MaTieuChi = "CLO1.1", TenTieuChi = "Mục tiêu", DiemToiDa = 0.75m, NhomDanhGia = "GV", ThuTu = 1 },
        new() { MaTieuChi = "CLO3.4", TenTieuChi = "Trả lời câu hỏi", DiemToiDa = 0.5m, NhomDanhGia = "GV", ThuTu = 2 },
        new() { MaTieuChi = "CLO4.1", TenTieuChi = "Ý thức, kỷ luật", DiemToiDa = 2m, NhomDanhGia = "DN", ThuTu = 3 },
        new() { MaTieuChi = "CLO4.2", TenTieuChi = "Vận dụng kiến thức", DiemToiDa = 3m, NhomDanhGia = "DN", ThuTu = 4 },
    };

    // ------------------------------------------------------------ Thang điểm

    [Theory]
    [InlineData(8.45, "A")]   // làm tròn 1 chữ số → 8.5
    [InlineData(8.0, "B+")]
    [InlineData(5.2, "D+")]
    [InlineData(3.9, "F")]
    public void QuyDoi_DiemChuTheoThang10(double diem, string chu)
    {
        Assert.Equal(chu, ThangDiem.QuyDoi((decimal)diem).DiemChu);
    }

    // ------------------------------------------------------------ Chấm điểm 2 phần

    [Fact]
    public async Task GiangVienCham_KhongXoaDiemDoanhNghiep_VaTongDiemGopCaHaiPhan()
    {
        var repo = new Mock<IPhieuChamDiemRepository>();
        repo.Setup(r => r.GetDanhSachTieuChiAsync()).ReturnsAsync(BoTieuChi());
        repo.Setup(r => r.GetDotThucTapAsync("DOT02")).ReturnsAsync(new DotThucTap { MaSo = "DOT02", TrangThai = "DangDienRa" });
        repo.Setup(r => r.GetActiveAssignmentAsync("SV001")).ReturnsAsync(new GVHuongDan { MaSo = "PC1", MaGiangVien = "GV001", MaSinhVien = "SV001" });

        var existing = new PhieuChamDiem
        {
            MaPhieu = "P1", MaSV = "SV001", MaDot = "DOT02", MaDaiDien = "DD001",
            ChiTietChamDiems = new List<ChiTietChamDiem>
            {
                new() { MaSo = "C1", MaTieuChi = "CLO4.1", DiemCham = 1.8m },
                new() { MaSo = "C2", MaTieuChi = "CLO4.2", DiemCham = 2.7m },
            }
        };
        repo.Setup(r => r.GetPhieuChamBySinhVienAndDotAsync("SV001", "DOT02")).ReturnsAsync(existing);
        PhieuChamDiem? saved = null;
        List<ChiTietChamDiem>? savedDetails = null;
        repo.Setup(r => r.LuuPhieuChamDiemAsync(It.IsAny<PhieuChamDiem>(), It.IsAny<IEnumerable<ChiTietChamDiem>>()))
            .Callback<PhieuChamDiem, IEnumerable<ChiTietChamDiem>>((p, c) => { saved = p; savedDetails = c.ToList(); })
            .ReturnsAsync((PhieuChamDiem p, IEnumerable<ChiTietChamDiem> _) => p);

        var service = new PhieuChamDiemService(repo.Object);
        await service.LuuPhieuChamDiemAsync(new LuuPhieuChamRequest("SV001", "DOT02", null, null, new()
        {
            new("CLO1.1", 0.7m), new("CLO3.4", 0.5m),
            new("CLO4.1", 1.8m), new("CLO4.2", 2.7m) // gửi lại đúng điểm DN → được bỏ qua
        }, "Tốt"), "GV001");

        Assert.Equal(5.7m, saved!.TongDiem);
        Assert.Equal(new[] { "CLO1.1", "CLO3.4" }, savedDetails!.Select(c => c.MaTieuChi));
        Assert.Equal("Tốt", saved.NhanXetGV);
    }

    [Fact]
    public async Task GiangVien_KhongDuocSuaDiemDoanhNghiepDaChamTrenHeThong()
    {
        var repo = new Mock<IPhieuChamDiemRepository>();
        repo.Setup(r => r.GetDanhSachTieuChiAsync()).ReturnsAsync(BoTieuChi());
        repo.Setup(r => r.GetDotThucTapAsync("DOT02")).ReturnsAsync(new DotThucTap { MaSo = "DOT02", TrangThai = "DangDienRa" });
        repo.Setup(r => r.GetActiveAssignmentAsync("SV001")).ReturnsAsync(new GVHuongDan { MaSo = "PC1", MaGiangVien = "GV001", MaSinhVien = "SV001" });
        repo.Setup(r => r.GetPhieuChamBySinhVienAndDotAsync("SV001", "DOT02")).ReturnsAsync(new PhieuChamDiem
        {
            MaPhieu = "P1", MaSV = "SV001", MaDot = "DOT02", MaDaiDien = "DD001",
            ChiTietChamDiems = new List<ChiTietChamDiem> { new() { MaTieuChi = "CLO4.1", DiemCham = 1.0m } }
        });

        var service = new PhieuChamDiemService(repo.Object);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.LuuPhieuChamDiemAsync(
            new LuuPhieuChamRequest("SV001", "DOT02", null, null, new() { new("CLO4.1", 2.0m) }), "GV001"));
    }

    [Fact]
    public async Task DoanhNghiep_ChiChamTieuChiPhieuNhanXet_VaPhaiDuTieuChi()
    {
        var repo = new Mock<IPhieuChamDiemRepository>();
        repo.Setup(r => r.GetDanhSachTieuChiAsync()).ReturnsAsync(BoTieuChi());
        repo.Setup(r => r.GetDotThucTapAsync("DOT02")).ReturnsAsync(new DotThucTap { MaSo = "DOT02", TrangThai = "DangDienRa" });
        var service = new PhieuChamDiemService(repo.Object);

        await Assert.ThrowsAsync<ArgumentException>(() => service.LuuDiemDoanhNghiepAsync(
            "SV001", "DOT02", "DD001", new List<ChiTietDiemInput> { new("CLO1.1", 0.5m), new("CLO4.1", 1m), new("CLO4.2", 2m) }, null));
        await Assert.ThrowsAsync<ArgumentException>(() => service.LuuDiemDoanhNghiepAsync(
            "SV001", "DOT02", "DD001", new List<ChiTietDiemInput> { new("CLO4.1", 1m) }, null));
    }

    // ------------------------------------------------------------ Phân công tự động

    [Fact]
    public async Task PhanCongTuDong_UuTienGiangVienGioiThieuDoanhNghiep()
    {
        var repo = new Mock<IGVHuongDanRepository>();
        var congTy = new CongTy { MaCongTy = "CT001", TenCongTy = "FPT" };
        var sv = new SinhVien
        {
            MaSV = "SV016", HoTen = "A", ChuyenNganh = "Công nghệ thông tin", CongNghe = "React, Node.js",
            PhanBoThucTaps = new List<PhanBoThucTap> { new() { MaCongTy = "CT001", CongTy = congTy, TrangThai = "DangThucTap" } }
        };
        repo.Setup(r => r.GetDanhSachSVChuaPhanCongAsync(null)).ReturnsAsync(new List<SinhVien> { sv });
        repo.Setup(r => r.GetDanhSachGiangVienKemTaiAsync()).ReturnsAsync(new List<GiangVien>
        {
            new() { MaGV = "GV010", HoTen = "Web Cloud", ChuyenMon = "Phát triển ứng dụng Web", ChiTieuHD = 10 },
            new() { MaGV = "GV002", HoTen = "HTTT", ChuyenMon = "Hệ thống thông tin", ChiTieuHD = 2 },
        });
        repo.Setup(r => r.GetGioiThieuDaDuyetAsync()).ReturnsAsync(new List<GioiThieu>
        {
            new() { MaGV = "GV002", MaCongTy = "CT001", TrangThaiKetNoi = "DaDuyet" }
        });

        var result = await new GVHuongDanService(repo.Object).DeXuatPhanCongTuDongAsync();

        var item = Assert.Single(result.DanhSachDeXuat);
        Assert.Equal("GV002", item.MaGV);
        Assert.Equal(1, item.MucUuTien);
    }

    [Fact]
    public async Task PhanCongTuDong_KhiGVGioiThieuHetChiTieu_ChuyenSangPhuHopChuyenMon()
    {
        var repo = new Mock<IGVHuongDanRepository>();
        var sv = new SinhVien
        {
            MaSV = "SV016", HoTen = "A", CongNghe = "React, Node.js",
            PhanBoThucTaps = new List<PhanBoThucTap> { new() { MaCongTy = "CT001", CongTy = new CongTy { MaCongTy = "CT001", TenCongTy = "FPT" } } }
        };
        repo.Setup(r => r.GetDanhSachSVChuaPhanCongAsync(null)).ReturnsAsync(new List<SinhVien> { sv });
        repo.Setup(r => r.GetDanhSachGiangVienKemTaiAsync()).ReturnsAsync(new List<GiangVien>
        {
            new() { MaGV = "GV010", HoTen = "Web", ChuyenMon = "Phát triển ứng dụng Web", ChiTieuHD = 10 },
            new() { MaGV = "GV002", HoTen = "HTTT", ChuyenMon = "Hệ thống thông tin", ChiTieuHD = 1,
                    GVHuongDans = new List<GVHuongDan> { new() { TrangThai = "DangHuongDan" } } },
        });
        repo.Setup(r => r.GetGioiThieuDaDuyetAsync()).ReturnsAsync(new List<GioiThieu>
        {
            new() { MaGV = "GV002", MaCongTy = "CT001", TrangThaiKetNoi = "DaDuyet" }
        });

        var result = await new GVHuongDanService(repo.Object).DeXuatPhanCongTuDongAsync();

        var item = Assert.Single(result.DanhSachDeXuat);
        Assert.Equal("GV010", item.MaGV);
        Assert.Equal(2, item.MucUuTien);
    }

    // ------------------------------------------------------------ Tự đóng tuyển khi đủ chỉ tiêu

    private static AppDbContext TaoDb()
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.DotThucTaps.Add(new DotThucTap { MaSo = "DOT02", TenDot = "Đợt 2", NamHoc = "2026-2027", ThoiGianBD = DateTime.Today.AddDays(-30), ThoiGianKT = DateTime.Today.AddDays(60), TrangThai = "DangDienRa" });
        db.CongTys.Add(new CongTy { MaCongTy = "CT001", TenCongTy = "FPT", SoLuongNhan = 1, TrangThai = "DaDuyet" });
        db.CongTys.Add(new CongTy { MaCongTy = "CT002", TenCongTy = "VNG", SoLuongNhan = 3, TrangThai = "DaDuyet" });
        db.DaiDienDoanhNghieps.Add(new DaiDienDoanhNghiep { MaSo = "DD001", HoTen = "Long", MaCongTy = "CT001" });
        foreach (var ma in new[] { "SV001", "SV002" })
            db.SinhViens.Add(new SinhVien { MaSV = ma, HoTen = ma });
        db.DangKyThucTaps.AddRange(
            new DangKyThucTap { MaDK = "DK1", MaSV = "SV001", MaCongTy = "CT001", MaDot = "DOT02", ThuTuUuTien = 1, TrangThai = "ChoDuyet", NgayDangKy = DateTime.Today },
            new DangKyThucTap { MaDK = "DK2", MaSV = "SV001", MaCongTy = "CT002", MaDot = "DOT02", ThuTuUuTien = 2, TrangThai = "ChoDuyet", NgayDangKy = DateTime.Today },
            new DangKyThucTap { MaDK = "DK3", MaSV = "SV002", MaCongTy = "CT001", MaDot = "DOT02", ThuTuUuTien = 1, TrangThai = "ChoDuyet", NgayDangKy = DateTime.Today });
        db.PhongVans.Add(new PhongVan { MaPV = "PV1", MaSinhVien = "SV001", MaDaiDien = "DD001", NgayPV = DateTime.Today, KetQua = "ChuaCoKetQua" });
        db.SaveChanges();
        return db;
    }

    [Fact]
    public async Task PhongVanDat_TaoTiepNhan_VaTuDongDongTuyenKhiDuChiTieu()
    {
        await using var db = TaoDb();
        var service = new DoanhNghiepService(db, new Mock<IPhieuChamDiemService>().Object);

        var kq = await service.CapNhatKetQuaPhongVanAsync("PV1", "Dat", phamViCongTy: "CT001");

        Assert.True(kq.DaDongTuyen);
        var pb = Assert.Single(db.PhanBoThucTaps);
        Assert.Equal(("SV001", "CT001", "DOT02", "ChuaNhanViec"), (pb.MaSinhVien, pb.MaCongTy, pb.MaDot, pb.TrangThai));
        Assert.Equal("DaDuyet", db.DangKyThucTaps.Single(d => d.MaDK == "DK1").TrangThai);
        Assert.Equal("TuChoi", db.DangKyThucTaps.Single(d => d.MaDK == "DK2").TrangThai); // NV khác của SV001
        Assert.Equal("TuChoi", db.DangKyThucTaps.Single(d => d.MaDK == "DK3").TrangThai); // tự đóng tuyển

        var chiTieu = await service.GetChiTieuAsync(db.CongTys.Single(c => c.MaCongTy == "CT001"));
        Assert.Equal("DaDuChiTieu", chiTieu.TrangThaiTuyen);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.TaoPhongVanAsync(
            new TaoPhongVanRequest { MaSinhVien = "SV002", MaDaiDien = "DD001" }, "CT001"));
    }

    [Fact]
    public async Task DatRoiKhongDat_HuyTiepNhan_RoiDatLaiDuoc()
    {
        await using var db = TaoDb();
        var service = new DoanhNghiepService(db, new Mock<IPhieuChamDiemService>().Object);

        await service.CapNhatKetQuaPhongVanAsync("PV1", "Dat", "CT001");
        db.PhanBoThucTaps.Single().TrangThai = "DangThucTap"; // SV đã bắt đầu thực tập
        await db.SaveChangesAsync();

        var huy = await service.CapNhatKetQuaPhongVanAsync("PV1", "KhongDat", "CT001");
        Assert.True(huy.ThanhCong);
        Assert.Equal("Huy", db.PhanBoThucTaps.Single().TrangThai);
        Assert.Equal("TuChoi", db.DangKyThucTaps.Single(d => d.MaDK == "DK1").TrangThai);

        var datLai = await service.CapNhatKetQuaPhongVanAsync("PV1", "Dat", "CT001");
        Assert.True(datLai.ThanhCong);
        Assert.Single(db.PhanBoThucTaps, p => p.TrangThai != "Huy");
    }

    [Fact]
    public async Task KhongDat_KhiSVDaCoDiem_TraVeLoiKhongNemException()
    {
        await using var db = TaoDb();
        var service = new DoanhNghiepService(db, new Mock<IPhieuChamDiemService>().Object);
        await service.CapNhatKetQuaPhongVanAsync("PV1", "Dat", "CT001");
        db.PhieuChamDiems.Add(new PhieuChamDiem
        {
            MaPhieu = "P1", MaSV = "SV001", MaDot = "DOT02",
            ChiTietChamDiems = new List<ChiTietChamDiem> { new() { MaSo = "C1", MaTieuChi = "CLO4.1", DiemCham = 1 } }
        });
        await db.SaveChangesAsync();

        var kq = await service.CapNhatKetQuaPhongVanAsync("PV1", "KhongDat", "CT001");

        Assert.False(kq.ThanhCong);
        Assert.Equal("Dat", db.PhongVans.Single().KetQua);
        Assert.Equal("ChuaNhanViec", db.PhanBoThucTaps.Single().TrangThai);
    }

    [Fact]
    public async Task DaiDienDoanhNghiep_KhongDuocThaoTacCongTyKhac()
    {
        await using var db = TaoDb();
        var service = new DoanhNghiepService(db, new Mock<IPhieuChamDiemService>().Object);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.CapNhatKetQuaPhongVanAsync("PV1", "Dat", phamViCongTy: "CT002"));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.GetUngVienAsync("CT001", phamViCongTy: "CT002"));
    }

    [Fact]
    public async Task TaoPhongVan_KetQuaBanDauHopLeVoiRangBuocCSDL()
    {
        await using var db = TaoDb();
        var service = new DoanhNghiepService(db, new Mock<IPhieuChamDiemService>().Object);

        await service.TaoPhongVanAsync(new TaoPhongVanRequest { MaSinhVien = "SV002", MaDaiDien = "DD001" }, "CT001");

        Assert.Contains(db.PhongVans, p => p.MaSinhVien == "SV002" && p.KetQua == "ChuaCoKetQua");
    }
}
