using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.SinhVienTheoDot;

internal sealed class RosterReadRow
{
    public string MaSV { get; set; } = "";
    public string HoTen { get; set; } = "";
    public string? Lop { get; set; }
    public string? TenCongTy { get; set; }
    public string TrangThai { get; set; } = "";
    public bool TuDanhSachKhoa { get; set; }
    public bool CoPhanBoChinhThuc { get; set; }
    public bool CanHoTro { get; set; }
}

// Keep the same precedence as Classify; only selected page keys are hydrated with histories.
internal static class RosterReadQuery
{
    internal static IQueryable<RosterReadRow> Build(AppDbContext db, IQueryable<string> ids, DotThucTap round, DateTime today)
    {
        var maDot = round.MaSo;
        var roundStart = round.ThoiGianBD.Date;
        var roundEnd = round.ThoiGianKT.Date;
        var validRoundPeriod = roundStart != default && roundEnd >= roundStart;
        var placements = db.PhanBoThucTaps.Where(x => x.MaDot == maDot).GroupBy(x => x.MaSinhVien)
            .Select(g => new { MaSV = g.Key, Active = g.Count(x => x.TrangThai != "Huy"), Cancelled = g.Count(x => x.TrangThai == "Huy") });
        var singleActive = from p in db.PhanBoThucTaps
            join stats in placements on p.MaSinhVien equals stats.MaSV
            where p.MaDot == maDot && p.TrangThai != "Huy" && stats.Active == 1
            select p;
        var applications = db.DangKyThucTaps.Where(x => x.MaDot == maDot).GroupBy(x => x.MaSV)
            .Select(g => new { MaSV = g.Key, Count = g.Count(), Pending = g.Count(x => x.TrangThai == "ChoDuyet" || x.TrangThai == "DaDuyet") });
        var self = db.DeXuatThucTapTuTims.Where(x => x.MaDot == maDot).GroupBy(x => x.MaSV)
            .Select(g => new { MaSV = g.Key, Count = g.Count(), Pending = g.Count(x => x.TrangThai == "ChoDuyet"), Approved = g.Count(x => x.TrangThai == "DaDuyet") });
        var failed = db.KhongHoanTatDots.Where(x => x.MaDot == maDot && x.HieuLuc).Select(x => x.MaSV).Distinct();
        var orphans = db.GVHuongDans.Where(x => x.MaDot == maDot).Select(x => x.MaSinhVien)
            .Union(db.TienDoThucTaps.Where(x => x.MaDot == maDot).Select(x => x.MaSV))
            .Union(db.PhieuChamDiems.Where(x => x.MaDot == maDot).Select(x => x.MaSV))
            .Union(db.KhongHoanTatDots.Where(x => x.MaDot == maDot).Select(x => x.MaSV));
        var flags = from s in db.SinhViens.AsNoTracking().Where(s => ids.Contains(s.MaSV))
            join m in db.SinhVienThamGiaDots.Where(x => x.MaDot == maDot && x.DangThamGia) on s.MaSV equals m.MaSV into manuals
            from m in manuals.DefaultIfEmpty()
            join p in placements on s.MaSV equals p.MaSV into placementStats
            from p in placementStats.DefaultIfEmpty()
            join pb in singleActive on s.MaSV equals pb.MaSinhVien into activePlacements
            from pb in activePlacements.DefaultIfEmpty()
            join a in applications on s.MaSV equals a.MaSV into appStats
            from a in appStats.DefaultIfEmpty()
            join t in self on s.MaSV equals t.MaSV into selfStats
            from t in selfStats.DefaultIfEmpty()
            join f in failed on s.MaSV equals f into failures
            from f in failures.DefaultIfEmpty()
            join o in orphans on s.MaSV equals o into orphanIds
            from o in orphanIds.DefaultIfEmpty()
            select new {
                s.MaSV, s.HoTen, s.Lop, Manual = m != null, Pb = pb,
                Active = p.MaSV == null ? 0 : p.Active, Cancelled = p.MaSV != null && p.Cancelled > 0,
                Failed = f != null, Orphan = o != null,
                PendingSelf = t.MaSV != null && t.Pending > 0, ApprovedSelf = t.MaSV != null && t.Approved > 0, HasSelf = t.MaSV != null && t.Count > 0,
                PendingApps = a.MaSV != null && a.Pending > 0, HasApps = a.MaSV != null && a.Count > 0,
                SelfName = db.DeXuatThucTapTuTims.Where(x => x.MaDot == maDot && x.MaSV == s.MaSV && x.TrangThai == "ChoDuyet")
                    .OrderByDescending(x => x.NgayGui).ThenByDescending(x => x.MaHoSo).Select(x => x.TenCongTy).FirstOrDefault()
            };
        var periods = flags.Select(x => new {
            Flags = x,
            Start = x.Pb == null ? null : x.Pb.NgayBatDauThucTap.HasValue || x.Pb.NgayKetThucThucTap.HasValue
                ? x.Pb.NgayBatDauThucTap : x.Pb.DaDuocKhoaDuyet && x.Pb.HoSoTuTim != null && x.Pb.HoSoTuTim.TrangThai == "DaDuyet"
                ? (DateTime?)x.Pb.HoSoTuTim.NgayBatDau : x.Pb.DaDuocKhoaDuyet && validRoundPeriod ? roundStart : (DateTime?)null,
            End = x.Pb == null ? null : x.Pb.NgayBatDauThucTap.HasValue || x.Pb.NgayKetThucThucTap.HasValue
                ? x.Pb.NgayKetThucThucTap : x.Pb.DaDuocKhoaDuyet && x.Pb.HoSoTuTim != null && x.Pb.HoSoTuTim.TrangThai == "DaDuyet"
                ? (DateTime?)x.Pb.HoSoTuTim.NgayKetThuc : x.Pb.DaDuocKhoaDuyet && validRoundPeriod ? roundEnd : (DateTime?)null
        });
        var classified = periods.Select(x => new {
            x.Flags.MaSV, x.Flags.HoTen, x.Flags.Lop, x.Flags.Manual,
            Company = x.Flags.Active == 1 && x.Flags.Pb != null ? x.Flags.Pb.TenCongTyXacNhan ?? x.Flags.Pb.CongTy.TenCongTy
                : x.Flags.Active == 0 && x.Flags.PendingSelf ? x.Flags.SelfName : null,
            Official = x.Flags.Active == 1 && x.Flags.Pb != null && x.Flags.Pb.DaDuocKhoaDuyet
                && (x.Flags.Pb.TrangThai == "ChuaNhanViec" || x.Flags.Pb.TrangThai == "DangThucTap" || x.Flags.Pb.TrangThai == "HoanThanh"),
            Status = x.Flags.Failed ? "KhongHoanTat" : x.Flags.Active > 1 ? "CanKiemTra"
                : x.Flags.Pb != null ? x.Flags.Pb.TrangThai == "ChuaNhanViec" ? "ChoSVXacNhan"
                    : !x.Flags.Pb.DaDuocKhoaDuyet && x.Flags.Pb.TrangThai == "ChoKhoaDuyet" ? "ChoKhoaChot"
                    : x.Flags.Pb.DaDuocKhoaDuyet && x.Flags.Pb.TrangThai == "HoanThanh" ? "HoanThanh"
                    : x.Flags.Pb.DaDuocKhoaDuyet && x.Flags.Pb.TrangThai == "DangThucTap"
                        ? !x.Start.HasValue || !x.End.HasValue ? "ChuaXacMinhThoiGian"
                            : x.Start.Value == default || x.End.Value.Date < x.Start.Value.Date ? "CanKiemTra"
                            : today < x.Start.Value.Date ? "ChuaBatDau" : today > x.End.Value.Date ? "ChoHoanTat" : "DangThucTap"
                        : "CanKiemTra"
                : x.Flags.PendingSelf ? "ChoCongNhan" : x.Flags.Cancelled ? "CanXuLyLai"
                : x.Flags.ApprovedSelf ? "CanKiemTra" : x.Flags.PendingApps ? "DangUngTuyen"
                : x.Flags.HasApps || x.Flags.HasSelf ? "ChuaCoNoiTiepNhan" : x.Flags.Orphan ? "CanKiemTra" : "ChuaDangKy"
        });
        return classified.Select(x => new RosterReadRow {
            MaSV = x.MaSV, HoTen = x.HoTen, Lop = x.Lop, TenCongTy = x.Company, TuDanhSachKhoa = x.Manual,
            CoPhanBoChinhThuc = x.Official, TrangThai = x.Status,
            CanHoTro = x.Status == "ChuaDangKy" || x.Status == "ChuaCoNoiTiepNhan" || x.Status == "CanXuLyLai" || x.Status == "CanKiemTra"
        });
    }
}
