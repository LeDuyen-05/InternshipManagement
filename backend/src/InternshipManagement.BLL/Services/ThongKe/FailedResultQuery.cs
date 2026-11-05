using System.Runtime.CompilerServices;
using System.Text.Json;
using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;

[assembly: InternalsVisibleTo("InternshipManagement.WorkflowTests")]

namespace InternshipManagement.BLL.Services.ThongKe;

internal sealed class FailedReadRow
{
    public string MaSV { get; set; } = "";
    public string HoTen { get; set; } = "";
    public string? Lop { get; set; }
    public string MaDot { get; set; } = "";
    public string TenDot { get; set; } = "";
    public string NamHoc { get; set; } = "";
    public string? MaLoaiThucTap { get; set; }
    public string MaRubric { get; set; } = "";
    public string NguyenNhan { get; set; } = "";
    public decimal? TongDiem { get; set; }
    public string? LyDo { get; set; }
    public string? CanCu { get; set; }
    public string? NguoiXacNhan { get; set; }
    public DateTimeOffset? NgayXacNhan { get; set; }
    public string? TenCongTy { get; set; }
    public string NguonDuLieu { get; set; } = "";
    public string TrangThaiChot { get; set; } = "";
    public string? MaNhatKyChot { get; set; }
    public int? PhienBanChot { get; set; }

    public FailedInternshipRow ToDto() => new(MaSV, HoTen, Lop, MaDot, TenDot, NamHoc, MaLoaiThucTap, MaRubric, NguyenNhan,
        NguyenNhan == "RotDiem" ? "Rớt do điểm" : NguyenNhan == "TuChoiHoTro" ? "Rớt do từ chối hỗ trợ" : "Không hoàn tất đợt",
        TongDiem, LyDo, CanCu, NguoiXacNhan, NgayXacNhan, TenCongTy, NguonDuLieu, TrangThaiChot, MaNhatKyChot, PhienBanChot);
}

internal sealed class SnapshotHealth
{
    public string MaDot { get; set; } = "";
    public int Valid { get; set; }
}

internal static class FailedResultQuery
{
    private static IQueryable<FailedReadRow> Live(AppDbContext db, string[] roundIds, DateTimeOffset now)
    {
        var failures = db.KhongHoanTatDots.AsNoTracking().Where(f => roundIds.Contains(f.MaDot) && f.HieuLuc)
            .Select(f => new FailedReadRow {
                MaSV = f.MaSV, HoTen = db.SinhViens.Where(s => s.MaSV == f.MaSV).Select(s => s.HoTen).FirstOrDefault() ?? f.MaSV,
                Lop = db.SinhViens.Where(s => s.MaSV == f.MaSV).Select(s => s.Lop).FirstOrDefault(), MaDot = f.MaDot,
                TenDot = db.DotThucTaps.Where(d => d.MaSo == f.MaDot).Select(d => d.TenDot).First(),
                NamHoc = db.DotThucTaps.Where(d => d.MaSo == f.MaDot).Select(d => d.NamHoc).First(),
                MaLoaiThucTap = db.DotThucTaps.Where(d => d.MaSo == f.MaDot).Select(d => d.MaLoaiThucTap).FirstOrDefault(),
                MaRubric = db.DotThucTaps.Where(d => d.MaSo == f.MaDot).Select(d => d.MaRubric).First(),
                NguyenNhan = f.MaLyDo == "TuChoiHoTro" ? "TuChoiHoTro" : "KhongHoanTat", TongDiem = null,
                LyDo = f.LyDo, CanCu = f.CanCu, NguoiXacNhan = f.NguoiXacNhan, NgayXacNhan = f.NgayXacNhan,
                TenCongTy = db.PhanBoThucTaps.Where(p => p.MaDot == f.MaDot && p.MaSinhVien == f.MaSV && p.TrangThai != "Huy" && p.DaDuocKhoaDuyet)
                    .Select(p => p.CongTy.TenCongTy).FirstOrDefault(),
                NguonDuLieu = "HienHanh", TrangThaiChot = db.ChotDotThucTaps.Where(s => s.MaDot == f.MaDot)
                    .Select(s => s.TrangThai == "MoLai" && (!s.HanMoLai.HasValue || now >= s.HanMoLai) ? "ChoChotLai" : s.TrangThai).FirstOrDefault() ?? "ChuaChot",
                MaNhatKyChot = null, PhienBanChot = null
            });
        var complete = db.PhieuChamDiems.AsNoTracking().Where(p => roundIds.Contains(p.MaDot)
            && !db.KhongHoanTatDots.Any(f => f.MaDot == p.MaDot && f.MaSV == p.MaSV && f.HieuLuc)
            && db.TieuChis.Any(t => t.MaRubric == p.DotThucTap!.MaRubric && t.NhomDanhGia == "GV")
            && db.TieuChis.Any(t => t.MaRubric == p.DotThucTap!.MaRubric && t.NhomDanhGia == "DN")
            && db.TieuChis.Where(t => t.MaRubric == p.DotThucTap!.MaRubric && (t.NhomDanhGia == "GV" || t.NhomDanhGia == "DN"))
                .All(t => p.ChiTietChamDiems.Count(c => c.MaTieuChi == t.MaTieuChi) == 1
                    && p.ChiTietChamDiems.Any(c => c.MaTieuChi == t.MaTieuChi && c.DiemCham >= 0 && c.DiemCham <= t.DiemToiDa && Math.Round(c.DiemCham, 2) == c.DiemCham)))
            .Select(p => new { Form = p, Total = p.ChiTietChamDiems.Where(c => db.TieuChis.Any(t => t.MaTieuChi == c.MaTieuChi
                && t.MaRubric == p.DotThucTap!.MaRubric && (t.NhomDanhGia == "GV" || t.NhomDanhGia == "DN"))).Sum(c => c.DiemCham) })
            // Nonnegative grades: SQL ROUND and shared AwayFromZero conversion have the same 3.95 boundary.
            .Where(x => x.Total < 3.95m);
        var grades = complete.Select(x => new FailedReadRow {
            MaSV = x.Form.MaSV, HoTen = x.Form.SinhVien!.HoTen, Lop = x.Form.SinhVien.Lop, MaDot = x.Form.MaDot,
            TenDot = x.Form.DotThucTap!.TenDot, NamHoc = x.Form.DotThucTap.NamHoc, MaLoaiThucTap = x.Form.DotThucTap.MaLoaiThucTap,
            MaRubric = x.Form.DotThucTap.MaRubric, NguyenNhan = "RotDiem", TongDiem = x.Total,
            LyDo = null, CanCu = null, NguoiXacNhan = null, NgayXacNhan = null,
            TenCongTy = db.PhanBoThucTaps.Where(p => p.MaDot == x.Form.MaDot && p.MaSinhVien == x.Form.MaSV && p.TrangThai != "Huy" && p.DaDuocKhoaDuyet)
                .Select(p => p.CongTy.TenCongTy).FirstOrDefault(),
            NguonDuLieu = "HienHanh", TrangThaiChot = db.ChotDotThucTaps.Where(s => s.MaDot == x.Form.MaDot)
                .Select(s => s.TrangThai == "MoLai" && (!s.HanMoLai.HasValue || now >= s.HanMoLai) ? "ChoChotLai" : s.TrangThai).FirstOrDefault() ?? "ChuaChot",
            MaNhatKyChot = null, PhienBanChot = null
        });
        return failures.Concat(grades);
    }

    internal static IQueryable<FailedReadRow> Archive(AppDbContext db, string[] roundIds, DateTimeOffset now)
    {
        var ids = JsonSerializer.Serialize(roundIds);
        return db.Database.SqlQuery<FailedReadRow>($"""
            SELECT r.MaSV, r.HoTen, r.Lop, n.MaDot, JSON_VALUE(n.NoiDung,'$.Dot.TenDot') AS TenDot,
                JSON_VALUE(n.NoiDung,'$.Dot.NamHoc') AS NamHoc, JSON_VALUE(n.NoiDung,'$.Dot.MaLoaiThucTap') AS MaLoaiThucTap,
                JSON_VALUE(n.NoiDung,'$.Dot.MaRubric') AS MaRubric,
                CASE WHEN r.KhongHoanTat=1 THEN CASE WHEN f.MaLyDo=N'TuChoiHoTro' THEN N'TuChoiHoTro' ELSE N'KhongHoanTat' END ELSE N'RotDiem' END AS NguyenNhan,
                CASE WHEN r.KhongHoanTat=0 THEN r.TongDiem ELSE NULL END AS TongDiem,
                COALESCE(f.LyDo,r.LyDoKhongHoanTat) AS LyDo, COALESCE(f.CanCu,r.CanCuKhongHoanTat) AS CanCu,
                f.NguoiXacNhan, f.NgayXacNhan, p.TenCongTy, N'BanChot' AS NguonDuLieu,
                COALESCE(CASE WHEN s.TrangThai=N'MoLai' AND (s.HanMoLai IS NULL OR s.HanMoLai<={now}) THEN N'ChoChotLai' ELSE s.TrangThai END,N'ChuaChot') AS TrangThaiChot,
                n.MaNhatKy AS MaNhatKyChot, n.PhienBan AS PhienBanChot
            FROM NHATKYCHOTDOT n LEFT JOIN CHOTDOTTHUCTAP s ON s.MaDot=n.MaDot
            CROSS APPLY OPENJSON(n.NoiDung,'$.SinhViens') WITH (
                MaSV nvarchar(20), HoTen nvarchar(100), Lop nvarchar(50), KhongHoanTat bit, DuDiem bit, KetQua nvarchar(100),
                TongDiem decimal(18,2), LyDoKhongHoanTat nvarchar(1000), CanCuKhongHoanTat nvarchar(1000)) r
            OUTER APPLY (SELECT TOP(1) f0.* FROM OPENJSON(n.NoiDung,'$.KhongHoanTat') WITH (
                MaSV nvarchar(20), HieuLuc bit, MaLyDo nvarchar(30), LyDo nvarchar(1000), CanCu nvarchar(1000),
                NguoiXacNhan nvarchar(20), NgayXacNhan datetimeoffset) f0 WHERE f0.MaSV=r.MaSV AND f0.HieuLuc=1) f
            OUTER APPLY (SELECT TOP(1) JSON_VALUE(p0.CongTy,'$.TenCongTy') AS TenCongTy FROM OPENJSON(n.NoiDung,'$.PhanBo') WITH (
                MaSinhVien nvarchar(20), TrangThai nvarchar(30), DaDuocKhoaDuyet bit, CongTy nvarchar(max) AS JSON) p0
                WHERE p0.MaSinhVien=r.MaSV AND p0.TrangThai<>N'Huy' AND p0.DaDuocKhoaDuyet=1) p
            WHERE n.Loai=N'Chot' AND n.MaDot IN (SELECT value FROM OPENJSON({ids}))
                AND NOT EXISTS(SELECT 1 FROM NHATKYCHOTDOT newer WHERE newer.MaDot=n.MaDot AND newer.Loai=N'Chot' AND newer.PhienBan>n.PhienBan)
                AND (r.KhongHoanTat=1 OR r.DuDiem=1 AND r.KetQua=N'Không đạt')
            """).Select(x => new FailedReadRow {
                MaSV = x.MaSV, HoTen = x.HoTen, Lop = x.Lop, MaDot = x.MaDot, TenDot = x.TenDot, NamHoc = x.NamHoc,
                MaLoaiThucTap = x.MaLoaiThucTap, MaRubric = x.MaRubric, NguyenNhan = x.NguyenNhan, TongDiem = x.TongDiem,
                LyDo = x.LyDo, CanCu = x.CanCu, NguoiXacNhan = x.NguoiXacNhan, NgayXacNhan = x.NgayXacNhan,
                TenCongTy = x.TenCongTy, NguonDuLieu = x.NguonDuLieu, TrangThaiChot = x.TrangThaiChot,
                MaNhatKyChot = x.MaNhatKyChot, PhienBanChot = x.PhienBanChot
            });
    }

    internal static IQueryable<FailedReadRow> Build(AppDbContext db, string[] live, string[] archive, DateTimeOffset now, FailedInternshipQuery filter, string? student = null)
    {
        var query = Live(db, live, now);
        if (archive.Length > 0) query = query.Concat(Archive(db, archive, now));
        if (student != null) query = query.Where(x => x.MaSV == student);
        if (filter.NamHoc != null) query = query.Where(x => x.NamHoc == filter.NamHoc);
        if (filter.MaLoaiThucTap != null) query = query.Where(x => x.MaLoaiThucTap == filter.MaLoaiThucTap);
        if (filter.Lop != null) query = query.Where(x => x.Lop == filter.Lop);
        if (filter.NguyenNhan != null) query = query.Where(x => x.NguyenNhan == filter.NguyenNhan);
        if (!string.IsNullOrWhiteSpace(filter.Search)) {
            var keyword = filter.Search.Trim().ToLower();
            query = query.Where(x => x.MaSV.ToLower().Contains(keyword) || x.HoTen.ToLower().Contains(keyword));
        }
        return query;
    }
}
