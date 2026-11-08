using System.IO.Compression;
using System.Xml.Linq;
using InternshipManagement.BLL.Common;
using Xunit;

namespace InternshipManagement.UnitTests;

// Tệp Excel xuất từ backend có khối tiêu đề theo mẫu của Khoa: logo trường, đơn vị, tiêu đề, thông tin, rồi bảng dữ liệu.
public class ExcelHeadingTests
{
    private static readonly XNamespace Main = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

    private static (ZipArchive Zip, XDocument Sheet) Open(byte[] xlsx)
    {
        var zip = new ZipArchive(new MemoryStream(xlsx));
        using var stream = zip.GetEntry("xl/worksheets/sheet1.xml")!.Open();
        return (zip, XDocument.Load(stream));
    }

    private static List<string> RowTexts(XDocument sheet) => sheet.Descendants(Main + "row")
        .Select(r => string.Join("|", r.Elements(Main + "c").Select(c => c.Value).Where(v => v != ""))).ToList();

    [Fact]
    public void ExportHasLogoUnitTitleInfoThenTable()
    {
        var headers = new[] { "MSSV", "Họ tên", "Lớp", "Doanh nghiệp", "GVHD", "Kết quả" };
        var rows = new List<object?[]> { new object?[] { "2001220334", "Kim Quốc Bảo", "13DHTH07", "Công ty FPT", "Nguyễn Văn An", 8.5m } };

        var (zip, sheet) = Open(TabularExport.Xlsx(headers, rows, "Danh sách sinh viên", "Đợt thực tập: Đợt 1 (DOT01)\nTổng số sinh viên: 1", "Khoa Công nghệ thông tin"));
        using var _ = zip;

        Assert.NotNull(zip.GetEntry("xl/media/huit-logo.png"));
        Assert.NotNull(zip.GetEntry("xl/drawings/drawing1.xml"));
        Assert.NotNull(zip.GetEntry("xl/styles.xml"));
        Assert.NotNull(sheet.Descendants(Main + "drawing").SingleOrDefault());
        var texts = RowTexts(sheet);
        var title = texts.FindIndex(t => t == "DANH SÁCH SINH VIÊN");
        var header = texts.FindIndex(t => t.StartsWith("MSSV|"));
        Assert.Contains(texts.Take(4), t => t.Contains("KHOA CÔNG NGHỆ THÔNG TIN"));
        Assert.True(title > 2 && header > title, string.Join(" / ", texts));
        Assert.Contains("Đợt thực tập: Đợt 1 (DOT01)", texts[title + 1]);
        Assert.Equal("2001220334|Kim Quốc Bảo|13DHTH07|Công ty FPT|Nguyễn Văn An|8.5", texts[header + 1]);
        // Dòng tiêu đề cột được cố định khi cuộn, lọc và lặp lại khi in.
        Assert.Equal((header + 1).ToString(), (string?)sheet.Descendants(Main + "pane").Single().Attribute("ySplit"));
        Assert.StartsWith($"A{header + 1}:", (string?)sheet.Descendants(Main + "autoFilter").Single().Attribute("ref"));
        using var book = zip.GetEntry("xl/workbook.xml")!.Open();
        Assert.Contains($"${header + 1}:${header + 1}", XDocument.Load(book).Descendants(Main + "definedName").Single().Value);
    }

    [Fact]
    public void NarrowTablePutsUnitBelowTheLogoAndKeepsDataAsText()
    {
        var (zip, sheet) = Open(TabularExport.Xlsx(["MSSV"], [new object?[] { "=HYPERLINK(\"x\")" }]));
        using var _ = zip;

        var texts = RowTexts(sheet);
        Assert.Contains(texts, t => t.StartsWith(TabularExport.DonViMacDinh + " — Ngày xuất:"));
        Assert.Contains("DANH SÁCH DỮ LIỆU TRÍCH XUẤT", texts);
        Assert.Empty(sheet.Descendants(Main + "f"));
        Assert.Equal("=HYPERLINK(\"x\")", texts.Last());
    }
}
