using System.Data;
using System.Globalization;
using InternshipManagement.BLL.Validators.SinhVien;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using StudentEntity = InternshipManagement.DAL.Entities.SinhVien;

namespace InternshipManagement.BLL.Services.Admin;

public sealed record CatalogImportError(int Dong, string Loi);
public sealed record CatalogImportResult(int SoLuongNhap, IReadOnlyList<CatalogImportError> Loi);

public sealed class CatalogImportService(AppDbContext db, SinhVienValidator studentValidator)
{
    private const int MaxRows = 1000;
    public static readonly IReadOnlyDictionary<string, string> Templates = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["sv"] = "maSV,hoTen,lop,khoaHoc,gpa,chuyenNganh,kyNang,congNghe,duAnDaThucHien",
        ["gv"] = "maGV,hoTen,chuyenMon,chiTieuHD",
        ["cong-ty"] = "maCongTy,tenCongTy,viTriTuyen,thoiGian,soLuongNhan,yeuCau"
    };

    public async Task<CatalogImportResult> ImportAsync(string kind, string csv)
    {
        if (!Templates.TryGetValue(kind, out var header)) throw new ArgumentException("Danh mục import chỉ nhận sv, gv hoặc cong-ty.");
        var records = Parse(csv);
        if (records.Count < 2) throw new ArgumentException("CSV cần có dòng tiêu đề và ít nhất một dòng dữ liệu.");
        if (records.Count - 1 > MaxRows) throw new ArgumentException($"Mỗi lần import tối đa {MaxRows} dòng dữ liệu.");

        var expected = header.Split(',');
        var supplied = records[0].Select(x => x.Trim()).ToArray();
        if (!supplied.SequenceEqual(expected, StringComparer.OrdinalIgnoreCase))
            throw new ArgumentException($"Tiêu đề CSV không đúng. Tải mẫu cho danh mục {kind} để dùng đúng cột.");

        var errors = new List<CatalogImportError>();
        var parsed = new List<object>();
        var ids = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        for (var index = 1; index < records.Count; index++)
        {
            var line = index + 1;
            var row = records[index];
            if (row.All(string.IsNullOrWhiteSpace)) continue;
            if (row.Count != expected.Length) { errors.Add(new(line, $"Cần {expected.Length} cột, nhận được {row.Count}.")); continue; }
            try
            {
                object item = kind.ToLowerInvariant() switch
                {
                    "sv" => ParseStudent(row),
                    "gv" => ParseLecturer(row),
                    _ => ParseCompany(row)
                };
                var id = item switch { StudentEntity s => s.MaSV, GiangVien g => g.MaGV, CongTy c => c.MaCongTy, _ => "" };
                if (!ids.Add(id)) throw new FormatException($"Mã {id} bị lặp trong file.");
                parsed.Add(item);
            }
            catch (Exception ex) when (ex is FormatException or ArgumentException)
            {
                errors.Add(new(line, ex.Message));
            }
        }
        if (parsed.Count == 0 && errors.Count == 0) errors.Add(new(2, "Không có dòng dữ liệu để nhập."));

        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var keys = ids.ToArray();
        if (keys.Length > 0)
        {
            var existing = kind.ToLowerInvariant() switch
            {
                "sv" => await db.SinhViens.Where(x => keys.Contains(x.MaSV)).Select(x => x.MaSV).ToListAsync(),
                "gv" => await db.GiangViens.Where(x => keys.Contains(x.MaGV)).Select(x => x.MaGV).ToListAsync(),
                _ => await db.CongTys.Where(x => keys.Contains(x.MaCongTy)).Select(x => x.MaCongTy).ToListAsync()
            };
            errors.AddRange(existing.Select(id => new CatalogImportError(0, $"Mã {id} đã tồn tại trong danh mục.")));
        }
        if (errors.Count > 0) return new CatalogImportResult(0, errors);

        if (kind.Equals("sv", StringComparison.OrdinalIgnoreCase)) db.SinhViens.AddRange(parsed.Cast<StudentEntity>());
        else if (kind.Equals("gv", StringComparison.OrdinalIgnoreCase)) db.GiangViens.AddRange(parsed.Cast<GiangVien>());
        else db.CongTys.AddRange(parsed.Cast<CongTy>());
        await db.SaveChangesAsync();
        if (tx is not null) await tx.CommitAsync();
        return new CatalogImportResult(parsed.Count, Array.Empty<CatalogImportError>());
    }

    public async Task<string> ExportAsync(string kind)
    {
        if (!Templates.TryGetValue(kind, out var header)) throw new ArgumentException("Danh mục export chỉ nhận sv, gv hoặc cong-ty.");
        var lines = new List<string> { header };
        if (kind.Equals("sv", StringComparison.OrdinalIgnoreCase))
        {
            var rows = await db.SinhViens.AsNoTracking().OrderBy(x => x.MaSV).ToListAsync();
            lines.AddRange(rows.Select(x => Csv([x.MaSV,x.HoTen,x.Lop,x.KhoaHoc,x.Gpa?.ToString(CultureInfo.InvariantCulture),x.ChuyenNganh,x.KyNang,x.CongNghe,x.DuAnDaThucHien])));
        }
        else if (kind.Equals("gv", StringComparison.OrdinalIgnoreCase))
        {
            var rows = await db.GiangViens.AsNoTracking().OrderBy(x => x.MaGV).ToListAsync();
            lines.AddRange(rows.Select(x => Csv([x.MaGV,x.HoTen,x.ChuyenMon,x.ChiTieuHD.ToString(CultureInfo.InvariantCulture)])));
        }
        else
        {
            var rows = await db.CongTys.AsNoTracking().OrderBy(x => x.MaCongTy).ToListAsync();
            lines.AddRange(rows.Select(x => Csv([x.MaCongTy,x.TenCongTy,x.ViTriTuyen,x.ThoiGian,x.SoLuongNhan?.ToString(CultureInfo.InvariantCulture),x.YeuCau])));
        }
        return string.Join("\r\n", lines) + "\r\n";
    }

    private static string Csv(IEnumerable<string?> values) => string.Join(',', values.Select(value =>
    {
        var text = value ?? "";
        return text.IndexOfAny([',','"','\r','\n']) >= 0 ? "\"" + text.Replace("\"", "\"\"") + "\"" : text;
    }));

    private StudentEntity ParseStudent(IReadOnlyList<string> r)
    {
        decimal? gpa = null;
        if (!string.IsNullOrWhiteSpace(r[4]) && (!decimal.TryParse(r[4].Trim(), NumberStyles.Number, CultureInfo.InvariantCulture, out var value) || value < 0 || value > 4))
            throw new FormatException("GPA phải để trống hoặc là số từ 0 đến 4, dùng dấu chấm thập phân.");
        if (!string.IsNullOrWhiteSpace(r[4])) gpa = decimal.Parse(r[4].Trim(), CultureInfo.InvariantCulture);
        var errs = studentValidator.Validate(r[0], r[1], gpa, r[2], r[3], r[7], r[6], r[8]);
        if (r[5].Trim().Length > 100) errs.Add("Chuyên ngành không được vượt quá 100 ký tự.");
        if (errs.Count > 0) throw new FormatException(string.Join(" ", errs));
        return new StudentEntity { MaSV=r[0].Trim(), HoTen=r[1].Trim(), Lop=Optional(r[2]), KhoaHoc=Optional(r[3]), Gpa=gpa, ChuyenNganh=Optional(r[5]), KyNang=Optional(r[6]), CongNghe=Optional(r[7]), DuAnDaThucHien=Optional(r[8]) };
    }

    private static GiangVien ParseLecturer(IReadOnlyList<string> r)
    {
        var id=r[0].Trim(); var name=r[1].Trim(); var expertise=Optional(r[2]);
        var quota=string.IsNullOrWhiteSpace(r[3]) ? 10 : int.TryParse(r[3].Trim(), NumberStyles.None, CultureInfo.InvariantCulture, out var q) ? q : -1;
        if (string.IsNullOrWhiteSpace(id) || id.Length>20 || string.IsNullOrWhiteSpace(name) || name.Length>100 || expertise?.Length>200 || quota is <1 or >50)
            throw new FormatException("Mã GV (tối đa 20), họ tên (tối đa 100), chuyên môn (tối đa 200) phải hợp lệ; chỉ tiêu là số nguyên 1–50 (mặc định 10). ");
        return new GiangVien { MaGV=id, HoTen=name, ChuyenMon=expertise, ChiTieuHD=quota, SoLuongSVHD=0 };
    }

    private static CongTy ParseCompany(IReadOnlyList<string> r)
    {
        var id=r[0].Trim(); var name=r[1].Trim(); var position=Optional(r[2]); var period=Optional(r[3]); var requirement=Optional(r[5]);
        var capacity=string.IsNullOrWhiteSpace(r[4]) ? 0 : int.TryParse(r[4].Trim(), NumberStyles.None, CultureInfo.InvariantCulture, out var n) ? n : -1;
        if (string.IsNullOrWhiteSpace(id) || id.Length>20 || string.IsNullOrWhiteSpace(name) || name.Length>200 || position?.Length>200 || period?.Length>100 || requirement?.Length>2000 || capacity<0)
            throw new FormatException("Mã công ty (tối đa 20), tên (tối đa 200), nội dung trong giới hạn cột và số lượng nhận là số nguyên không âm.");
        return new CongTy { MaCongTy=id, TenCongTy=name, ViTriTuyen=position, ThoiGian=period, SoLuongNhan=capacity, YeuCau=requirement, TrangThai="ChoDuyet" };
    }

    private static string? Optional(string value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static List<List<string>> Parse(string csv)
    {
        var rows = new List<List<string>>();
        var row = new List<string>(); var cell = new System.Text.StringBuilder(); var quoted = false;
        csv = csv.TrimStart('\uFEFF');
        for (var i=0;i<csv.Length;i++)
        {
            var ch=csv[i];
            if (ch=='"') { if (quoted && i+1<csv.Length && csv[i+1]=='"') { cell.Append('"'); i++; } else quoted=!quoted; }
            else if (ch==',' && !quoted) { row.Add(cell.ToString()); cell.Clear(); }
            else if (ch=='\r' && !quoted) { if (i+1<csv.Length && csv[i+1]=='\n') i++; row.Add(cell.ToString()); cell.Clear(); rows.Add(row); row=new List<string>(); }
            else if (ch=='\n' && !quoted) { row.Add(cell.ToString()); cell.Clear(); rows.Add(row); row=new List<string>(); }
            else cell.Append(ch);
        }
        if (quoted) throw new ArgumentException($"Dòng {rows.Count+1}: dấu ngoặc kép CSV chưa được đóng.");
        if (cell.Length>0 || row.Count>0) { row.Add(cell.ToString()); rows.Add(row); }
        return rows;
    }
}
