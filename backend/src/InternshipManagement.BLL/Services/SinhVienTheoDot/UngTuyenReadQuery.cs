using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.SinhVienTheoDot;

internal sealed class UngTuyenReadRow
{
    public string MaSV { get; set; } = "";
    public string TinhTrangNoi { get; set; } = "";
    public int ChoKetQua { get; set; }
    public bool CoUngTuyenDat { get; set; }
    public bool CanHoTro { get; set; }
}

// Scalar projection: filter/count/page in SQL; hydrate histories only for the selected students.
internal static class UngTuyenReadQuery
{
    internal static IQueryable<UngTuyenReadRow> Build(AppDbContext db, IQueryable<string> ids, UngTuyenHoTroQuery filter)
    {
        var round = filter.MaDot;
        var students = db.SinhViens.AsNoTracking().Where(s => ids.Contains(s.MaSV));
        if (!string.IsNullOrWhiteSpace(filter.Search)) {
            var search = filter.Search.Trim().ToLower();
            students = students.Where(s => s.MaSV.ToLower().Contains(search) || s.HoTen.ToLower().Contains(search));
        }
        if (!string.IsNullOrWhiteSpace(filter.Lop)) students = students.Where(s => s.Lop == filter.Lop);
        var attempts = db.DangKyThucTaps.Where(a => a.MaDot == round).Select(a => new {
            App = a, Latest = db.PhongVans.Where(p => p.MaDK == a.MaDK && !db.PhongVans.Any(n => n.MaPVTruoc == p.MaPV))
                .OrderByDescending(p => p.NgayPV).ThenByDescending(p => p.MaPV).Select(p => p.KetQua).FirstOrDefault()
        }).Select(x => new { x.App.MaSV, Result = x.App.TrangThai == "TuChoi" && x.App.MaPVKetThuc == null
            ? x.App.KetQuaHoSo == "KhongDat" ? "KhongDat" : "DaKetThuc"
            : x.Latest == "Dat" || x.Latest == "KhongDat" || x.Latest == "Vang" ? x.Latest
            : x.App.TrangThai == "ChoDuyet" || x.App.TrangThai == "DaDuyet" ? "ChuaCoKetQua" : "DaKetThuc" });
        if (filter.KetQua != null) students = students.Where(s => attempts.Any(a => a.MaSV == s.MaSV && a.Result == filter.KetQua));
        var flags = students.Select(s => new {
            s.MaSV,
            Active = db.PhanBoThucTaps.Count(p => p.MaDot == round && p.MaSinhVien == s.MaSV && p.TrangThai != "Huy"),
            Official = db.PhanBoThucTaps.Any(p => p.MaDot == round && p.MaSinhVien == s.MaSV && p.DaDuocKhoaDuyet
                && (p.TrangThai == "ChuaNhanViec" || p.TrangThai == "DangThucTap" || p.TrangThai == "HoanThanh")),
            Awaiting = db.PhanBoThucTaps.Any(p => p.MaDot == round && p.MaSinhVien == s.MaSV
                && (p.TrangThai == "ChuaNhanViec" || !p.DaDuocKhoaDuyet && p.TrangThai == "ChoKhoaDuyet")),
            Failed = db.KhongHoanTatDots.Any(f => f.MaDot == round && f.MaSV == s.MaSV && f.HieuLuc),
            PendingSelf = db.DeXuatThucTapTuTims.Any(x => x.MaDot == round && x.MaSV == s.MaSV && x.TrangThai == "ChoDuyet"),
            ApprovedSelf = db.DeXuatThucTapTuTims.Any(x => x.MaDot == round && x.MaSV == s.MaSV && x.TrangThai == "DaDuyet"),
            Cancelled = db.PhanBoThucTaps.Any(x => x.MaDot == round && x.MaSinhVien == s.MaSV && x.TrangThai == "Huy"),
            HasApps = db.DangKyThucTaps.Any(x => x.MaDot == round && x.MaSV == s.MaSV),
            HasSelf = db.DeXuatThucTapTuTims.Any(x => x.MaDot == round && x.MaSV == s.MaSV),
            Orphan = db.GVHuongDans.Any(x => x.MaDot == round && x.MaSinhVien == s.MaSV)
                || db.TienDoThucTaps.Any(x => x.MaDot == round && x.MaSV == s.MaSV)
                || db.PhieuChamDiems.Any(x => x.MaDot == round && x.MaSV == s.MaSV)
                || db.KhongHoanTatDots.Any(x => x.MaDot == round && x.MaSV == s.MaSV),
            Waiting = attempts.Count(a => a.MaSV == s.MaSV && a.Result == "ChuaCoKetQua"),
            Accepted = attempts.Any(a => a.MaSV == s.MaSV && a.Result == "Dat")
        });
        var places = flags.Select(x => new {
            x.MaSV, x.Waiting, x.Accepted,
            Place = x.Active == 1 && x.Official ? "DaCoNoi" : x.Failed ? "KhongHoanTat"
                : x.Active == 1 && x.Awaiting || x.Active == 0 && x.PendingSelf ? "ChoXacNhan"
                : x.Active > 0 || x.Cancelled || x.ApprovedSelf || !x.HasApps && !x.HasSelf && x.Orphan ? "CanKiemTra" : "ChuaCoNoi"
        });
        var result = places.Select(x => new UngTuyenReadRow { MaSV = x.MaSV, TinhTrangNoi = x.Place, ChoKetQua = x.Waiting,
            CoUngTuyenDat = x.Accepted, CanHoTro = x.Place == "ChuaCoNoi" && x.Waiting == 0 && !x.Accepted });
        if (filter.TinhTrangNoi != null) result = result.Where(x => x.TinhTrangNoi == filter.TinhTrangNoi);
        if (filter.CanHoTro.HasValue) result = result.Where(x => x.CanHoTro == filter.CanHoTro.Value);
        return result;
    }
}
