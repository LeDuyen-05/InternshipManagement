using System.IO.Compression;
using System.Security.Cryptography;

namespace InternshipManagement.BLL.Services.Documents;

public static class DocumentContent
{
    public static (string Name, string Mime, string Hash) Validate(string fileName, byte[] bytes, string kind, int maxMb)
    {
        var limit = (kind == "CV" ? Math.Min(maxMb, 5) : maxMb) * 1024L * 1024;
        if (bytes.Length == 0 || bytes.LongLength > limit) throw new ArgumentException($"Tệp rỗng hoặc vượt giới hạn {limit / 1024 / 1024} MB.");
        var name = Path.GetFileName(fileName.Replace('\\', '/'));
        if (string.IsNullOrWhiteSpace(name) || name.Length > 200 || name.Any(char.IsControl)) throw new ArgumentException("Tên tệp không hợp lệ.");
        var extension = Path.GetExtension(name).ToLowerInvariant(); string mime;
        if (extension == ".pdf" && bytes.AsSpan().StartsWith("%PDF-"u8)) mime = "application/pdf";
        else if (kind != "CV" && extension == ".png" && bytes.AsSpan().StartsWith(new byte[]{137,80,78,71,13,10,26,10})) mime = "image/png";
        else if (kind != "CV" && extension is ".jpg" or ".jpeg" && bytes.AsSpan().StartsWith(new byte[]{255,216,255})) mime = "image/jpeg";
        else if (kind != "CV" && extension is ".docx" or ".xlsx") {
            try {
                using var archive = new ZipArchive(new MemoryStream(bytes), ZipArchiveMode.Read);
                var expected = extension == ".docx" ? "word/document.xml" : "xl/workbook.xml";
                if (archive.Entries.Count > 500 || archive.Entries.Sum(x => x.Length) > 50L*1024*1024
                    || archive.GetEntry("[Content_Types].xml") == null || archive.GetEntry(expected) == null
                    || archive.Entries.Any(x => x.FullName.EndsWith("vbaProject.bin", StringComparison.OrdinalIgnoreCase))) throw new ArgumentException("Nội dung Office không hợp lệ hoặc chứa macro.");
            } catch (InvalidDataException) { throw new ArgumentException("Nội dung Office không hợp lệ."); }
            mime = extension == ".docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        } else throw new ArgumentException(kind == "CV" ? "CV chỉ nhận PDF có nội dung hợp lệ." : "Chỉ nhận PDF, PNG, JPEG, DOCX hoặc XLSX đúng nội dung.");
        return (name, mime, Convert.ToHexString(SHA256.HashData(bytes)));
    }
}
