using InternshipManagement.BLL.Services.Auth;
using System.Data;
using System.Globalization;
using System.Text.Json;
using InternshipManagement.BLL.Validators.SinhVien;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.Admin;

public record StudentImportRow(string MaSV, string? HoTen = null, string? Lop = null, string? KhoaHoc = null,
    decimal? Gpa = null, string? ChuyenNganh = null, string? KyNang = null, string? CongNghe = null,
    string? DuAnDaThucHien = null, bool DungHoSoHienCo = false, int? Dong = null);
public record RoundImportRequest(string MaDot, string CheDo, List<StudentImportRow> Rows, string TenNguon = "Danh sách",
    string? NamHoc = null, string? MaLoaiThucTap = null);
public record ImportPreviewRow(int Dong, string MaSV, string? HoTen, string? Lop, string TrangThai, List<string> Loi, List<string>? CanhBao = null);
public record RoundImportPreview(string? Id, string MaDot, bool CoTheNhap, int SoHoSoMoi, int SoHoSoDaCo,
    int SoDaThamGia, int SoSeThemVaoDot, List<ImportPreviewRow> Rows, DateTimeOffset? HetHan, int PhienBan = 0);
public record RoundImportCommitRequest(int PhienBan);
public record RoundImportResult(string Id, string MaDot, bool ThanhCong, int SoHoSoTaoMoi, int SoThemVaoDot,
    int SoDaThamGia, DateTimeOffset? NgayNhap, List<ImportPreviewRow> Loi, List<ImportPreviewRow>? DoiSoat = null, int SoTaiKhoanTaoMoi = 0);

public class RoundStudentImportService(AppDbContext db, SinhVienValidator validator, TimeProvider clock, IPasswordService passwords)
{
    private static string? Text(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim().Normalize();
    private static void Actor(string actor)
    { if (string.IsNullOrWhiteSpace(actor) || actor.Length > 20) throw new UnauthorizedAccessException(); }

    private async Task RequireWritableAsync(string id)
    {
        var round = await db.DotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaSo == id) ?? throw new KeyNotFoundException("Không tìm thấy đợt.");
        var state = await db.ChotDotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaDot == id);
        if (round.TrangThai is not ("ChuaBatDau" or "DangDienRa") || round.TrangThaiDanhSachNoi != "ChuaCongBo"
            || AppDbContext.LockStatus(state, clock.GetUtcNow()) != "ChuaChot"
            || await db.CongBoDanhSachThucTaps.AnyAsync(x => x.MaDot == id) || await db.DanhSachThucTapChinhThucs.AnyAsync(x => x.MaDot == id))
            throw new RoundLockedException("Đợt/danh sách đã đóng hoặc công bố; không nhập thêm SV qua luồng import.");
    }

    private static RoundImportRequest Normalize(RoundImportRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.MaDot) || request.MaDot.Length > 20 || request.CheDo is not ("ThemVaoDot" or "NhapHoSo" or "DoiSoatKhongThamGia")
            || request.Rows == null || request.Rows.Count is < 1 or > 500 || string.IsNullOrWhiteSpace(request.TenNguon) || request.TenNguon.Length > 200)
            throw new ArgumentException("Chọn đợt, chế độ ThemVaoDot/NhapHoSo/DoiSoatKhongThamGia, nguồn tối đa 200 ký tự và từ 1–500 dòng.");
        if (request.Rows.Any(x => x == null)) throw new ArgumentException("Dòng dữ liệu không được null.");
        return request with { MaDot = request.MaDot.Trim(), TenNguon = request.TenNguon.Trim(), Rows = request.Rows.Select((r, i) => r with
        {
            MaSV = (r.MaSV ?? "").Trim().Normalize().ToUpperInvariant(), HoTen = Text(r.HoTen), Lop = Text(r.Lop), KhoaHoc = Text(r.KhoaHoc),
            ChuyenNganh = Text(r.ChuyenNganh), KyNang = Text(r.KyNang), CongNghe = Text(r.CongNghe), DuAnDaThucHien = Text(r.DuAnDaThucHien), Dong = r.Dong ?? i + 2
        }).ToList() };
    }

    private async Task<(RoundImportPreview Preview, Dictionary<string, DAL.Entities.SinhVien> Existing)> Analyze(RoundImportRequest request)
    {
        await RequireWritableAsync(request.MaDot);
        var round = await db.DotThucTaps.AsNoTracking().SingleAsync(x => x.MaSo == request.MaDot);
        if (request.NamHoc != null && request.NamHoc != round.NamHoc || request.MaLoaiThucTap != null && request.MaLoaiThucTap != round.MaLoaiThucTap)
            throw new ArgumentException("Năm học/loại trong danh sách không khớp đợt đã chọn.");
        var keys = request.Rows.Select(x => x.MaSV).ToArray();
        var existing = (await db.SinhViens.AsNoTracking().Where(x => keys.Contains(x.MaSV.ToUpper())).ToListAsync()).ToDictionary(x => x.MaSV, StringComparer.OrdinalIgnoreCase);
        var enrolled = (await db.SinhVienThamGiaDots.AsNoTracking().Where(x => x.MaDot == request.MaDot && x.DangThamGia).Select(x => x.MaSV).ToListAsync()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var placed = request.CheDo == "DoiSoatKhongThamGia" ? (await db.PhanBoThucTaps.Where(x => x.MaDot == request.MaDot && x.TrangThai != "Huy").Select(x => x.MaSinhVien).ToListAsync()).ToHashSet(StringComparer.OrdinalIgnoreCase) : [];
        var pending = request.CheDo == "DoiSoatKhongThamGia" ? (await db.DangKyThucTaps.Where(x => x.MaDot == request.MaDot && (x.TrangThai == "ChoDuyet" || x.TrangThai == "DaDuyet")).Select(x => x.MaSV)
            .Union(db.DeXuatThucTapTuTims.Where(x => x.MaDot == request.MaDot && x.TrangThai == "ChoDuyet").Select(x => x.MaSV)).ToListAsync()).ToHashSet(StringComparer.OrdinalIgnoreCase) : [];
        var academic = request.CheDo == "DoiSoatKhongThamGia" ? (await db.PhieuChamDiems.Where(x => x.MaDot == request.MaDot).Select(x => x.MaSV)
            .Union(db.TienDoThucTaps.Where(x => x.MaDot == request.MaDot).Select(x => x.MaSV)).ToListAsync()).ToHashSet(StringComparer.OrdinalIgnoreCase) : [];
        var duplicate = request.Rows.GroupBy(x => x.MaSV, StringComparer.OrdinalIgnoreCase).Where(g => g.Count() > 1).Select(g => g.Key).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var rows = new List<ImportPreviewRow>();
        foreach (var row in request.Rows)
        {
            var errors = new List<string>();
            var warnings = new List<string>();
            if (placed.Contains(row.MaSV)) warnings.Add("SV đã có nơi tiếp nhận; cần rà soát mâu thuẫn với danh sách không tham gia.");
            if (pending.Contains(row.MaSV)) warnings.Add("Còn hồ sơ ứng tuyển/tự tìm đang xử lý.");
            if (academic.Contains(row.MaSV)) warnings.Add("Đã có điểm hoặc báo cáo; không tự loại SV hay xóa dữ liệu.");
            if (request.CheDo == "DoiSoatKhongThamGia" && !enrolled.Contains(row.MaSV)) warnings.Add("Chưa có trong danh sách do Khoa thêm của đợt; chỉ ghi nguồn để rà soát.");
            if (row.MaSV.Length is < 1 or > 20 || row.Dong is < 1 or > 1_000_000) errors.Add("MSSV hoặc số dòng không hợp lệ.");
            if (duplicate.Contains(row.MaSV)) errors.Add("MSSV bị lặp trong tệp.");
            existing.TryGetValue(row.MaSV, out var current);
            if (current == null && request.CheDo != "NhapHoSo") errors.Add("MSSV chưa tồn tại; chế độ này không tạo hồ sơ mới.");
            if (current == null)
            {
                errors.AddRange(validator.Validate(row.MaSV, row.HoTen ?? "", row.Gpa, row.Lop, row.KhoaHoc, row.CongNghe, row.KyNang, row.DuAnDaThucHien));
                if (row.ChuyenNganh?.Length > 100 || row.Gpa.HasValue && decimal.Round(row.Gpa.Value, 2) != row.Gpa.Value)
                    errors.Add("Chuyên ngành tối đa 100 ký tự; GPA tối đa hai chữ số thập phân.");
            }
            else if (!row.DungHoSoHienCo)
            {
                bool Different(string? supplied, string? saved) => supplied != null && !string.Equals(supplied, Text(saved), StringComparison.OrdinalIgnoreCase);
                if (Different(row.HoTen, current.HoTen) || Different(row.Lop, current.Lop) || Different(row.KhoaHoc, current.KhoaHoc)
                    || Different(row.ChuyenNganh, current.ChuyenNganh) || Different(row.KyNang, current.KyNang)
                    || Different(row.CongNghe, current.CongNghe) || Different(row.DuAnDaThucHien, current.DuAnDaThucHien)
                    || row.Gpa.HasValue && row.Gpa != current.Gpa)
                    errors.Add("Dữ liệu khác hồ sơ hiện có. Đối chiếu rồi chọn DungHoSoHienCo hoặc sửa tệp; không tự ghi đè hồ sơ.");
            }
            rows.Add(new(row.Dong!.Value, current?.MaSV ?? row.MaSV, current?.HoTen ?? row.HoTen, current?.Lop ?? row.Lop,
                errors.Count > 0 ? "Loi" : request.CheDo == "DoiSoatKhongThamGia" ? "ChiDoiSoat" : current == null ? "TaoMoi" : enrolled.Contains(row.MaSV) ? "DaThamGia" : "ThemVaoDot", errors, warnings));
        }
        return (new(null, request.MaDot, rows.All(x => x.Loi.Count == 0), rows.Count(x => x.TrangThai == "TaoMoi"),
            rows.Count(x => existing.ContainsKey(x.MaSV)), rows.Count(x => x.TrangThai == "DaThamGia"), rows.Count(x => x.TrangThai is "TaoMoi" or "ThemVaoDot"), rows, null), existing);
    }

    public async Task<RoundImportPreview> PreviewAsync(RoundImportRequest request, string actor)
    {
        Actor(actor); request = Normalize(request);
        var analysis = await Analyze(request);
        if (!analysis.Preview.CoTheNhap) return analysis.Preview;
        var batch = new NhapDanhSachDot { MaDot = request.MaDot, NguoiNhap = actor, TenNguon = request.TenNguon, CheDo = request.CheDo,
            DuLieuJson = JsonSerializer.Serialize(request), NgayTao = clock.GetUtcNow(), HetHan = clock.GetUtcNow().AddMinutes(30) };
        db.NhapDanhSachDots.Add(batch); await db.SaveChangesAsync();
        return analysis.Preview with { Id = batch.Id, HetHan = batch.HetHan };
    }

    public async Task<object> GetAsync(string id, string actor)
    {
        Actor(actor);
        var batch = await db.NhapDanhSachDots.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id && x.NguoiNhap == actor)
            ?? throw new KeyNotFoundException("Không tìm thấy phiên import của bạn.");
        return new { batch.Id, batch.MaDot, batch.TenNguon, batch.CheDo, batch.TrangThai, batch.NgayTao, batch.HetHan,
            batch.NgayNhap, batch.PhienBan, KetQua = batch.KetQuaJson == null ? null : JsonSerializer.Deserialize<RoundImportResult>(batch.KetQuaJson) };
    }

    public async Task<object> HistoryAsync(string maDot, string actor, int page = 1)
    {
        Actor(actor);
        if (string.IsNullOrWhiteSpace(maDot)) throw new ArgumentException("Chọn đợt thực tập để xem lịch sử nhập.");
        if (!await db.DotThucTaps.AnyAsync(x => x.MaSo == maDot)) throw new KeyNotFoundException("Không tìm thấy đợt thực tập.");
        if (page is < 1 or > 1_000_000) throw new ArgumentException("Trang không hợp lệ.");
        var query = db.NhapDanhSachDots.AsNoTracking().Where(x => x.MaDot == maDot && x.NguoiNhap == actor);
        var count = await query.CountAsync();
        var items = await query.OrderByDescending(x => x.NgayTao).ThenBy(x => x.Id).Skip((page - 1) * 20).Take(20)
            .Select(x => new { x.Id, x.MaDot, x.NguoiNhap, x.TenNguon, x.CheDo, x.TrangThai, x.NgayTao, x.NgayNhap, x.HetHan, x.PhienBan }).ToListAsync();
        return new { TotalCount = count, Page = page, PageSize = 20, Items = items };
    }

    public async Task<RoundImportResult> CommitAsync(string id, RoundImportCommitRequest request, string actor)
    {
        Actor(actor);
        var locator = await db.NhapDanhSachDots.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id && x.NguoiNhap == actor)
            ?? throw new KeyNotFoundException("Không tìm thấy phiên import của bạn.");
        // Find the immutable scope before taking serializable locks: two retries must not both
        // hold a shared batch lock while one waits on the round lock and the other updates the batch.
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        await db.LockRoundsAsync([locator.MaDot]);
        var batch = await db.NhapDanhSachDots.SingleAsync(x => x.Id == id && x.NguoiNhap == actor);
        await db.Entry(batch).ReloadAsync();
        if (batch.MaDot != locator.MaDot) throw new DbUpdateConcurrencyException();
        if (batch.TrangThai == "DaNhap") return JsonSerializer.Deserialize<RoundImportResult>(batch.KetQuaJson!)!;
        if (batch.PhienBan != request.PhienBan) throw new DbUpdateConcurrencyException();
        if (clock.GetUtcNow() >= batch.HetHan) throw new InvalidOperationException("Phiên xem trước hết hạn; tải lại tệp để kiểm tra lại.");
        var input = Normalize(JsonSerializer.Deserialize<RoundImportRequest>(batch.DuLieuJson)!);
        var analysis = await Analyze(input);
        if (!analysis.Preview.CoTheNhap)
            return new(id, input.MaDot, false, 0, 0, 0, null, analysis.Preview.Rows.Where(x => x.Loi.Count > 0).ToList());
        var now = clock.GetUtcNow();
        var members = await db.SinhVienThamGiaDots.Where(x => x.MaDot == input.MaDot).ToDictionaryAsync(x => x.MaSV, StringComparer.OrdinalIgnoreCase);
        var created = 0; var added = 0; var already = 0; var accountsCreated = 0;
        var existingAccountKeys = (await db.TaiKhoans.AsNoTracking().Where(x => x.MaSV != null).Select(x => x.MaSV!).ToListAsync())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var existingAccountUsernames = (await db.TaiKhoans.AsNoTracking().Select(x => x.TenDangNhap).ToListAsync())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var existingAccountIds = (await db.TaiKhoans.AsNoTracking().Select(x => x.MaTaiKhoan).ToListAsync())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var defaultPasswordHash = passwords.Hash("123456");

        foreach (var row in input.Rows)
        {
            if (input.CheDo == "DoiSoatKhongThamGia") continue;
            var key = analysis.Existing.GetValueOrDefault(row.MaSV)?.MaSV ?? row.MaSV;
            if (!analysis.Existing.ContainsKey(row.MaSV))
            {
                db.SinhViens.Add(new() { MaSV = key, HoTen = row.HoTen!, Lop = row.Lop, KhoaHoc = row.KhoaHoc, Gpa = row.Gpa,
                    ChuyenNganh = row.ChuyenNganh, KyNang = row.KyNang, CongNghe = row.CongNghe, DuAnDaThucHien = row.DuAnDaThucHien });
                created++;
            }
            if (members.TryGetValue(key, out var member))
            {
                if (member.DangThamGia) { already++; }
                else
                {
                    member.DangThamGia = true; member.NguoiCapNhat = actor; member.NgayCapNhat = now;
                    added++;
                }
            }
            else
            {
                db.SinhVienThamGiaDots.Add(new() { MaSV = key, MaDot = input.MaDot, NguoiThem = actor, NgayThem = now, NguoiCapNhat = actor, NgayCapNhat = now });
                added++;
            }

            // Tự động cấp tài khoản đăng nhập nếu sinh viên chưa có tài khoản
            if (!existingAccountKeys.Contains(key))
            {
                var username = key.ToLowerInvariant();
                var accountId = "TK_" + key;
                if (accountId.Length > 20) accountId = accountId[..20];
                var suffix = 1;
                while (existingAccountIds.Contains(accountId))
                {
                    accountId = DAL.Common.IdGenerator.New("TK");
                }
                while (existingAccountUsernames.Contains(username))
                {
                    username = $"{key.ToLowerInvariant()}_{suffix++}";
                }

                existingAccountKeys.Add(key);
                existingAccountIds.Add(accountId);
                existingAccountUsernames.Add(username);

                db.TaiKhoans.Add(new TaiKhoan
                {
                    MaTaiKhoan = accountId,
                    TenDangNhap = username,
                    MatKhau = defaultPasswordHash,
                    TrangThai = "HoatDong",
                    MaVaiTro = "VT04",
                    MaSV = key,
                    Email = null
                });
                accountsCreated++;
            }
        }
        var result = new RoundImportResult(id, input.MaDot, true, created, added, already, now, [], input.CheDo == "DoiSoatKhongThamGia" ? analysis.Preview.Rows : null, accountsCreated);
        batch.TrangThai = "DaNhap"; batch.NgayNhap = now; batch.PhienBan++; batch.KetQuaJson = JsonSerializer.Serialize(result);
        await db.SaveChangesAsync(); if (tx != null) await tx.CommitAsync(); return result;
    }

    public static RoundImportRequest FromCsv(string maDot, string mode, string csv, string source)
    {
        if (csv.Length > 5_242_880) throw new ArgumentException("CSV tối đa 5 MB.");
        var rows = CatalogImportService.Parse(csv).Where(x => x.Any(c => !string.IsNullOrWhiteSpace(c))).ToList();
        if (rows.Count is < 2 or > 501) throw new ArgumentException("CSV cần tiêu đề và từ 1–500 dòng dữ liệu.");
        var header = rows[0].Select(x => x.Trim()).ToList();
        var allowed = new[] { "maSV", "hoTen", "hoDem", "ten", "lop", "khoaHoc", "gpa", "chuyenNganh", "kyNang", "congNghe", "duAnDaThucHien", "dungHoSoHienCo" };
        if (!header.Contains("maSV", StringComparer.OrdinalIgnoreCase) || header.Distinct(StringComparer.OrdinalIgnoreCase).Count() != header.Count
            || header.Any(x => !allowed.Contains(x, StringComparer.OrdinalIgnoreCase))) throw new ArgumentException("Cột CSV không hợp lệ; dùng mẫu import hoặc ánh xạ XLSX thành rows JSON.");
        var data = rows.Skip(1).Select((r, i) =>
        {
            if (r.Count != header.Count) throw new ArgumentException($"Dòng {i + 2}: số cột khác tiêu đề.");
            string? Read(string col) { var index = header.FindIndex(x => x.Equals(col, StringComparison.OrdinalIgnoreCase)); return index < 0 ? null : Text(r[index]); }
            decimal? gpa = null;
            if (Read("gpa") is string raw)
            {
                if (!decimal.TryParse(raw, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var value)) throw new ArgumentException($"Dòng {i + 2}: GPA dùng dấu chấm thập phân.");
                gpa = value;
            }
            var use = Read("dungHoSoHienCo");
            if (use != null && use is not ("true" or "false" or "1" or "0")) throw new ArgumentException($"Dòng {i + 2}: dungHoSoHienCo là true/false hoặc 1/0.");
            return new StudentImportRow(Read("maSV") ?? "", Read("hoTen") ?? Text(string.Join(" ", new[] { Read("hoDem"), Read("ten") }.Where(x => x != null))),
                Read("lop"), Read("khoaHoc"), gpa, Read("chuyenNganh"), Read("kyNang"), Read("congNghe"), Read("duAnDaThucHien"), use is "true" or "1", i + 2);
        }).ToList();
        return new(maDot, mode, data, source);
    }
}
