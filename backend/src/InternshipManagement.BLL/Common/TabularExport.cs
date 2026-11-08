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

    public static byte[] Xlsx(IReadOnlyList<string> headers, IReadOnlyList<object?[]> rows, string? title = null, string? subtitle = null)
    {
        const string main = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        const string rel = "http://schemas.openxmlformats.org/package/2006/relationships";
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
            { w.WriteStartElement("Relationship", rel); w.WriteAttributeString("Id", id); w.WriteAttributeString("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/" + type); w.WriteAttributeString("Target", target); w.WriteEndElement(); }
            Entry("[Content_Types].xml", w =>
            {
                const string ns = "http://schemas.openxmlformats.org/package/2006/content-types";
                w.WriteStartElement("Types", ns);
                foreach (var (extension, type) in new[] { ("rels", "application/vnd.openxmlformats-package.relationships+xml"), ("xml", "application/xml") })
                { w.WriteStartElement("Default", ns); w.WriteAttributeString("Extension", extension); w.WriteAttributeString("ContentType", type); w.WriteEndElement(); }
                foreach (var (path, type) in new[] { ("/xl/workbook.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"), ("/xl/worksheets/sheet1.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml") })
                { w.WriteStartElement("Override", ns); w.WriteAttributeString("PartName", path); w.WriteAttributeString("ContentType", type); w.WriteEndElement(); }
                w.WriteEndElement();
            });
            Entry("_rels/.rels", w => { w.WriteStartElement("Relationships", rel); Relationship(w, "rId1", "officeDocument", "xl/workbook.xml"); w.WriteEndElement(); });
            Entry("xl/_rels/workbook.xml.rels", w => { w.WriteStartElement("Relationships", rel); Relationship(w, "rId1", "worksheet", "worksheets/sheet1.xml"); w.WriteEndElement(); });
            Entry("xl/workbook.xml", w =>
            {
                w.WriteStartElement("workbook", main); w.WriteStartElement("sheets", main); w.WriteStartElement("sheet", main);
                w.WriteAttributeString("name", "KetQuaThucTap"); w.WriteAttributeString("sheetId", "1"); w.WriteAttributeString("r", "id", "http://schemas.openxmlformats.org/officeDocument/2006/relationships", "rId1");
                w.WriteEndElement(); w.WriteEndElement(); w.WriteEndElement();
            });
            Entry("xl/worksheets/sheet1.xml", w =>
            {
                var hasTitle = !string.IsNullOrWhiteSpace(title);
                var headerRow = hasTitle ? 4 : 1;
                w.WriteStartElement("worksheet", main);
                w.WriteStartElement("sheetViews", main); w.WriteStartElement("sheetView", main); w.WriteAttributeString("workbookViewId", "0");
                w.WriteStartElement("pane", main);
                w.WriteAttributeString("ySplit", headerRow.ToString());
                w.WriteAttributeString("topLeftCell", "A" + (headerRow + 1));
                w.WriteAttributeString("activePane", "bottomLeft");
                w.WriteAttributeString("state", "frozen");
                w.WriteEndElement(); w.WriteEndElement(); w.WriteEndElement();
                w.WriteStartElement("cols", main);
                for (var i = 0; i < headers.Count; i++)
                { w.WriteStartElement("col", main); w.WriteAttributeString("min", (i + 1).ToString()); w.WriteAttributeString("max", (i + 1).ToString()); w.WriteAttributeString("width", "24"); w.WriteAttributeString("customWidth", "1"); w.WriteEndElement(); }
                w.WriteEndElement(); w.WriteStartElement("sheetData", main);

                void WriteCell(string cellRef, object? val)
                {
                    w.WriteStartElement("c", main); w.WriteAttributeString("r", cellRef);
                    if (val is decimal or int or long or double)
                        w.WriteElementString("v", main, Convert.ToString(val, CultureInfo.InvariantCulture));
                    else
                    {
                        w.WriteAttributeString("t", "inlineStr");
                        w.WriteStartElement("is", main);
                        w.WriteStartElement("t", main);
                        w.WriteAttributeString("xml", "space", "http://www.w3.org/XML/1998/namespace", "preserve");
                        w.WriteString(Convert.ToString(val, CultureInfo.InvariantCulture) ?? "");
                        w.WriteEndElement();
                        w.WriteEndElement();
                    }
                    w.WriteEndElement();
                }

                var index = 0;
                if (hasTitle)
                {
                    index = 1;
                    w.WriteStartElement("row", main); w.WriteAttributeString("r", "1");
                    WriteCell("A1", title);
                    w.WriteEndElement();

                    index = 2;
                    w.WriteStartElement("row", main); w.WriteAttributeString("r", "2");
                    WriteCell("A2", subtitle ?? "");
                    w.WriteEndElement();

                    index = 3;
                    w.WriteStartElement("row", main); w.WriteAttributeString("r", "3");
                    w.WriteEndElement();
                }

                var all = new[] { headers.Cast<object?>().ToArray() }.Concat(rows);
                foreach (var row in all)
                {
                    index++;
                    w.WriteStartElement("row", main); w.WriteAttributeString("r", index.ToString());
                    for (var c = 0; c < row.Length; c++)
                    {
                        WriteCell(Column(c + 1) + index, row[c]);
                    }
                    w.WriteEndElement();
                }
                w.WriteEndElement();
                w.WriteStartElement("autoFilter", main);
                w.WriteAttributeString("ref", $"A{headerRow}:" + Column(headers.Count) + index);
                w.WriteEndElement();
                w.WriteEndElement();
            });
        }
        return output.ToArray();
    }
    private static string Column(int index)
    { var result = ""; while (index > 0) { index--; result = (char)('A' + index % 26) + result; index /= 26; } return result; }
}
