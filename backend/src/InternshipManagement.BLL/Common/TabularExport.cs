using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Xml;

namespace InternshipManagement.BLL.Common;

/// <summary>Small value-only workbook export: no formulas, external links or macros.</summary>
public static class TabularExport
{
    // Ô CSV an toàn khi mở bằng Excel: chữ bắt đầu bằng = + - @ tab hoặc CR được thêm ' để không chạy như công thức.
    public static string CsvCell(object? value)
    {
        var text = Convert.ToString(value, CultureInfo.InvariantCulture) ?? "";
        if (IsFormulaStart(text)) text = "'" + text;
        return "\"" + text.Replace("\"", "\"\"") + "\"";
    }

    // Bỏ dấu ' do CsvCell thêm khi nhập lại tệp đã xuất.
    public static string FromCsvCell(string text) => text.Length > 1 && text[0] == '\'' && IsFormulaStart(text[1..]) ? text[1..] : text;

    private static bool IsFormulaStart(string text) => text.TrimStart().FirstOrDefault() is '=' or '+' or '-' or '@' or '\t' or '\r';

    public static byte[] Csv(IReadOnlyList<string> headers, IReadOnlyList<object?[]> rows)
    {
        var lines = new[] { string.Join(',', headers.Select(CsvCell)) }.Concat(rows.Select(r => string.Join(',', r.Select(CsvCell))));
        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(string.Join("\r\n", lines) + "\r\n")).ToArray();
    }

    public const string TenTruong = "TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP. HỒ CHÍ MINH";
    public const string DonViMacDinh = "HỆ THỐNG QUẢN LÝ THỰC TẬP";
    private const string LogoResource = "InternshipManagement.BLL.Assets.huit-logo.png";
    private const int LogoWidthPx = 300, LogoHeightPx = 62, EmuPerPx = 9525;
    private static readonly Lazy<byte[]?> Logo = new(() =>
    {
        using var stream = typeof(TabularExport).Assembly.GetManifestResourceStream(LogoResource);
        if (stream == null) return null;
        using var copy = new MemoryStream(); stream.CopyTo(copy); return copy.ToArray();
    });

    // Kiểu ô trong styles.xml (chỉ số cellXfs).
    private const int SData = 1, SHeader = 2, STitle = 3, SInfo = 4, SUnit = 5, SDate = 6, SNumber = 7, SSchool = 8;

    /// <summary>
    /// Bảng tính theo mẫu tiêu đề của Khoa: logo trường, đơn vị và ngày xuất, tiêu đề in hoa, các dòng thông tin
    /// (mỗi dòng của <paramref name="subtitle"/>), rồi bảng dữ liệu có viền, tiêu đề cột lặp lại khi in.
    /// </summary>
    public static byte[] Xlsx(IReadOnlyList<string> headers, IReadOnlyList<object?[]> rows, string? title = null, string? subtitle = null,
        string? unit = null, string sheetName = "DanhSach")
    {
        const string main = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        const string rel = "http://schemas.openxmlformats.org/package/2006/relationships";
        const string officeRel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
        var columnCount = Math.Max(1, headers.Count);
        var widths = ColumnWidths(headers, rows, columnCount);
        var logo = Logo.Value;
        var unitText = (string.IsNullOrWhiteSpace(unit) ? DonViMacDinh : unit.Trim()).ToUpper(CultureInfo.GetCultureInfo("vi-VN"));
        var exportedAt = $"Ngày xuất: {DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(7)):dd/MM/yyyy HH:mm}";
        var titleText = (string.IsNullOrWhiteSpace(title) ? "DANH SÁCH DỮ LIỆU TRÍCH XUẤT" : title.Trim()).ToUpper(CultureInfo.GetCultureInfo("vi-VN"));
        var infoLines = (subtitle ?? "").Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        // Khối đơn vị đặt bên phải logo nếu còn đủ chỗ, nếu không thì xuống dòng dưới logo.
        var logoColumns = 0; double covered = 0;
        while (logoColumns < columnCount && covered * 7 < LogoWidthPx + 12) covered += widths[logoColumns++];
        var rightStart = logoColumns + 1;
        var rightBlock = rightStart <= columnCount && widths.Skip(logoColumns).Sum() >= 26;

        using var output = new MemoryStream();
        using (var zip = new ZipArchive(output, ZipArchiveMode.Create, true))
        {
            void Entry(string path, Action<XmlWriter> body)
            {
                using var stream = zip.CreateEntry(path, CompressionLevel.Fastest).Open();
                using var writer = XmlWriter.Create(stream, new XmlWriterSettings { Encoding = new UTF8Encoding(false), CloseOutput = false });
                writer.WriteStartDocument(); body(writer); writer.WriteEndDocument();
            }
            void Relationship(XmlWriter w, string id, string type, string target)
            { w.WriteStartElement("Relationship", rel); w.WriteAttributeString("Id", id); w.WriteAttributeString("Type", officeRel + "/" + type); w.WriteAttributeString("Target", target); w.WriteEndElement(); }

            Entry("[Content_Types].xml", w =>
            {
                const string ns = "http://schemas.openxmlformats.org/package/2006/content-types";
                w.WriteStartElement("Types", ns);
                foreach (var (extension, type) in new[] { ("rels", "application/vnd.openxmlformats-package.relationships+xml"), ("xml", "application/xml"), ("png", "image/png") })
                { w.WriteStartElement("Default", ns); w.WriteAttributeString("Extension", extension); w.WriteAttributeString("ContentType", type); w.WriteEndElement(); }
                var parts = new List<(string, string)>
                {
                    ("/xl/workbook.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"),
                    ("/xl/worksheets/sheet1.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"),
                    ("/xl/styles.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"),
                };
                if (logo != null) parts.Add(("/xl/drawings/drawing1.xml", "application/vnd.openxmlformats-officedocument.drawing+xml"));
                foreach (var (path, type) in parts)
                { w.WriteStartElement("Override", ns); w.WriteAttributeString("PartName", path); w.WriteAttributeString("ContentType", type); w.WriteEndElement(); }
                w.WriteEndElement();
            });
            Entry("_rels/.rels", w => { w.WriteStartElement("Relationships", rel); Relationship(w, "rId1", "officeDocument", "xl/workbook.xml"); w.WriteEndElement(); });
            Entry("xl/_rels/workbook.xml.rels", w =>
            {
                w.WriteStartElement("Relationships", rel);
                Relationship(w, "rId1", "worksheet", "worksheets/sheet1.xml");
                Relationship(w, "rId2", "styles", "styles.xml");
                w.WriteEndElement();
            });
            Entry("xl/styles.xml", w => WriteStyles(w, main));

            var row = 0;
            var headerRow = 0;
            var merges = new List<string>();
            Entry("xl/worksheets/sheet1.xml", w =>
            {
                w.WriteStartElement("worksheet", main);
                w.WriteStartElement("sheetPr", main); w.WriteStartElement("pageSetUpPr", main); w.WriteAttributeString("fitToPage", "1"); w.WriteEndElement(); w.WriteEndElement();
                // Vị trí dòng tiêu đề cột cần biết trước để cố định khung nhìn.
                headerRow = 4 + (rightBlock ? 0 : 1) + 1 + infoLines.Length + 1 + 1;
                w.WriteStartElement("sheetViews", main); w.WriteStartElement("sheetView", main); w.WriteAttributeString("workbookViewId", "0");
                w.WriteStartElement("pane", main);
                w.WriteAttributeString("ySplit", headerRow.ToString(CultureInfo.InvariantCulture));
                w.WriteAttributeString("topLeftCell", "A" + (headerRow + 1));
                w.WriteAttributeString("activePane", "bottomLeft");
                w.WriteAttributeString("state", "frozen");
                w.WriteEndElement(); w.WriteEndElement(); w.WriteEndElement();
                w.WriteStartElement("cols", main);
                for (var i = 0; i < columnCount; i++)
                {
                    w.WriteStartElement("col", main);
                    w.WriteAttributeString("min", (i + 1).ToString(CultureInfo.InvariantCulture)); w.WriteAttributeString("max", (i + 1).ToString(CultureInfo.InvariantCulture));
                    w.WriteAttributeString("width", widths[i].ToString("0.##", CultureInfo.InvariantCulture)); w.WriteAttributeString("customWidth", "1");
                    w.WriteEndElement();
                }
                w.WriteEndElement();
                w.WriteStartElement("sheetData", main);

                void StartRow(double? height = null)
                {
                    row++;
                    w.WriteStartElement("row", main); w.WriteAttributeString("r", row.ToString(CultureInfo.InvariantCulture));
                    if (height != null) { w.WriteAttributeString("ht", height.Value.ToString("0.##", CultureInfo.InvariantCulture)); w.WriteAttributeString("customHeight", "1"); }
                }
                void WriteCell(int column, object? val, int style)
                {
                    w.WriteStartElement("c", main); w.WriteAttributeString("r", Column(column) + row); w.WriteAttributeString("s", style.ToString(CultureInfo.InvariantCulture));
                    if (val is decimal or int or long or double)
                        w.WriteElementString("v", main, Convert.ToString(val, CultureInfo.InvariantCulture));
                    else if (val != null)
                    {
                        w.WriteAttributeString("t", "inlineStr");
                        w.WriteStartElement("is", main); w.WriteStartElement("t", main);
                        w.WriteAttributeString("xml", "space", "http://www.w3.org/XML/1998/namespace", "preserve");
                        w.WriteString(Convert.ToString(val, CultureInfo.InvariantCulture) ?? "");
                        w.WriteEndElement(); w.WriteEndElement();
                    }
                    w.WriteEndElement();
                }
                void Merged(int from, int to, object? val, int style)
                {
                    WriteCell(from, val, style);
                    for (var c = from + 1; c <= to; c++) WriteCell(c, null, style);
                    if (to > from) merges.Add($"{Column(from)}{row}:{Column(to)}{row}");
                }

                // Dòng 1–3: logo trường (hoặc tên trường nếu thiếu ảnh), bên phải là đơn vị và ngày xuất.
                for (var i = 0; i < 3; i++)
                {
                    StartRow(18);
                    if (logo == null && i == 0) Merged(1, rightBlock ? logoColumns : columnCount, TenTruong, SSchool);
                    if (rightBlock && i == 0) Merged(rightStart, columnCount, unitText, SUnit);
                    if (rightBlock && i == 1) Merged(rightStart, columnCount, exportedAt, SDate);
                    w.WriteEndElement();
                }
                if (!rightBlock)
                {
                    StartRow(18); Merged(1, columnCount, $"{unitText} — {exportedAt}", SUnit); w.WriteEndElement();
                }
                StartRow(8); w.WriteEndElement();
                StartRow(EstimateHeight(titleText, widths.Sum(), 1.7, 26)); Merged(1, columnCount, titleText, STitle); w.WriteEndElement();
                foreach (var line in infoLines)
                {
                    StartRow(EstimateHeight(line, widths.Sum(), 1.1, 18)); Merged(1, columnCount, line, SInfo); w.WriteEndElement();
                }
                StartRow(8); w.WriteEndElement();

                StartRow(30);
                for (var c = 0; c < columnCount; c++) WriteCell(c + 1, c < headers.Count ? headers[c] : "", SHeader);
                w.WriteEndElement();
                foreach (var data in rows)
                {
                    StartRow();
                    for (var c = 0; c < data.Length; c++) WriteCell(c + 1, data[c], data[c] is decimal or int or long or double ? SNumber : SData);
                    w.WriteEndElement();
                }
                w.WriteEndElement();

                w.WriteStartElement("autoFilter", main);
                w.WriteAttributeString("ref", $"A{headerRow}:{Column(columnCount)}{Math.Max(row, headerRow)}");
                w.WriteEndElement();
                if (merges.Count > 0)
                {
                    w.WriteStartElement("mergeCells", main); w.WriteAttributeString("count", merges.Count.ToString(CultureInfo.InvariantCulture));
                    foreach (var range in merges) { w.WriteStartElement("mergeCell", main); w.WriteAttributeString("ref", range); w.WriteEndElement(); }
                    w.WriteEndElement();
                }
                w.WriteStartElement("pageMargins", main);
                foreach (var (name, value) in new[] { ("left", "0.3"), ("right", "0.3"), ("top", "0.4"), ("bottom", "0.5"), ("header", "0.2"), ("footer", "0.2") })
                    w.WriteAttributeString(name, value);
                w.WriteEndElement();
                w.WriteStartElement("pageSetup", main);
                w.WriteAttributeString("paperSize", "9");
                w.WriteAttributeString("orientation", columnCount > 6 ? "landscape" : "portrait");
                w.WriteAttributeString("fitToWidth", "1"); w.WriteAttributeString("fitToHeight", "0");
                w.WriteEndElement();
                w.WriteStartElement("headerFooter", main); w.WriteElementString("oddFooter", main, "&LTrang &P / &N&R" + TenTruong); w.WriteEndElement();
                if (logo != null) { w.WriteStartElement("drawing", main); w.WriteAttributeString("r", "id", officeRel, "rId1"); w.WriteEndElement(); }
                w.WriteEndElement();
            });

            Entry("xl/workbook.xml", w =>
            {
                w.WriteStartElement("workbook", main);
                w.WriteStartElement("sheets", main); w.WriteStartElement("sheet", main);
                w.WriteAttributeString("name", SafeSheetName(sheetName)); w.WriteAttributeString("sheetId", "1"); w.WriteAttributeString("r", "id", officeRel, "rId1");
                w.WriteEndElement(); w.WriteEndElement();
                // Lặp lại dòng tiêu đề cột ở mỗi trang in.
                w.WriteStartElement("definedNames", main); w.WriteStartElement("definedName", main);
                w.WriteAttributeString("name", "_xlnm.Print_Titles"); w.WriteAttributeString("localSheetId", "0");
                w.WriteString($"'{SafeSheetName(sheetName)}'!${headerRow}:${headerRow}");
                w.WriteEndElement(); w.WriteEndElement();
                w.WriteEndElement();
            });

            if (logo != null)
            {
                Entry("xl/worksheets/_rels/sheet1.xml.rels", w => { w.WriteStartElement("Relationships", rel); Relationship(w, "rId1", "drawing", "../drawings/drawing1.xml"); w.WriteEndElement(); });
                Entry("xl/drawings/_rels/drawing1.xml.rels", w => { w.WriteStartElement("Relationships", rel); Relationship(w, "rId1", "image", "../media/huit-logo.png"); w.WriteEndElement(); });
                Entry("xl/drawings/drawing1.xml", WriteLogoDrawing);
                using var image = zip.CreateEntry("xl/media/huit-logo.png", CompressionLevel.NoCompression).Open();
                image.Write(logo);
            }
        }
        return output.ToArray();
    }

    private static void WriteLogoDrawing(XmlWriter w)
    {
        const string xdr = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing";
        const string a = "http://schemas.openxmlformats.org/drawingml/2006/main";
        const string r = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
        var cx = (LogoWidthPx * EmuPerPx).ToString(CultureInfo.InvariantCulture);
        var cy = (LogoHeightPx * EmuPerPx).ToString(CultureInfo.InvariantCulture);
        w.WriteStartElement("xdr", "wsDr", xdr);
        w.WriteAttributeString("xmlns", "a", null, a);
        w.WriteAttributeString("xmlns", "r", null, r);
        w.WriteStartElement("xdr", "oneCellAnchor", xdr);
        w.WriteStartElement("xdr", "from", xdr);
        foreach (var (name, value) in new[] { ("col", "0"), ("colOff", "38100"), ("row", "0"), ("rowOff", "38100") }) w.WriteElementString("xdr", name, xdr, value);
        w.WriteEndElement();
        w.WriteStartElement("xdr", "ext", xdr); w.WriteAttributeString("cx", cx); w.WriteAttributeString("cy", cy); w.WriteEndElement();
        w.WriteStartElement("xdr", "pic", xdr);
        w.WriteStartElement("xdr", "nvPicPr", xdr);
        w.WriteStartElement("xdr", "cNvPr", xdr); w.WriteAttributeString("id", "2"); w.WriteAttributeString("name", "Logo HUIT"); w.WriteAttributeString("descr", TenTruong); w.WriteEndElement();
        w.WriteStartElement("xdr", "cNvPicPr", xdr); w.WriteStartElement("a", "picLocks", a); w.WriteAttributeString("noChangeAspect", "1"); w.WriteEndElement(); w.WriteEndElement();
        w.WriteEndElement();
        w.WriteStartElement("xdr", "blipFill", xdr);
        w.WriteStartElement("a", "blip", a); w.WriteAttributeString("r", "embed", r, "rId1"); w.WriteEndElement();
        w.WriteStartElement("a", "stretch", a); w.WriteStartElement("a", "fillRect", a); w.WriteEndElement(); w.WriteEndElement();
        w.WriteEndElement();
        w.WriteStartElement("xdr", "spPr", xdr);
        w.WriteStartElement("a", "xfrm", a);
        w.WriteStartElement("a", "off", a); w.WriteAttributeString("x", "0"); w.WriteAttributeString("y", "0"); w.WriteEndElement();
        w.WriteStartElement("a", "ext", a); w.WriteAttributeString("cx", cx); w.WriteAttributeString("cy", cy); w.WriteEndElement();
        w.WriteEndElement();
        w.WriteStartElement("a", "prstGeom", a); w.WriteAttributeString("prst", "rect"); w.WriteStartElement("a", "avLst", a); w.WriteEndElement(); w.WriteEndElement();
        w.WriteEndElement();
        w.WriteEndElement();
        w.WriteStartElement("xdr", "clientData", xdr); w.WriteEndElement();
        w.WriteEndElement();
        w.WriteEndElement();
    }

    private static void WriteStyles(XmlWriter w, string main)
    {
        void Font(bool bold, bool italic, int size, string? color)
        {
            w.WriteStartElement("font", main);
            if (bold) { w.WriteStartElement("b", main); w.WriteEndElement(); }
            if (italic) { w.WriteStartElement("i", main); w.WriteEndElement(); }
            w.WriteStartElement("sz", main); w.WriteAttributeString("val", size.ToString(CultureInfo.InvariantCulture)); w.WriteEndElement();
            if (color != null) { w.WriteStartElement("color", main); w.WriteAttributeString("rgb", color); w.WriteEndElement(); }
            w.WriteStartElement("name", main); w.WriteAttributeString("val", size == 11 && !bold && color == null ? "Calibri" : "Times New Roman"); w.WriteEndElement();
            w.WriteEndElement();
        }
        void Xf(int font, int fill, int border, string? horizontal, bool wrap)
        {
            w.WriteStartElement("xf", main);
            w.WriteAttributeString("numFmtId", "0"); w.WriteAttributeString("fontId", font.ToString(CultureInfo.InvariantCulture));
            w.WriteAttributeString("fillId", fill.ToString(CultureInfo.InvariantCulture)); w.WriteAttributeString("borderId", border.ToString(CultureInfo.InvariantCulture));
            w.WriteAttributeString("xfId", "0"); w.WriteAttributeString("applyFont", "1"); w.WriteAttributeString("applyFill", "1");
            w.WriteAttributeString("applyBorder", "1"); w.WriteAttributeString("applyAlignment", "1");
            w.WriteStartElement("alignment", main);
            if (horizontal != null) w.WriteAttributeString("horizontal", horizontal);
            w.WriteAttributeString("vertical", "center");
            if (wrap) w.WriteAttributeString("wrapText", "1");
            w.WriteEndElement();
            w.WriteEndElement();
        }
        const string navy = "FF002060";
        w.WriteStartElement("styleSheet", main);
        w.WriteStartElement("fonts", main); w.WriteAttributeString("count", "7");
        Font(false, false, 11, null);      // 0 mặc định
        Font(false, false, 10, null);      // 1 dữ liệu (Times New Roman)
        Font(true, false, 10, navy);       // 2 tiêu đề cột
        Font(true, false, 16, navy);       // 3 tiêu đề bảng
        Font(true, false, 11, navy);       // 4 dòng thông tin, đơn vị
        Font(false, true, 10, "FF475569"); // 5 ngày xuất
        Font(true, false, 12, navy);       // 6 tên trường khi thiếu logo
        w.WriteEndElement();
        w.WriteStartElement("fills", main); w.WriteAttributeString("count", "3");
        w.WriteStartElement("fill", main); w.WriteStartElement("patternFill", main); w.WriteAttributeString("patternType", "none"); w.WriteEndElement(); w.WriteEndElement();
        w.WriteStartElement("fill", main); w.WriteStartElement("patternFill", main); w.WriteAttributeString("patternType", "gray125"); w.WriteEndElement(); w.WriteEndElement();
        w.WriteStartElement("fill", main); w.WriteStartElement("patternFill", main); w.WriteAttributeString("patternType", "solid");
        w.WriteStartElement("fgColor", main); w.WriteAttributeString("rgb", "FFDDEBF7"); w.WriteEndElement();
        w.WriteStartElement("bgColor", main); w.WriteAttributeString("indexed", "64"); w.WriteEndElement();
        w.WriteEndElement(); w.WriteEndElement();
        w.WriteEndElement();
        w.WriteStartElement("borders", main); w.WriteAttributeString("count", "2");
        w.WriteStartElement("border", main);
        foreach (var side in new[] { "left", "right", "top", "bottom", "diagonal" }) { w.WriteStartElement(side, main); w.WriteEndElement(); }
        w.WriteEndElement();
        w.WriteStartElement("border", main);
        foreach (var side in new[] { "left", "right", "top", "bottom" })
        { w.WriteStartElement(side, main); w.WriteAttributeString("style", "thin"); w.WriteStartElement("color", main); w.WriteAttributeString("rgb", "FF8EA9C1"); w.WriteEndElement(); w.WriteEndElement(); }
        w.WriteStartElement("diagonal", main); w.WriteEndElement();
        w.WriteEndElement();
        w.WriteEndElement();
        w.WriteStartElement("cellStyleXfs", main); w.WriteAttributeString("count", "1");
        w.WriteStartElement("xf", main); w.WriteAttributeString("numFmtId", "0"); w.WriteAttributeString("fontId", "0"); w.WriteAttributeString("fillId", "0"); w.WriteAttributeString("borderId", "0"); w.WriteEndElement();
        w.WriteEndElement();
        w.WriteStartElement("cellXfs", main); w.WriteAttributeString("count", "9");
        w.WriteStartElement("xf", main); w.WriteAttributeString("numFmtId", "0"); w.WriteAttributeString("fontId", "0"); w.WriteAttributeString("fillId", "0"); w.WriteAttributeString("borderId", "0"); w.WriteAttributeString("xfId", "0"); w.WriteEndElement();
        Xf(1, 0, 1, null, true);       // 1 SData
        Xf(2, 2, 1, "center", true);   // 2 SHeader
        Xf(3, 0, 0, "center", true);   // 3 STitle
        Xf(4, 0, 0, "center", true);   // 4 SInfo
        Xf(4, 0, 0, "right", false);   // 5 SUnit
        Xf(5, 0, 0, "right", false);   // 6 SDate
        Xf(1, 0, 1, "right", false);   // 7 SNumber
        Xf(6, 0, 0, "left", false);    // 8 SSchool
        w.WriteEndElement();
        w.WriteStartElement("cellStyles", main); w.WriteAttributeString("count", "1");
        w.WriteStartElement("cellStyle", main); w.WriteAttributeString("name", "Normal"); w.WriteAttributeString("xfId", "0"); w.WriteAttributeString("builtinId", "0"); w.WriteEndElement();
        w.WriteEndElement();
        w.WriteEndElement();
    }

    // Độ rộng theo nội dung (lấy mẫu tối đa 500 dòng), giới hạn để bảng không quá rộng khi in.
    private static double[] ColumnWidths(IReadOnlyList<string> headers, IReadOnlyList<object?[]> rows, int columnCount)
    {
        var widths = new double[columnCount];
        for (var c = 0; c < columnCount; c++)
        {
            var longest = c < headers.Count ? Math.Min(headers[c].Length, 30) : 8;
            foreach (var data in rows.Take(500))
                if (c < data.Length && data[c] != null)
                    longest = Math.Max(longest, (Convert.ToString(data[c], CultureInfo.InvariantCulture) ?? "").Split('\n').Max(x => x.Length));
            widths[c] = Math.Clamp(longest + 3, 9, 45);
        }
        return widths;
    }

    private static double EstimateHeight(string text, double totalWidth, double charWidth, double lineHeight)
    {
        var perLine = Math.Max(10, totalWidth / charWidth);
        return Math.Ceiling(text.Length / perLine) * lineHeight + 4;
    }

    private static string SafeSheetName(string name)
    {
        var clean = new string((name ?? "").Where(ch => ch is not ('[' or ']' or ':' or '*' or '?' or '/' or '\\' or '\'')).ToArray()).Trim();
        return string.IsNullOrEmpty(clean) ? "DanhSach" : clean.Length > 31 ? clean[..31] : clean;
    }

    private static string Column(int index)
    { var result = ""; while (index > 0) { index--; result = (char)('A' + index % 26) + result; index /= 26; } return result; }
}
