using System.Data;
using InternshipManagement.BLL.Common;
using InternshipManagement.BLL.DTOs.SinhVienTheoDot;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Common;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.SinhVienTheoDot;

public class SinhVienTheoDotService(AppDbContext db, TimeProvider? clock = null)
{
    private readonly TimeProvider _clock = clock ?? TimeProvider.System;
    private static readonly (string Code, string Name)[] Groups =
    {
        ("ChuaDangKy", "Chưa đăng ký nơi thực tập"), ("DangUngTuyen", "Đang ứng tuyển"),
        ("ChuaCoNoiTiepNhan", "Chưa có nơi tiếp nhận"), ("ChoCongNhan", "Chờ Khoa công nhận nơi tự tìm"),
        ("ChoSVXacNhan", "Chờ SV xác nhận nhận việc"), ("ChoKhoaChot", "Chờ Khoa chốt phân bổ"),
        ("ChuaBatDau", "Đã phân bổ, chưa bắt đầu"), ("DangThucTap", "Đang thực tập"),
        ("ChoHoanTat", "Hết thời gian, chờ hoàn tất"), ("HoanThanh", "Hoàn thành"),
        ("CanXuLyLai", "Cần xử lý lại"), ("CanKiemTra", "Cần kiểm tra dữ liệu")
        ,("ChuaXacMinhThoiGian", "Đã phân bổ, chưa xác minh thời gian"), ("KhongHoanTat", "Không hoàn tất đợt")
    };

    // Các nguồn đều có mã đợt thật. Không dùng PHONGVAN chưa gắn đợt hoặc toàn bộ SINHVIEN.
    private IQueryable<string> ActivityIds(string maDot) =>
        db.DangKyThucTaps.Where(x => x.MaDot == maDot).Select(x => x.MaSV)
        .Union(db.PhanBoThucTaps.Where(x => x.MaDot == maDot).Select(x => x.MaSinhVien))
        .Union(db.DeXuatThucTapTuTims.Where(x => x.MaDot == maDot).Select(x => x.MaSV))
        .Union(db.GVHuongDans.Where(x => x.MaDot == maDot).Select(x => x.MaSinhVien))
        .Union(db.TienDoThucTaps.Where(x => x.MaDot == maDot).Select(x => x.MaSV))
        .Union(db.PhieuChamDiems.Where(x => x.MaDot == maDot).Select(x => x.MaSV))
        .Union(db.KhongHoanTatDots.Where(x => x.MaDot == maDot).Select(x => x.MaSV));

    private async Task<DotThucTap> RequireRound(string maDot, bool forWrite = false)
    {
        if (string.IsNullOrWhiteSpace(maDot)) throw new ArgumentException("Vui lòng chọn đợt thực tập.");
        var round = await db.DotThucTaps.AsNoTracking().FirstOrDefaultAsync(x => x.MaSo == maDot)
            ?? throw new KeyNotFoundException("Không tìm thấy đợt thực tập.");
        if (forWrite && round.TrangThai is not ("ChuaBatDau" or "DangDienRa"))
            throw new InvalidOperationException("Đợt đã kết thúc, không được sửa danh sách tham gia.");
        return round;
    }

    private static string Actor(string value) => !string.IsNullOrWhiteSpace(value) && value.Length <= 20
        ? value : throw new UnauthorizedAccessException();
    private static string RequiredText(string? value, string label, int length = 1000)
    {
        var text = value?.Trim() ?? "";
        return text.Length > 0 && text.Length <= length ? text : throw new ArgumentException($"{label} bắt buộc, tối đa {length} ký tự.");
    }
    private DateTime Today => _clock.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).Date;

    public async Task<int> AddAsync(ThemSinhVienTheoDotRequest request, string actor)
    {
        actor = Actor(actor);
        if (request.MaSinhViens == null || request.MaSinhViens.Count is < 1 or > 500)
            throw new ArgumentException("Mỗi lần thêm cần từ 1 đến 500 MSSV.");
        if (request.MaSinhViens.Any(x => string.IsNullOrWhiteSpace(x) || x.Trim().Length > 20))
            throw new ArgumentException("MSSV không hợp lệ.");
        var ids = request.MaSinhViens.Select(x => x.Trim().ToUpperInvariant()).Distinct().ToArray();
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        await RequireRound(request.MaDot, true);
        var students = await db.SinhViens.AsNoTracking().Where(s => ids.Contains(s.MaSV.ToUpper())).Select(s => s.MaSV).ToListAsync();
        var found = students.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var missing = ids.Where(id => !found.Contains(id)).ToArray();
        if (missing.Length != 0) throw new ArgumentException($"MSSV chưa có trong danh mục: {string.Join(", ", missing)}. Chưa thêm sinh viên nào.");
        var existing = await db.SinhVienThamGiaDots.Where(x => x.MaDot == request.MaDot && students.Contains(x.MaSV)).ToDictionaryAsync(x => x.MaSV);
        var now = _clock.GetUtcNow();
        var added = 0;
        foreach (var id in students)
        {
            if (existing.TryGetValue(id, out var item))
            {
                if (item.DangThamGia) continue;
                item.DangThamGia = true; item.NgayCapNhat = now; item.NguoiCapNhat = actor;
            }
            else db.SinhVienThamGiaDots.Add(new SinhVienThamGiaDot { MaSV = id, MaDot = request.MaDot,
                DangThamGia = true, NgayThem = now, NguoiThem = actor, NgayCapNhat = now, NguoiCapNhat = actor });
            added++;
        }
        await db.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
        return added;
    }

    public async Task RemoveAsync(string maDot, string maSV, string actor)
    {
        actor = Actor(actor);
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        await RequireRound(maDot, true);
        var item = await db.SinhVienThamGiaDots.FirstOrDefaultAsync(x => x.MaDot == maDot && x.MaSV == maSV)
            ?? throw new KeyNotFoundException("Sinh viên chưa có trong danh sách do Khoa thêm.");
        if (await ActivityIds(maDot).AnyAsync(id => id == maSV))
            throw new InvalidOperationException("Sinh viên đã có hồ sơ/nghiệp vụ trong đợt. Không được gỡ khỏi danh sách để tránh mất theo dõi; xử lý thay đổi nơi thực tập ở nghiệp vụ riêng.");
        if (item.DangThamGia)
        {
            item.DangThamGia = false; item.NgayCapNhat = _clock.GetUtcNow(); item.NguoiCapNhat = actor;
            await db.SaveChangesAsync();
        }
        if (tx != null) await tx.CommitAsync();
    }

    public async Task<object> GetCompaniesForInitialAllocationAsync(string maDot)
    {
        await RequireRound(maDot);
        return await db.CongTys.AsNoTracking().Where(x => x.TrangThai == "DaDuyet" && !x.ChiTiepNhanTuTim)
            .OrderBy(x => x.TenCongTy).Select(x => new
            {
                x.MaCongTy, x.TenCongTy,
                ViTris = db.ViTriTheoDots.Where(v => v.MaCongTy == x.MaCongTy && v.MaDot == maDot).Select(v => new { v.MaViTri, v.TenViTri, v.YeuCau, v.SoLuongNhan, v.HoatDong,
                    DaTiepNhan = db.PhanBoThucTaps.Count(p => p.MaDot == maDot && p.MaViTri == v.MaViTri && p.TrangThai != "Huy") }).ToList(),
                ViTriTuyen = db.CongTyTheoDots.Where(o => o.MaDot == maDot && o.MaCongTy == x.MaCongTy).Select(o => o.ViTriTuyen).FirstOrDefault() ?? x.ViTriTuyen,
                SoLuongNhan = db.CongTyTheoDots.Where(o => o.MaDot == maDot && o.MaCongTy == x.MaCongTy).Select(o => (int?)o.SoLuongNhan).FirstOrDefault() ?? x.SoLuongNhan,
                DaTiepNhan = db.PhanBoThucTaps.Count(p => p.MaDot == maDot && p.MaCongTy == x.MaCongTy && p.TrangThai != "Huy")
            }).ToListAsync();
    }

    public async Task<string> InitialAllocateAsync(string maSV, BoTriBanDauRequest request, string actor)
    {
        actor = Actor(actor);
        if (!request.DaTiepNhanTrucTiep)
            throw new ArgumentException("Khoa cần xác nhận đã tiếp nhận trực tiếp thông tin/lý do và minh chứng trước khi bố trí.");
        if (!request.DaDuocDNTiepNhan)
            throw new ArgumentException("Khoa cần xác nhận DN đã đồng ý tiếp nhận sinh viên.");
        var reason = RequiredText(request.LyDo, "Lý do bố trí");
        var reference = RequiredText(request.CanCu, "Căn cứ tiếp nhận của DN");
        var companyId = RequiredText(request.MaCongTy, "Công ty", 20);
        if (companyId.Length > 20) throw new ArgumentException("Mã công ty không hợp lệ.");

        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        await db.LockRoundsAsync(new[] { request.MaDot });
        var round = await RequireRound(request.MaDot, true);
        LanHoTroService.CheckRound(round, Today);
        if ((request.MaLanHoTro == null) != (request.PhienBanHoTro == null)) throw new ArgumentException("Thiếu mã/phiên bản lần hỗ trợ.");
        if (round.ThoiGianBD == default || round.ThoiGianKT.Date < round.ThoiGianBD.Date || Today > round.ThoiGianKT.Date)
            throw new InvalidOperationException("Thời gian thực tập của đợt thiếu, không hợp lệ hoặc đã kết thúc; không thể bố trí ban đầu.");
        if (!await db.SinhViens.AnyAsync(x => x.MaSV == maSV)) throw new KeyNotFoundException("Không tìm thấy sinh viên.");
        var listed = await db.SinhVienThamGiaDots.AnyAsync(x => x.MaDot == request.MaDot && x.MaSV == maSV && x.DangThamGia);
        var hasActivity = await ActivityIds(request.MaDot).AnyAsync(x => x == maSV);
        if (!listed && !hasActivity) throw new InvalidOperationException("Sinh viên chưa thuộc danh sách tham gia đợt; Khoa cần thêm MSSV vào đợt trước.");
        if (await db.PhanBoThucTaps.AnyAsync(x => x.MaDot == request.MaDot && x.MaSinhVien == maSV))
            throw new InvalidOperationException("Sinh viên đã có lịch sử nơi thực tập trong đợt; dùng chức năng hủy/phân bổ lại hoặc kiểm tra dữ liệu, không tạo phân bổ ban đầu.");
        if (await db.DangKyThucTaps.AnyAsync(x => x.MaDot == request.MaDot && x.MaSV == maSV && (x.TrangThai == "ChoDuyet" || x.TrangThai == "DaDuyet")))
            throw new InvalidOperationException("Sinh viên đang có nguyện vọng chờ xét/được tiếp nhận; Khoa cần xử lý nhánh đăng ký trước.");
        if (await db.DeXuatThucTapTuTims.AnyAsync(x => x.MaDot == request.MaDot && x.MaSV == maSV && (x.TrangThai == "ChoDuyet" || x.TrangThai == "DaDuyet")))
            throw new InvalidOperationException("Sinh viên có hồ sơ nơi tự tìm đang chờ/đã công nhận; Khoa cần xử lý hồ sơ đó trước.");
        if (await db.TienDoThucTaps.AnyAsync(x => x.MaDot == request.MaDot && x.MaSV == maSV)
            || await db.PhieuChamDiems.AnyAsync(x => x.MaDot == request.MaDot && x.MaSV == maSV)
            || await db.GVHuongDans.AnyAsync(x => x.MaDot == request.MaDot && x.MaSinhVien == maSV))
            throw new InvalidOperationException("Sinh viên đã có tiến độ, điểm hoặc GVHD nhưng chưa có nơi thực tập; Khoa cần kiểm tra dữ liệu trước, không bố trí tự động.");
        var company = await db.CongTys.FirstOrDefaultAsync(x => x.MaCongTy == companyId)
            ?? throw new KeyNotFoundException("Không tìm thấy doanh nghiệp.");
        if (company.TrangThai != "DaDuyet" || company.ChiTiepNhanTuTim)
            throw new InvalidOperationException("DN không thuộc danh mục được Khoa duyệt để bố trí cho sinh viên chưa có chỗ.");
        var count = await db.PhanBoThucTaps.CountAsync(x => x.MaDot == request.MaDot && x.MaCongTy == companyId && x.TrangThai != "Huy");
        var capacity = await CompanyRoundCapacity.LimitAsync(db, companyId, request.MaDot, company.SoLuongNhan);
        if (capacity > 0 && count >= capacity) throw new InvalidOperationException("DN đã đủ chỉ tiêu trong đợt.");
        var position = await PositionCapacity.RequireRoomAsync(db, companyId, request.MaDot, request.MaViTri);
        var id = IdGenerator.New("PB");
        db.PhanBoThucTaps.Add(new PhanBoThucTap
        {
            MaPhanBo = id, MaSinhVien = maSV, MaCongTy = companyId, MaViTri = position?.MaViTri, MaDot = request.MaDot,
            NgayPhanBo = Today, TrangThai = "DangThucTap", DaDuocKhoaDuyet = true,
            NgayKhoaDuyet = Today, NguoiKhoaDuyet = actor, NguonPhanBo = "KhoaBoTriBanDau"
        });
        db.NhatKyDieuChinhThucTaps.Add(new NhatKyDieuChinhThucTap
        {
            MaNhatKy = IdGenerator.New("DC"), MaDot = request.MaDot, MaSV = maSV, MaPhanBo = id,
            Loai = "BoTriBanDau", LyDo = reason, CanCu = reference,
            NoiDung = $"Khoa bố trí ban đầu vào DN {companyId}; Khoa xác minh DN đã đồng ý tiếp nhận. Không tạo xác nhận SV hoặc lịch PV giả.",
            NguoiThucHien = actor, ThoiDiem = _clock.GetUtcNow()
        });
        if (request.MaLanHoTro != null)
            await new LanHoTroService(db, this, _clock).AttachAllocationAsync(request.MaDot, request.MaLanHoTro, request.PhienBanHoTro!.Value, maSV, id, company.TenCongTy, actor);
        await db.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
        return id;
    }

    public async Task<DanhSachSinhVienTheoDotDto> GetAsync(string maDot)
    {
        var round = await RequireRound(maDot);
        var manualIds = (await db.SinhVienThamGiaDots.AsNoTracking().Where(x => x.MaDot == maDot && x.DangThamGia)
            .Select(x => x.MaSV).ToListAsync()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var activityIds = (await ActivityIds(maDot).ToListAsync()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var ids = manualIds.Union(activityIds, StringComparer.OrdinalIgnoreCase).ToArray();
        if (ids.Length == 0) return new(maDot, round.TenDot, 0, 0, 0, 0, 0,
            Groups.Select(g => new NhomSinhVienTheoDotDto(g.Code, g.Name, 0)).ToList(), new());
        var students = await db.SinhViens.AsNoTracking().Where(x => ids.Contains(x.MaSV)).OrderBy(x => x.MaSV).ToListAsync();
        var applications = await db.DangKyThucTaps.AsNoTracking().Where(x => x.MaDot == maDot).ToListAsync();
        var selfArranged = await db.DeXuatThucTapTuTims.AsNoTracking().Where(x => x.MaDot == maDot).ToListAsync();
        var placements = await db.PhanBoThucTaps.AsNoTracking().Include(x => x.CongTy).Include(x => x.HoSoTuTim)
            .Where(x => x.MaDot == maDot).ToListAsync();
        var appsByStudent = applications.ToLookup(x => x.MaSV, StringComparer.OrdinalIgnoreCase);
        var selfByStudent = selfArranged.ToLookup(x => x.MaSV, StringComparer.OrdinalIgnoreCase);
        var pbByStudent = placements.ToLookup(x => x.MaSinhVien, StringComparer.OrdinalIgnoreCase);
        var nonCompletion = await db.KhongHoanTatDots.AsNoTracking().Where(x => x.MaDot == maDot && x.HieuLuc).ToDictionaryAsync(x => x.MaSV);
        var today = _clock.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).Date;
        var rows = students.Select(student =>
        {
            var apps = appsByStudent[student.MaSV].ToList();
            var ownPlacements = pbByStudent[student.MaSV].OrderByDescending(x => x.NgayPhanBo).ThenByDescending(x => x.MaPhanBo).ToList();
            var self = selfByStudent[student.MaSV].ToList();
            var row = new SinhVienTheoDotDto { MaSV = student.MaSV, HoTen = student.HoTen, Lop = student.Lop,
                DaCoDanhSachKhoa = manualIds.Contains(student.MaSV), CoNghiepVu = activityIds.Contains(student.MaSV),
                Nguon = manualIds.Contains(student.MaSV) ? "Khoa" : "NghiepVu",
                SoNguyenVongDangXet = apps.Count(a => a.TrangThai is "ChoDuyet" or "DaDuyet"),
                SoPhanBoDaHuy = ownPlacements.Count(p => p.TrangThai == "Huy") };
            Classify(row, round, ownPlacements, self, apps, today);
            if (nonCompletion.TryGetValue(student.MaSV, out var notCompleted))
            {
                row.TrangThai = "KhongHoanTat";
                row.LyDo = "Khoa đã xác nhận không hoàn tất đợt: " + notCompleted.LyDo;
            }
            row.TenTrangThai = Groups.Single(g => g.Code == row.TrangThai).Name;
            row.CanHoTro = row.TrangThai is "ChuaDangKy" or "ChuaCoNoiTiepNhan" or "CanXuLyLai" or "CanKiemTra";
            return row;
        }).ToList();
        return new(maDot, round.TenDot, rows.Count, rows.Count(x => x.DaCoDanhSachKhoa), rows.Count(x => !x.DaCoDanhSachKhoa),
            rows.Count(x => x.CanHoTro), rows.Count(x => x.CoPhanBoChinhThuc),
            Groups.Select(g => new NhomSinhVienTheoDotDto(g.Code, g.Name, rows.Count(x => x.TrangThai == g.Code))).ToList(), rows);
    }

    private static void Classify(SinhVienTheoDotDto row, DotThucTap round, List<PhanBoThucTap> placements,
        List<DeXuatThucTapTuTim> self, List<DAL.Entities.DangKyThucTap> apps, DateTime today)
    {
        var active = placements.Where(p => p.TrangThai != "Huy").ToList();
        if (active.Count > 1)
        {
            row.TrangThai = "CanKiemTra"; row.LyDo = "Có nhiều nơi tiếp nhận hiệu lực trong cùng đợt, cần Khoa kiểm tra."; return;
        }
        if (active.FirstOrDefault() is { } pb)
        {
            row.MaCongTy = pb.MaCongTy; row.TenCongTy = pb.TenCongTyXacNhan ?? pb.CongTy?.TenCongTy ?? pb.MaCongTy;
            row.MaPhanBo = pb.MaPhanBo;
            row.PhienBanThoiGian = pb.PhienBanThoiGian;
            var period = PlacementPeriod.Resolve(pb, round);
            row.NgayBatDauThucTap = period.Start; row.NgayKetThucThucTap = period.End; row.NguonThoiGian = period.Source;
            row.CoPhanBoChinhThuc = pb.DaDuocKhoaDuyet && pb.TrangThai is ("ChuaNhanViec" or "DangThucTap" or "HoanThanh");
            if (pb.TrangThai == "ChuaNhanViec") { row.TrangThai = "ChoSVXacNhan"; row.LyDo = "Đã có nơi tiếp nhận, chờ SV xác nhận nhận việc."; return; }
            if (!pb.DaDuocKhoaDuyet && pb.TrangThai == "ChoKhoaDuyet") { row.TrangThai = "ChoKhoaChot"; row.LyDo = "SV đã xác nhận, chờ Khoa chốt; chưa là phân bổ chính thức."; return; }
            if (pb.DaDuocKhoaDuyet && pb.TrangThai == "HoanThanh") { row.TrangThai = "HoanThanh"; row.LyDo = "Phân bổ đã được ghi nhận hoàn thành."; return; }
            if (pb.DaDuocKhoaDuyet && pb.TrangThai == "DangThucTap")
            {
                row.TrangThai = PlacementPeriod.Classify(period.Start, period.End, today);
                var rangeText = period.Start.HasValue && period.End.HasValue
                    ? $" ({period.Start.Value:dd/MM/yyyy} → {period.End.Value:dd/MM/yyyy})"
                    : "";
                row.LyDo = row.TrangThai switch {
                    "ChuaBatDau" => $"Đã phân bổ chính thức, chưa đến ngày bắt đầu thực tập{rangeText}.",
                    "ChoHoanTat" => $"Đã kết thúc thời gian thực tập{rangeText}, chờ hoàn tất học phần.",
                    "DangThucTap" => period.Source == "KhoaXacMinh"
                        ? $"Đang thực tập theo lịch riêng đã điều chỉnh{rangeText}."
                        : period.Source == "HoSoDaCongNhan"
                        ? $"Đang thực tập theo thời gian hồ sơ tự tìm{rangeText}."
                        : $"Đang thực tập theo lịch của đợt{rangeText}.",
                    _ => "Chưa có khung thời gian thực tập hợp lệ của đợt."
                };
                return;
            }
            row.TrangThai = "CanKiemTra"; row.LyDo = "Trạng thái tiếp nhận và hiệu lực Khoa duyệt chưa nhất quán."; return;
        }
        var pendingSelf = self.Where(x => x.TrangThai == "ChoDuyet").OrderByDescending(x => x.NgayGui).ThenByDescending(x => x.MaHoSo).FirstOrDefault();
        if (pendingSelf != null)
        {
            row.MaCongTy = pendingSelf.MaCongTy; row.TenCongTy = pendingSelf.TenCongTy;
            row.TrangThai = "ChoCongNhan"; row.LyDo = "SV đã gửi nơi tự tìm, chờ Khoa xác minh/công nhận; chưa là phân bổ chính thức."; return;
        }
        if (placements.Any(x => x.TrangThai == "Huy")) { row.TrangThai = "CanXuLyLai"; row.LyDo = "Nơi tiếp nhận trước đã bị hủy, chưa có nơi mới hiệu lực; Khoa cần theo dõi xử lý lại."; return; }
        if (self.Any(x => x.TrangThai == "DaDuyet")) { row.TrangThai = "CanKiemTra"; row.LyDo = "Hồ sơ nơi tự tìm đã được duyệt nhưng chưa có phân bổ hiệu lực, cần Khoa kiểm tra."; return; }
        if (apps.Any(x => x.TrangThai is "ChoDuyet" or "DaDuyet")) { row.TrangThai = "DangUngTuyen"; row.LyDo = "Có nguyện vọng đang xét/chờ kết quả, chưa có nơi tiếp nhận."; return; }
        if (apps.Count > 0 || self.Count > 0) { row.TrangThai = "ChuaCoNoiTiepNhan"; row.LyDo = "Hồ sơ đã từ chối/kết thúc, chưa có nơi tiếp nhận. "
            + (apps.Count >= 3 ? "Đã dùng đủ 3 lượt trong đợt; Khoa cần hỗ trợ bố trí ban đầu. " : "Còn lượt thì SV có thể đăng ký trong đợt mở, hoặc Khoa hỗ trợ bố trí. ")
            + string.Join("; ", apps.Where(a => a.LyDoKetThuc != null).Select(a => a.LyDoKetThuc)); return; }
        if (row.CoNghiepVu) { row.TrangThai = "CanKiemTra"; row.LyDo = "Có hướng dẫn/tiến độ/điểm trong đợt nhưng chưa có phân bổ hiệu lực, cần kiểm tra dữ liệu."; return; }
        row.TrangThai = "ChuaDangKy"; row.LyDo = "Khoa đã đưa SV vào đợt, chưa có nguyện vọng hoặc hồ sơ nơi thực tập.";
    }
}
