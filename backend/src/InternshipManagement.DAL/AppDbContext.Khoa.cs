using System.Linq.Expressions;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace InternshipManagement.DAL;

// Nhiều khoa dùng chung một hệ thống: mỗi truy vấn tự lọc theo khoa của người đang thao tác,
// nên service/controller không phải tự thêm điều kiện khoa (và không thể quên thêm).
public partial class AppDbContext
{
    /// <summary>Khoa của người đang thao tác; null = không giới hạn. EF đọc lại giá trị này ở mỗi truy vấn.</summary>
    public string? PhamViKhoaHienTai => _khoaScope?.MaKhoa;

    // Các bảng gắn với một đợt: thuộc khoa của đợt đó.
    private static readonly Type[] BangTheoDot =
    {
        typeof(SinhVienThamGiaDot), typeof(LanHoTroThucTap), typeof(NhapDanhSachDot), typeof(CongBoDanhSachThucTap),
        typeof(PhanHoiDanhSachThucTap), typeof(XuLyPhanHoiDanhSach), typeof(DanhSachThucTapChinhThuc), typeof(ChotDotThucTap),
        typeof(KhongHoanTatDot), typeof(NhatKyChotDot), typeof(ViTriTheoDot), typeof(CongTyTheoDot), typeof(NhatKyThoiHan),
        typeof(DangKyThucTap), typeof(PhanBoThucTap), typeof(NhatKyDieuChinhThucTap), typeof(PhieuChamDiem),
        typeof(TienDoThucTap), typeof(DeXuatThucTapTuTim)
    };

    private void CauHinhKhoa(ModelBuilder b)
    {
        b.Entity<Khoa>(e =>
        {
            e.ToTable("KHOA"); e.HasKey(x => x.MaKhoa);
            e.Property(x => x.MaKhoa).HasMaxLength(20); e.Property(x => x.TenKhoa).HasMaxLength(200).IsRequired();
            e.HasIndex(x => x.TenKhoa).IsUnique();
        });
        b.Entity<SinhVien>().Property(x => x.MaKhoa).HasMaxLength(20);
        b.Entity<GiangVien>().Property(x => x.MaKhoa).HasMaxLength(20);
        b.Entity<DotThucTap>().Property(x => x.MaKhoa).HasMaxLength(20);
        b.Entity<BoTieuChi>().Property(x => x.MaKhoa).HasMaxLength(20);
        b.Entity<ThongBao>().Property(x => x.MaKhoa).HasMaxLength(20);
        b.Entity<TaiKhoan>().Property(x => x.MaKhoa).HasMaxLength(20);
        b.Entity<SinhVien>().HasOne<Khoa>().WithMany().HasForeignKey(x => x.MaKhoa).OnDelete(DeleteBehavior.Restrict);
        b.Entity<GiangVien>().HasOne<Khoa>().WithMany().HasForeignKey(x => x.MaKhoa).OnDelete(DeleteBehavior.Restrict);
        b.Entity<DotThucTap>().HasOne<Khoa>().WithMany().HasForeignKey(x => x.MaKhoa).OnDelete(DeleteBehavior.Restrict);
        b.Entity<BoTieuChi>().HasOne<Khoa>().WithMany().HasForeignKey(x => x.MaKhoa).OnDelete(DeleteBehavior.Restrict);
        b.Entity<ThongBao>().HasOne<Khoa>().WithMany().HasForeignKey(x => x.MaKhoa).OnDelete(DeleteBehavior.Restrict);
        b.Entity<TaiKhoan>().HasOne<Khoa>().WithMany().HasForeignKey(x => x.MaKhoa).OnDelete(DeleteBehavior.Restrict);

        // Dữ liệu sở hữu trực tiếp.
        b.Entity<SinhVien>().HasQueryFilter(x => PhamViKhoaHienTai == null || x.MaKhoa == PhamViKhoaHienTai);
        b.Entity<GiangVien>().HasQueryFilter(x => PhamViKhoaHienTai == null || x.MaKhoa == PhamViKhoaHienTai);
        b.Entity<DotThucTap>().HasQueryFilter(x => PhamViKhoaHienTai == null || x.MaKhoa == PhamViKhoaHienTai);
        b.Entity<BoTieuChi>().HasQueryFilter(x => PhamViKhoaHienTai == null || x.MaKhoa == PhamViKhoaHienTai);
        // Thông báo không có khoa là thông báo toàn trường.
        b.Entity<ThongBao>().HasQueryFilter(x => PhamViKhoaHienTai == null || x.MaKhoa == null || x.MaKhoa == PhamViKhoaHienTai);

        // Dữ liệu suy ra từ đợt, sinh viên, giảng viên hoặc bộ tiêu chí.
        foreach (var type in BangTheoDot)
        {
            Expression<Func<string?, bool>> trongKhoa = maDot => PhamViKhoaHienTai == null
                || DotThucTaps.Any(d => d.MaSo == maDot && d.MaKhoa == PhamViKhoaHienTai);
            var x = Expression.Parameter(type, "x");
            var body = new ThayThamSo(trongKhoa.Parameters[0], Expression.Property(x, "MaDot")).Visit(trongKhoa.Body)!;
            b.Entity(type).HasQueryFilter(Expression.Lambda(body, x));
        }
        // Phân công cũ có thể chưa ghi mã đợt: khi đó xét khoa của sinh viên.
        b.Entity<GVHuongDan>().HasQueryFilter(x => PhamViKhoaHienTai == null
            || x.MaDot != null && DotThucTaps.Any(d => d.MaSo == x.MaDot && d.MaKhoa == PhamViKhoaHienTai)
            || x.MaDot == null && SinhViens.Any(s => s.MaSV == x.MaSinhVien && s.MaKhoa == PhamViKhoaHienTai));
        b.Entity<HoSoNangLuc>().HasQueryFilter(x => PhamViKhoaHienTai == null
            || SinhViens.Any(s => s.MaSV == x.MaSV && s.MaKhoa == PhamViKhoaHienTai));
        b.Entity<PhongVan>().HasQueryFilter(x => PhamViKhoaHienTai == null
            || SinhViens.Any(s => s.MaSV == x.MaSinhVien && s.MaKhoa == PhamViKhoaHienTai));
        b.Entity<GioiThieu>().HasQueryFilter(x => PhamViKhoaHienTai == null
            || GiangViens.Any(g => g.MaGV == x.MaGV && g.MaKhoa == PhamViKhoaHienTai));
        b.Entity<TieuChi>().HasQueryFilter(x => PhamViKhoaHienTai == null
            || BoTieuChis.Any(r => r.MaRubric == x.MaRubric && r.MaKhoa == PhamViKhoaHienTai));
    }

    private sealed class ThayThamSo(ParameterExpression from, Expression to) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node) => node == from ? to : base.VisitParameter(node);
    }

    private static string TenLoai(EntityEntry e) => e.Entity switch
    {
        SinhVien => "sinh viên", GiangVien => "giảng viên", DotThucTap => "đợt thực tập",
        BoTieuChi => "bộ tiêu chí", TaiKhoan => "tài khoản cán bộ Khoa", _ => "dữ liệu"
    };

    // Gán khoa cho bản ghi mới, chặn sửa/xóa dữ liệu khoa khác và giữ SV/GV trong đợt của đúng khoa mình.
    private async Task KiemTraKhoaAsync(CancellationToken ct)
    {
        ChangeTracker.DetectChanges();
        var scope = PhamViKhoaHienTai;
        var entries = ChangeTracker.Entries()
            .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted
                && e.Entity is SinhVien or GiangVien or DotThucTap or BoTieuChi or ThongBao or TaiKhoan)
            .ToList();
        string? macDinh = null;
        var daTimMacDinh = false;
        foreach (var e in entries)
        {
            var prop = e.Property(nameof(SinhVien.MaKhoa));
            var current = (string?)prop.CurrentValue;
            if (e.State == EntityState.Added)
            {
                if (e.Entity is TaiKhoan { MaVaiTro: not "VT02" }) continue;
                if (!string.IsNullOrWhiteSpace(current))
                {
                    if (scope != null && current != scope)
                        throw new UnauthorizedAccessException("Bạn chỉ tạo được dữ liệu cho khoa của mình.");
                    continue;
                }
                if (e.Entity is ThongBao && scope == null) continue; // QTV gửi thông báo toàn trường
                if (scope == PhamViKhoa.KhongCoKhoa)
                    throw new UnauthorizedAccessException("Tài khoản chưa được gắn khoa nên không tạo được dữ liệu. Liên hệ Quản trị viên.");
                if (scope != null) { prop.CurrentValue = scope; continue; }
                if (!daTimMacDinh) { macDinh = await KhoaMacDinhAsync(ct); daTimMacDinh = true; }
                if (macDinh == KhoaChuaKhoiTao) continue; // CSDL chưa có danh mục khoa: giữ cách làm một khoa như trước
                prop.CurrentValue = macDinh ?? throw new InvalidOperationException($"Hệ thống có nhiều khoa: cần chọn khoa quản lý cho {TenLoai(e)}.");
                continue;
            }
            if (scope == null) continue;
            var original = (string?)prop.OriginalValue;
            var doiKhoa = prop.IsModified && current != original;
            // Tài khoản (đổi mật khẩu, hồ sơ cá nhân) không gắn khoa trực tiếp: chỉ chặn việc tự đổi khoa.
            if (doiKhoa || e.Entity is not TaiKhoan && original != scope)
                throw new UnauthorizedAccessException("Bạn chỉ thao tác được dữ liệu của khoa mình và không chuyển dữ liệu sang khoa khác.");
        }

        if (scope != null) await ChanTrungMaKhoaKhacAsync(entries, scope, ct);
        await KiemTraCungKhoaAsync(ct);
    }

    private const string KhoaChuaKhoiTao = "\0";

    private async Task<string?> KhoaMacDinhAsync(CancellationToken ct)
    {
        var ds = await Khoas.AsNoTracking().Where(k => k.HoatDong).Select(k => k.MaKhoa).Take(2).ToListAsync(ct);
        if (ds.Count == 1) return ds[0];
        if (ds.Count == 0 && !await Khoas.AnyAsync(ct)) return KhoaChuaKhoiTao;
        return null;
    }

    // Mã SV/GV/đợt/bộ tiêu chí là khóa toàn trường: báo rõ khi mã đã thuộc khoa khác (bộ lọc khiến khoa này không thấy).
    private async Task ChanTrungMaKhoaKhacAsync(List<EntityEntry> entries, string scope, CancellationToken ct)
    {
        var added = entries.Where(e => e.State == EntityState.Added).Select(e => e.Entity).ToList();
        async Task Check<T>(Func<T, string> key, Func<IQueryable<T>, List<string>, IQueryable<string>> query, string ten) where T : class
        {
            var ids = added.OfType<T>().Select(key).Distinct().ToList();
            if (ids.Count == 0) return;
            var trung = await query(Set<T>().IgnoreQueryFilters().AsNoTracking(), ids).FirstOrDefaultAsync(ct);
            if (trung != null) throw new InvalidOperationException($"Mã {ten} {trung} đã thuộc khoa khác trong hệ thống. Liên hệ Quản trị viên nếu cần chuyển khoa.");
        }
        await Check<SinhVien>(x => x.MaSV, (q, ids) => q.Where(x => ids.Contains(x.MaSV) && x.MaKhoa != scope).Select(x => x.MaSV), "sinh viên");
        await Check<GiangVien>(x => x.MaGV, (q, ids) => q.Where(x => ids.Contains(x.MaGV) && x.MaKhoa != scope).Select(x => x.MaGV), "giảng viên");
        await Check<DotThucTap>(x => x.MaSo, (q, ids) => q.Where(x => ids.Contains(x.MaSo) && x.MaKhoa != scope).Select(x => x.MaSo), "đợt");
        await Check<BoTieuChi>(x => x.MaRubric, (q, ids) => q.Where(x => ids.Contains(x.MaRubric) && x.MaKhoa != scope).Select(x => x.MaRubric), "bộ tiêu chí");
    }

    // SV vào đợt và GV hướng dẫn phải cùng khoa với đợt (kể cả khi QTV thao tác, vì QTV không bị lọc).
    private async Task KiemTraCungKhoaAsync(CancellationToken ct)
    {
        var members = ChangeTracker.Entries<SinhVienThamGiaDot>().Where(e => e.State == EntityState.Added)
            .Select(e => (Dot: (string?)e.Entity.MaDot, Sv: (string?)e.Entity.MaSV, Gv: (string?)null))
            .Concat(ChangeTracker.Entries<GVHuongDan>().Where(e => e.State == EntityState.Added || e.State == EntityState.Modified
                    && e.Properties.Any(p => p.IsModified && p.Metadata.Name is nameof(GVHuongDan.MaDot) or nameof(GVHuongDan.MaGiangVien) or nameof(GVHuongDan.MaSinhVien)))
                .Select(e => (Dot: e.Entity.MaDot, Sv: (string?)e.Entity.MaSinhVien, Gv: (string?)e.Entity.MaGiangVien)))
            .Where(x => x.Dot != null).ToList();
        if (members.Count == 0) return;
        var dotIds = members.Select(x => x.Dot!).Distinct().ToList();
        var svIds = members.Where(x => x.Sv != null).Select(x => x.Sv!).Distinct().ToList();
        var gvIds = members.Where(x => x.Gv != null).Select(x => x.Gv!).Distinct().ToList();
        var dots = await DotThucTaps.IgnoreQueryFilters().AsNoTracking().Where(x => dotIds.Contains(x.MaSo))
            .Select(x => new { x.MaSo, x.MaKhoa }).ToDictionaryAsync(x => x.MaSo, x => x.MaKhoa, StringComparer.OrdinalIgnoreCase, ct);
        var svs = svIds.Count == 0 ? new Dictionary<string, string?>() : await SinhViens.IgnoreQueryFilters().AsNoTracking()
            .Where(x => svIds.Contains(x.MaSV)).Select(x => new { x.MaSV, x.MaKhoa }).ToDictionaryAsync(x => x.MaSV, x => x.MaKhoa, StringComparer.OrdinalIgnoreCase, ct);
        var gvs = gvIds.Count == 0 ? new Dictionary<string, string?>() : await GiangViens.IgnoreQueryFilters().AsNoTracking()
            .Where(x => gvIds.Contains(x.MaGV)).Select(x => new { x.MaGV, x.MaKhoa }).ToDictionaryAsync(x => x.MaGV, x => x.MaKhoa, StringComparer.OrdinalIgnoreCase, ct);
        foreach (var m in members)
        {
            if (!dots.TryGetValue(m.Dot!, out var khoaDot) || khoaDot == null) continue;
            if (m.Sv != null && svs.TryGetValue(m.Sv, out var khoaSv) && khoaSv != null && khoaSv != khoaDot)
                throw new InvalidOperationException($"Sinh viên {m.Sv} thuộc khoa khác với đợt {m.Dot}; chỉ thêm sinh viên của khoa tổ chức đợt.");
            if (m.Gv != null && gvs.TryGetValue(m.Gv, out var khoaGv) && khoaGv != null && khoaGv != khoaDot)
                throw new InvalidOperationException($"Giảng viên {m.Gv} thuộc khoa khác với đợt {m.Dot}; chỉ phân công giảng viên của khoa tổ chức đợt.");
        }
    }
}
