using System.Data;
using System.Text.RegularExpressions;
using InternshipManagement.BLL.DTOs.Admin;
using InternshipManagement.BLL.Services.Auth;
using InternshipManagement.BLL.Validators.SinhVien;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.Admin;

public sealed class StudentAccountImportService(AppDbContext db, IPasswordService passwords, SinhVienValidator validator)
{
    public async Task<StudentAccountImportPreview> PreviewAsync(ImportStudentAccountsRequest request)
    {
        if (request.Rows is null || request.Rows.Count is < 1 or > 5000) throw new ArgumentException("Mỗi lần nhập từ 1 đến 5.000 dòng sinh viên.");
        if (request.Rows.Any(r => r is null)) throw new ArgumentException("Danh sách có dòng trống hoặc không hợp lệ.");
        if (!string.IsNullOrWhiteSpace(request.MaDot)) throw new ArgumentException("Admin chỉ nhập hồ sơ và cấp tài khoản. Danh sách tham gia đợt do Khoa quản lý.");
        var ids = request.Rows.Select(r => (r.MaSV ?? "").Trim().ToUpperInvariant()).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        var students = new Dictionary<string, DAL.Entities.SinhVien>(StringComparer.OrdinalIgnoreCase);
        var accounts = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var usernames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var batch in ids.Chunk(500)) {
            foreach (var student in await db.SinhViens.AsNoTracking().Where(s => batch.Contains(s.MaSV)).ToListAsync()) students[student.MaSV] = student;
            foreach (var id in await db.TaiKhoans.AsNoTracking().Where(a => a.MaSV != null && batch.Contains(a.MaSV)).Select(a => a.MaSV!).ToListAsync()) accounts.Add(id);
            var logins = batch.Select(x => x.ToLowerInvariant()).ToArray();
            foreach (var name in await db.TaiKhoans.AsNoTracking().Where(a => logins.Contains(a.TenDangNhap)).Select(a => a.TenDangNhap).ToListAsync()) usernames.Add(name);
        }
        var duplicates = request.Rows.Select((row, index) => new { Id = (row.MaSV ?? "").Trim(), Line = row.Dong ?? index + 2 })
            .GroupBy(r => r.Id, StringComparer.OrdinalIgnoreCase).Where(g => g.Key.Length > 0 && g.Count() > 1)
            .ToDictionary(g => g.Key, g => string.Join(", ", g.Take(8).Select(r => r.Line))
                + (g.Count() > 8 ? $"… (tổng {g.Count()} dòng)" : ""), StringComparer.OrdinalIgnoreCase);
        static string Name(string? value) => Regex.Replace(value?.Trim() ?? "", @"\s+", " ");
        var items = new List<StudentAccountImportItem>();
        for (var i = 0; i < request.Rows.Count; i++) {
            var row = request.Rows[i]; var id = (row.MaSV ?? "").Trim().ToUpperInvariant();
            students.TryGetValue(id, out var existing);
            var name = Name(row.HoTen); var lop = row.Lop?.Trim(); var email = row.Email?.Trim();
            var problems = validator.Validate(id, name.Length == 0 && existing != null ? existing.HoTen : name, null, lop);
            if (id.Length > 0 && !Regex.IsMatch(id, @"^[\p{L}\p{N}_-]+$")) problems.Add("MSSV chỉ gồm chữ, số, gạch dưới hoặc gạch nối.");
            if (!string.IsNullOrEmpty(email) && (email.Length > 200 || !Regex.IsMatch(email, @"^[^\s@]+@[^\s@]+\.[^\s@]+$"))) problems.Add("Email không hợp lệ.");
            if (existing != null && name.Length > 0 && !string.Equals(Name(existing.HoTen), name, StringComparison.OrdinalIgnoreCase)) problems.Add("Họ tên không khớp hồ sơ sinh viên hiện có.");
            if (existing != null && !string.IsNullOrEmpty(lop) && !string.IsNullOrEmpty(existing.Lop) && !string.Equals(lop, existing.Lop.Trim(), StringComparison.OrdinalIgnoreCase)) problems.Add("Lớp không khớp hồ sơ sinh viên hiện có.");
            string status, note;
            if (duplicates.TryGetValue(id, out var lines)) { status = "TrungTrongFile"; note = $"MSSV lặp tại dòng {lines}. Chỉ giữ một dòng cho mỗi sinh viên."; }
            else if (problems.Count > 0) { status = "KhongHopLe"; note = string.Join(" ", problems); }
            else if (accounts.Contains(id)) { status = "DaCoTaiKhoan"; note = "Bỏ qua; giữ nguyên hồ sơ, tài khoản và mật khẩu hiện có."; }
            else if (usernames.Contains(id.ToLowerInvariant())) { status = "KhongHopLe"; note = "Tên đăng nhập theo MSSV đã thuộc tài khoản khác."; }
            else if (existing != null) { status = "CapTaiKhoan"; note = "Sinh viên đã có hồ sơ; chỉ cấp tài khoản, không sửa thông tin học vụ."; }
            else { status = "TaoMoi"; note = "Tạo hồ sơ sinh viên và tài khoản mới."; }
            items.Add(new(row.Dong ?? i + 2, existing?.MaSV ?? id, existing?.HoTen ?? name, existing?.Lop ?? lop, email, status, note));
        }
        return new(items.Count, items.Count(x => x.TrangThai == "TaoMoi"), items.Count(x => x.TrangThai is "TaoMoi" or "CapTaiKhoan"),
            items.Count(x => x.TrangThai == "DaCoTaiKhoan"), items.Count(x => x.TrangThai == "TrungTrongFile"), items.Count(x => x.TrangThai == "KhongHopLe"), items);
    }

    public async Task<(int CreatedCount, int TotalRows, List<string> Errors)> ImportAsync(ImportStudentAccountsRequest request)
    {
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        var preview = await PreviewAsync(request);
        if (preview.InvalidRows > 0 || preview.DuplicateRows > 0)
            return (0, preview.TotalRows, preview.Items.Where(x => x.TrangThai is "KhongHopLe" or "TrungTrongFile").Select(x => $"Dòng {x.Dong}: {x.GhiChu}").ToList());
        var targets = preview.Items.Where(x => x.TrangThai is "TaoMoi" or "CapTaiKhoan").ToArray();
        var hash = targets.Length > 0 ? passwords.Hash("123456") : "";
        // Hồ sơ SV mới thuộc khoa QTV chọn; để trống khi hệ thống chỉ có một khoa.
        var maKhoa = await KhoaService.RequireActiveAsync(db, request.MaKhoa);
        foreach (var item in targets) {
            if (item.TrangThai == "TaoMoi") db.SinhViens.Add(new() { MaSV = item.MaSV, HoTen = item.HoTen, Lop = string.IsNullOrWhiteSpace(item.Lop) ? null : item.Lop, MaKhoa = maKhoa });
            db.TaiKhoans.Add(new() { MaTaiKhoan = "TK_" + Guid.NewGuid().ToString("N")[..17], TenDangNhap = item.MaSV.ToLowerInvariant(),
                MatKhau = hash, MaVaiTro = "VT04", TrangThai = "HoatDong", MaSV = item.MaSV,
                Email = string.IsNullOrWhiteSpace(item.Email) ? item.MaSV.ToLowerInvariant() + "@huit.edu.vn" : item.Email });
        }
        await db.SaveChangesAsync(); if (tx != null) await tx.CommitAsync();
        return (targets.Length, preview.TotalRows, []);
    }
}
