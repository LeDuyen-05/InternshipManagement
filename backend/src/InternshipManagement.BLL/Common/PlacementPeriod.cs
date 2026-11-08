using InternshipManagement.DAL.Entities;

namespace InternshipManagement.BLL.Common;

public static class PlacementPeriod
{
    public static (DateTime? Start, DateTime? End, string Source) Resolve(PhanBoThucTap placement, DotThucTap? round = null)
    {
        if (placement.NgayBatDauThucTap.HasValue || placement.NgayKetThucThucTap.HasValue)
            return (placement.NgayBatDauThucTap?.Date, placement.NgayKetThucThucTap?.Date, "KhoaXacMinh");
        if (placement.DaDuocKhoaDuyet && placement.HoSoTuTim?.TrangThai == "DaDuyet")
            return (placement.HoSoTuTim.NgayBatDau.Date, placement.HoSoTuTim.NgayKetThuc.Date, "HoSoDaCongNhan");
        var dot = round ?? placement.DotThucTap;
        if (placement.DaDuocKhoaDuyet && dot != null && dot.ThoiGianBD != default && dot.ThoiGianKT.Date >= dot.ThoiGianBD.Date)
            return (dot.ThoiGianBD.Date, dot.ThoiGianKT.Date, "TheoDot");
        return (null, null, "ChuaXacMinh");
    }

    // Thời gian tại DN phải nằm trong khung ngày của đợt: DN chấm điểm sau ngày kết thúc đợt, báo cáo và chốt đợt đều theo khung này.
    public static string? OutsideRound(DateTime start, DateTime end, DotThucTap round) =>
        round.ThoiGianBD == default || round.ThoiGianKT == default ? null
        : start.Date < round.ThoiGianBD.Date || end.Date > round.ThoiGianKT.Date
            ? $"Thời gian thực tập tại doanh nghiệp phải nằm trong khung của đợt ({round.ThoiGianBD:dd/MM/yyyy} – {round.ThoiGianKT:dd/MM/yyyy})."
            : null;

    public static string Classify(DateTime? start, DateTime? end, DateTime today)
    {
        if (!start.HasValue || !end.HasValue) return "ChuaXacMinhThoiGian";
        if (start.Value == default || end.Value < start.Value) return "CanKiemTra";
        return today.Date < start.Value.Date ? "ChuaBatDau" : today.Date > end.Value.Date ? "ChoHoanTat" : "DangThucTap";
    }
}
