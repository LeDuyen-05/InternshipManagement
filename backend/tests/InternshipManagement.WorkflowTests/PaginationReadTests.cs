using InternshipManagement.BLL.Services.SinhVienTheoDot;
using InternshipManagement.BLL.Services.ThongKe;
using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternshipManagement.WorkflowTests;

public class PaginationReadTests
{
    [Fact]
    public void TrackingFiltersSummaryAndPageTranslateToSqlServer()
    {
        using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlServer("Server=unused;Database=TranslationOnly;Integrated Security=True;TrustServerCertificate=True").Options);
        var filter = new UngTuyenHoTroQuery("D", Search: "Tên", Lop: "L1", KetQua: "KhongDat", TinhTrangNoi: "ChuaCoNoi", CanHoTro: true);
        var rows = UngTuyenReadQuery.Build(db, new SinhVienTheoDotService(db).StudentIds("D"), filter);
        var page = rows.OrderBy(x => x.MaSV).Skip(20).Take(20).ToQueryString();
        var summaryKeys = rows.Where(x => x.ChoKetQua > 0 && x.CanHoTro).Select(x => x.MaSV).ToQueryString();
        Assert.Contains("OFFSET", page); Assert.Contains("FETCH NEXT", page); Assert.Contains("COUNT", summaryKeys);
    }

    [Fact]
    public void CurrentAndArchivedFailedResultsFilterAndPageInsideSql()
    {
        using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlServer("Server=unused;Database=TranslationOnly;Integrated Security=True;TrustServerCertificate=True").Options);
        var rows = FailedResultQuery.Build(db, ["LIVE"], ["ARCHIVE"], DateTimeOffset.UtcNow,
            new(Search: "Tên", NamHoc: "2029", MaLoaiThucTap: "TTKS", NguyenNhan: "RotDiem"));
        var sql = rows.OrderBy(x => x.MaDot).ThenBy(x => x.MaSV).Skip(20).Take(20).ToQueryString();
        Assert.Contains("OFFSET", sql); Assert.Contains("FETCH NEXT", sql); Assert.Contains("OPENJSON", sql);
    }
}
