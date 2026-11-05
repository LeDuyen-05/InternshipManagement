using System.Text.Json;
using InternshipManagement.BLL.Services.DoanhNghiep;
using InternshipManagement.BLL.Services.PhieuChamDiem;
using InternshipManagement.BLL.Services.ThongKe;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Database;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InternshipManagement.WorkflowTests;

public class StatisticsScopeTests
{
    private static AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static DotThucTap Round(string id, string type = "TTNN") => new()
    {
        MaSo = id, TenDot = id, NamHoc = "2026-2027", MaLoaiThucTap = type,
        MaRubric = type + "_V1", ThoiGianBD = new(2026, 1, 1), ThoiGianKT = new(2026, 12, 31)
    };

    [Fact]
    public async Task StatisticsSeparateArchivedReportsAndExcludeOtherOrUnknownRoundsFromLecturerLoad()
    {
        await using var db = Db();
        db.DotThucTaps.AddRange(Round("A"), Round("B"), Round("EMPTY"));
        db.SinhViens.Add(new() { MaSV = "SV", HoTen = "Sinh viên" });
        db.GiangViens.Add(new() { MaGV = "GV", HoTen = "Giảng viên", ChiTieuHD = 10 });
        db.GVHuongDans.AddRange(
            new() { MaSo = "GA", MaSinhVien = "SV", MaGiangVien = "GV", MaDot = "A" },
            new() { MaSo = "GB", MaSinhVien = "SV", MaGiangVien = "GV", MaDot = "B" },
            new() { MaSo = "LEGACY", MaSinhVien = "SV", MaGiangVien = "GV", MaDot = null });
        db.TienDoThucTaps.AddRange(
            new() { MaTienDo = "CURRENT", MaSV = "SV", MaDot = "A", TrangThaiDuyet = "DaNop" },
            new() { MaTienDo = "OLD", MaSV = "SV", MaDot = "A", TrangThaiDuyet = "DaDuyet", MaPhanBoLuuTru = "OLD_PB" },
            new() { MaTienDo = "OTHER", MaSV = "SV", MaDot = "B", TrangThaiDuyet = "ChuaNop" });
        await db.SaveChangesAsync();

        var service = new ThongKeService(new ThongKeRepository(db));
        var a = await service.GetBaoCaoThongKeAsync("A");
        Assert.Equal(1, a.TongQuan.TongBaoCaoTienDo);
        Assert.Equal(1, a.TongQuan.BaoCaoLuuTru);
        Assert.Equal(1, a.TongQuan.TienDoChoDuyet);
        Assert.Equal(0, a.TongQuan.TienDoDaDuyet);
        Assert.Equal(1, Assert.Single(a.TaiGiangVien).SoLuongHienTai);
        Assert.Equal(10d, Assert.Single(a.TaiGiangVien).TiLeTai);

        var b = await service.GetBaoCaoThongKeAsync("B");
        Assert.Equal(1, b.TongQuan.TienDoChuaNop);
        Assert.Equal(0, b.TongQuan.BaoCaoLuuTru);
        Assert.Equal(1, Assert.Single(b.TaiGiangVien).SoLuongHienTai);
        var empty = await service.GetBaoCaoThongKeAsync("EMPTY");
        Assert.Equal(0, empty.TongQuan.TongBaoCaoTienDo);
        Assert.Equal(0, empty.TongQuan.TongSinhVien);
        Assert.Equal(0, Assert.Single(empty.TaiGiangVien).SoLuongHienTai);
        Assert.Equal(3, await db.GVHuongDans.CountAsync());
        Assert.Equal(3, await db.TienDoThucTaps.CountAsync());
    }

    [Theory]
    [InlineData("TTNN")]
    [InlineData("TTKS")]
    public async Task EnterprisePrintPayloadIncludesCloAndMaximumFromTheCorrectRoundRubric(string type)
    {
        await using var db = Db();
        db.DotThucTaps.Add(Round("A", type));
        db.SinhViens.Add(new() { MaSV = "SV", HoTen = "Sinh viên" });
        db.CongTys.Add(new() { MaCongTy = "CT", TenCongTy = "Doanh nghiệp" });
        db.PhanBoThucTaps.Add(new() { MaPhanBo = "PB", MaDot = "A", MaSinhVien = "SV", MaCongTy = "CT", TrangThai = "DangThucTap" });
        var criteria = InternshipCatalogMigration.Criteria(type);
        db.TieuChis.AddRange(criteria);
        var enterprise = criteria.Where(x => x.NhomDanhGia == "DN").ToList();
        db.PhieuChamDiems.Add(new()
        {
            MaPhieu = "P", MaDot = "A", MaSV = "SV",
            ChiTietChamDiems = enterprise.Select((c, index) => new ChiTietChamDiem
            { MaSo = "S" + index, MaTieuChi = c.MaTieuChi, DiemCham = c.MaCLO == "CLO4.1" ? 0 : c.DiemToiDa }).ToList()
        });
        await db.SaveChangesAsync();

        var service = new DoanhNghiepService(db, Mock.Of<IPhieuChamDiemService>());
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(await service.GetThucTapSinhAsync("CT", "CT", "A")));
        var row = Assert.Single(json.RootElement.EnumerateArray());
        Assert.Equal(type, row.GetProperty("MaLoaiThucTap").GetString());
        Assert.Equal(type + "_V1", row.GetProperty("MaRubric").GetString());
        var scores = row.GetProperty("ChiTietDiemDN").EnumerateArray().ToList();
        Assert.Equal(2, scores.Count);
        foreach (var criterion in enterprise)
        {
            var detail = scores.Single(x => x.GetProperty("MaCLO").GetString() == criterion.MaCLO);
            Assert.Equal(criterion.MaTieuChi, detail.GetProperty("MaTieuChi").GetString());
            Assert.Equal(criterion.DiemToiDa, detail.GetProperty("DiemToiDa").GetDecimal());
        }
        Assert.Equal(0m, scores.Single(x => x.GetProperty("MaCLO").GetString() == "CLO4.1").GetProperty("DiemCham").GetDecimal());
    }
}
