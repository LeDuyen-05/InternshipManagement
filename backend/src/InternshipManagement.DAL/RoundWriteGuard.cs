using System.Text.Json;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace InternshipManagement.DAL;

public sealed class RoundLockedException(string message) : InvalidOperationException(message);

public partial class AppDbContext
{
    private bool _savingRoundControl;
    private bool _savingDanhSachControl;
    public string? NguoiThucHien { get; set; }
    public TimeProvider RoundClock { get; set; } = TimeProvider.System;

    public static string LockStatus(ChotDotThucTap? state, DateTimeOffset now) => state is null ? "ChuaChot"
        : state.TrangThai == "MoLai" && (!state.HanMoLai.HasValue || now >= state.HanMoLai.Value) ? "ChoChotLai" : state.TrangThai;

    // Mọi đường SaveChanges dùng cùng khóa hàng với luồng chốt. Không chỉ kiểm tra UI/controller.
    public async Task LockRoundsAsync(IEnumerable<string> ids, CancellationToken ct = default)
    {
        if (!Database.IsRelational()) return;
        if (Database.CurrentTransaction is null) throw new InvalidOperationException("Khóa đợt cần transaction.");
        foreach (var id in ids.Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(x => x, StringComparer.OrdinalIgnoreCase))
            await Database.ExecuteSqlInterpolatedAsync($"SELECT [maSo] FROM [DOTTHUCTAP] WITH (UPDLOCK,HOLDLOCK) WHERE [maSo] = {id}", ct);
    }

    public override int SaveChanges() => SaveChanges(true);
    public override int SaveChanges(bool acceptAllChangesOnSuccess) => SaveChangesAsync(acceptAllChangesOnSuccess).GetAwaiter().GetResult();
    public override Task<int> SaveChangesAsync(CancellationToken ct = default) => SaveChangesAsync(true, ct);
    public override async Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken ct = default)
    {
        await using var ownTx = Database.IsRelational() && Database.CurrentTransaction is null ? await Database.BeginTransactionAsync(ct) : null;
        await CheckRoundWritesAsync(ct);
        var result = await base.SaveChangesAsync(acceptAllChangesOnSuccess, ct);
        if (ownTx is not null) await ownTx.CommitAsync(ct);
        return result;
    }

    // Chỉ service điều khiển chốt được dùng, không cho gom dữ liệu nghiệp vụ vào cùng lần bypass.
    public async Task SaveRoundControlAsync(CancellationToken ct = default)
    {
        ChangeTracker.DetectChanges();
        foreach (var entry in ChangeTracker.Entries<KhongHoanTatDot>().Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted))
        {
            var wasPreRoster = entry.State != EntityState.Added && entry.OriginalValues.GetValue<bool>("TruocChotDanhSach");
            if (!entry.Entity.TruocChotDanhSach && !wasPreRoster) continue;
            var round = await DotThucTaps.AsNoTracking().SingleAsync(x => x.MaSo == entry.Entity.MaDot, ct);
            if (round.TrangThaiDanhSachNoi == "ChinhThuc" || RoundClock.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).Date >= round.ThoiGianBD.Date
                || await DanhSachThucTapChinhThucs.AnyAsync(x => x.MaDot == entry.Entity.MaDot, ct))
                throw new RoundLockedException("Đã chốt danh sách hoặc đến ngày bắt đầu; không sửa/thu hồi kết quả rà chưa có nơi.");
        }
        if (Changed().Any(x => x.Entity is not (ChotDotThucTap or KhongHoanTatDot or NhatKyChotDot)))
            throw new InvalidOperationException("Không được sửa nghiệp vụ cùng thao tác chốt/mở lại.");
        _savingRoundControl = true;
        try { await SaveChangesAsync(ct); }
        finally { _savingRoundControl = false; }
    }

    private List<EntityEntry> Changed() => ChangeTracker.Entries().Where(x => x.State is EntityState.Added or EntityState.Modified or EntityState.Deleted).ToList();

    // Chỉ chấp nhận quyết định mới, bản chính thức mới và ba trường công ty của nơi cũ.
    public async Task SaveDanhSachControlAsync(CancellationToken ct = default)
    {
        ChangeTracker.DetectChanges();
        var changes = Changed();
        bool Only(EntityEntry e, params string[] names) => e.State == EntityState.Modified
            && e.Properties.Where(p => p.IsModified).All(p => names.Contains(p.Metadata.Name));
        if (changes.Any(e => !((e.Entity is XuLyPhanHoiDanhSach or DanhSachThucTapChinhThuc or ThongBao) && e.State == EntityState.Added
            || e.Entity is PhanBoThucTap && Only(e, "TenCongTyXacNhan", "DiaChiCongTyXacNhan", "MaSoThueCongTyXacNhan")
            || e.Entity is DotThucTap && Only(e, "TrangThaiDanhSachNoi") && (string?)e.Property("TrangThaiDanhSachNoi").CurrentValue == "ChinhThuc")))
            throw new RoundLockedException("Không được sửa nghiệp vụ khác cùng quyết định chỉnh sửa/chốt danh sách.");
        _savingDanhSachControl = true;
        try { await SaveChangesAsync(ct); }
        finally { _savingDanhSachControl = false; }
    }

    private async Task CheckRoundWritesAsync(CancellationToken ct)
    {
        ChangeTracker.DetectChanges();
        var changes = Changed();
        if (_savingRoundControl) return;
        if (changes.Any(x => x.Entity is ChotDotThucTap or KhongHoanTatDot or NhatKyChotDot))
            throw new RoundLockedException("Phải dùng luồng Khoa chốt/mở lại để cập nhật quyết định và lịch sử khóa đợt.");

        var byRound = new Dictionary<string, List<EntityEntry>>(StringComparer.OrdinalIgnoreCase);
        void Add(string? id, EntityEntry entry)
        {
            if (string.IsNullOrWhiteSpace(id)) return;
            if (!byRound.TryGetValue(id, out var list)) byRound[id] = list = new();
            if (!list.Contains(entry)) list.Add(entry);
        }
        IEnumerable<string> Values(EntityEntry entry, string name)
        {
            var prop = entry.Properties.FirstOrDefault(x => x.Metadata.Name == name);
            if (prop?.CurrentValue is string value) yield return value;
            if (entry.State != EntityState.Added && prop?.OriginalValue is string old) yield return old;
        }
        foreach (var entry in changes)
        {
            foreach (var id in Values(entry, entry.Entity is DotThucTap ? "MaSo" : "MaDot")) Add(id, entry);
            if (entry.Entity is ChiTietChamDiem)
                foreach (var key in Values(entry, "MaPhieu").Distinct())
                {
                    foreach (var item in ChangeTracker.Entries<PhieuChamDiem>().Where(x => x.Entity.MaPhieu == key)) Add(item.Entity.MaDot, entry);
                    foreach (var id in await PhieuChamDiems.AsNoTracking().Where(x => x.MaPhieu == key).Select(x => x.MaDot).ToListAsync(ct)) Add(id, entry);
                }
            if (entry.Entity is PhongVan or NhatKyPhongVan)
                foreach (var key in Values(entry, "MaDK").Distinct())
                    foreach (var id in await DangKyThucTaps.AsNoTracking().Where(x => x.MaDK == key).Select(x => x.MaDot).ToListAsync(ct)) Add(id, entry);
            if (entry.Entity is PhongVan && entry.State != EntityState.Added && entry.Property("MaDK").OriginalValue is null)
            {
                // Lịch cũ thiếu MaDK không được đổi sang đợt mới để sửa lịch sử của đợt đã chốt.
                var students = Values(entry, "MaSinhVien").ToArray(); var reps = Values(entry, "MaDaiDien").ToArray();
                var companies = await DaiDienDoanhNghieps.AsNoTracking().Where(x => reps.Contains(x.MaSo)).Select(x => x.MaCongTy).ToListAsync(ct);
                var rounds = await DangKyThucTaps.AsNoTracking().Where(x => students.Contains(x.MaSV) && companies.Contains(x.MaCongTy)).Select(x => x.MaDot)
                    .Union(PhanBoThucTaps.AsNoTracking().Where(x => students.Contains(x.MaSinhVien) && companies.Contains(x.MaCongTy)).Select(x => x.MaDot)).ToListAsync(ct);
                foreach (var id in rounds) Add(id, entry);
            }
            if (entry.Entity is GVHuongDan)
                foreach (var key in Values(entry, "MaSo").Distinct())
                    foreach (var id in await PhieuChamDiems.AsNoTracking().Where(x => x.MaGVHuongDan == key).Select(x => x.MaDot).ToListAsync(ct)) Add(id, entry);
            if (entry.Entity is HuongDanDoanhNghiep)
                foreach (var key in Values(entry, "MaPhanBo").Distinct())
                    foreach (var id in await PhanBoThucTaps.AsNoTracking().Where(x => x.MaPhanBo == key).Select(x => x.MaDot).ToListAsync(ct)) Add(id, entry);
            if (entry.Entity is TieuChi)
                foreach (var rubric in Values(entry, "MaRubric").Distinct())
                    foreach (var id in await DotThucTaps.AsNoTracking().Where(x => x.MaRubric == rubric).Select(x => x.MaSo).ToListAsync(ct)) Add(id, entry);
        }
        if (byRound.Count == 0) return;
        await LockRoundsAsync(byRound.Keys, ct);
        // Bản công bố/phản hồi là append-only; danh sách nguồn dừng thay đổi sau công bố.
        if (changes.Any(e => e.Entity is CongBoDanhSachThucTap or PhanHoiDanhSachThucTap or XuLyPhanHoiDanhSach or DanhSachThucTapChinhThuc && e.State != EntityState.Added))
            throw new RoundLockedException("Không được sửa/xóa bản công bố hoặc lịch sử phản hồi.");
        if (!_savingDanhSachControl && changes.Any(e => e.Entity is XuLyPhanHoiDanhSach or DanhSachThucTapChinhThuc))
            throw new RoundLockedException("Phải dùng luồng Khoa xử lý/chốt danh sách.");
        var publishedIds = byRound.Keys.ToArray();
        var publishedRounds = await DotThucTaps.AsNoTracking().Where(x => publishedIds.Contains(x.MaSo) && x.TrangThaiDanhSachNoi != "ChuaCongBo")
            .Select(x => x.MaSo).ToListAsync(ct);
        foreach (var id in publishedRounds)
        {
            var official = await DanhSachThucTapChinhThucs.AsNoTracking().AnyAsync(x => x.MaDot == id, ct)
                || await DotThucTaps.AsNoTracking().AnyAsync(x => x.MaSo == id && x.TrangThaiDanhSachNoi == "ChinhThuc", ct);
            if (official && byRound[id].Any(e => e.Entity is XuLyPhanHoiDanhSach or DanhSachThucTapChinhThuc or PhanHoiDanhSachThucTap or CongBoDanhSachThucTap))
                throw new RoundLockedException("Danh sách chính thức đã khóa; không nhận hoặc xử lý thêm yêu cầu.");
            foreach (var entry in byRound[id])
            {
                bool ChangedField(params string[] names) => entry.Properties.Any(p => p.IsModified && names.Contains(p.Metadata.Name));
                if (entry.Entity is SinhVienThamGiaDot or LanHoTroThucTap
                    || entry.Entity is PhanBoThucTap && (entry.State != EntityState.Modified
                        || ChangedField("MaSinhVien", "MaDot", "MaCongTy", "MaViTri", "DaDuocKhoaDuyet", "NgayBatDauThucTap", "NgayKetThucThucTap")
                        || ChangedField("TenCongTyXacNhan", "DiaChiCongTyXacNhan", "MaSoThueCongTyXacNhan") && (!_savingDanhSachControl || official)
                        || ChangedField("TrangThai") && (string?)entry.Property("TrangThai").CurrentValue == "Huy")
                    || entry.Entity is DotThucTap && (entry.State == EntityState.Deleted || ChangedField("ThoiGianBD", "ThoiGianKT")
                        || ChangedField("TrangThaiDanhSachNoi") && (!_savingDanhSachControl || official)))
                    throw new RoundLockedException("Danh sách nơi thực tập đã công bố/chốt. Khoa phải xử lý sai sót theo luồng phản hồi; không sửa danh sách qua nghiệp vụ khác.");
            }
        }
        foreach (var entry in changes.Where(x => x.Entity is PhanBoThucTap or DangKyThucTap or DeXuatThucTapTuTim or GVHuongDan or TienDoThucTap or SinhVienThamGiaDot))
        {
            var students = Values(entry, entry.Entity is PhanBoThucTap or GVHuongDan ? "MaSinhVien" : "MaSV").ToArray();
            var rounds = byRound.Where(x => x.Value.Contains(entry)).Select(x => x.Key).ToArray();
            if (await KhongHoanTatDots.AsNoTracking().AnyAsync(x => rounds.Contains(x.MaDot) && students.Contains(x.MaSV) && x.HieuLuc && x.TruocChotDanhSach, ct))
                throw new RoundLockedException("SV đã được xác nhận chưa có nơi. Chỉ thu hồi có căn cứ trước chốt danh sách và trước ngày bắt đầu mới tiếp tục xử lý hồ sơ.");
        }
        foreach (var entry in changes.Where(x => x.Entity is PhieuChamDiem or ChiTietChamDiem))
        {
            var students = Values(entry, "MaSV").ToHashSet(StringComparer.OrdinalIgnoreCase);
            if (entry.Entity is ChiTietChamDiem)
                foreach (var key in Values(entry, "MaPhieu").Distinct())
                {
                    foreach (var form in ChangeTracker.Entries<PhieuChamDiem>().Where(x => x.Entity.MaPhieu == key)) students.Add(form.Entity.MaSV);
                    foreach (var student in await PhieuChamDiems.AsNoTracking().Where(x => x.MaPhieu == key).Select(x => x.MaSV).ToListAsync(ct)) students.Add(student);
                }
            var affected = byRound.Where(x => x.Value.Contains(entry)).Select(x => x.Key).ToArray();
            if (await KhongHoanTatDots.AsNoTracking().AnyAsync(x => affected.Contains(x.MaDot) && students.Contains(x.MaSV) && x.HieuLuc, ct))
                throw new RoundLockedException("SV đã được Khoa xác nhận không hoàn tất đợt. Cần thu hồi xác nhận theo quy trình trước khi nhập/sửa điểm; không tự thay kết quả đã xử lý.");
        }
        var ids = byRound.Keys.ToArray();
        var states = await ChotDotThucTaps.AsNoTracking().Where(x => ids.Contains(x.MaDot)).ToListAsync(ct);
        foreach (var state in states)
        {
            var entries = byRound[state.MaDot];
            var status = LockStatus(state, RoundClock.GetUtcNow());
            if (status == "ChuaChot") continue;
            if (status != "MoLai" || entries.Any(x => !AllowedCorrection(x)))
                throw new RoundLockedException($"Đợt {state.MaDot} đã chốt/khóa. Chỉ xem hoặc xuất; sửa điểm/báo cáo cần Khoa mở lại đúng phạm vi và thời hạn.");
            if (string.IsNullOrWhiteSpace(NguoiThucHien)) throw new RoundLockedException("Không xác định được người sửa dữ liệu sau chốt.");
            NhatKyChotDots.Add(new()
            {
                MaDot = state.MaDot, PhienBan = state.PhienBan, Loai = "DieuChinh", NguoiThucHien = NguoiThucHien,
                ThoiDiem = RoundClock.GetUtcNow(), LyDo = state.LyDo,
                NoiDung = JsonSerializer.Serialize(entries.Select(e => new { Loai = e.Metadata.ClrType.Name, ThaoTac = e.State.ToString(),
                    Truoc = e.State == EntityState.Added ? null : e.OriginalValues.Properties.ToDictionary(p => p.Name, p => e.OriginalValues[p]),
                    Sau = e.State == EntityState.Deleted ? null : e.CurrentValues.Properties.ToDictionary(p => p.Name, p => e.CurrentValues[p]) }))
            });
        }
    }

    private static bool AllowedCorrection(EntityEntry entry)
    {
        if (entry.Entity is ChiTietChamDiem or PhieuChamDiem) return entry.State != EntityState.Deleted
            && (entry.State == EntityState.Added || !entry.Properties.Any(p => p.IsModified && p.Metadata.Name is "MaDot" or "MaSV" or "MaPhieu"));
        if (entry.Entity is TienDoThucTap) return entry.State == EntityState.Modified
            && !entry.Properties.Any(p => p.IsModified && p.Metadata.Name is "MaDot" or "MaSV" or "MaPhanBoLuuTru" or "MocThoiGian");
        if (entry.Entity is DotThucTap) return entry.State == EntityState.Modified && entry.Properties.Where(p => p.IsModified)
            .All(p => p.Metadata.Name is "MoChamGV" or "HanChamGV" or "HanChamDN" or "PhienBanThoiHan");
        return entry.Entity is NhatKyThoiHan && entry.State == EntityState.Added;
    }
}
