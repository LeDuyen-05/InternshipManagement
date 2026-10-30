using InternshipManagement.DAL.Entities;

namespace InternshipManagement.BLL.Common;

public static class RecruitmentStatus
{
    public static string Resolve(CongTyTheoDot? plan, string companyStatus, string roundStatus, int accepted, DateTimeOffset now, int? legacyCapacity = null, bool allPositionsFull = false)
    {
        if (companyStatus != "DaDuyet") return "ChuaDuocDuyet";
        if (roundStatus == "DaKetThuc") return "DotKetThuc";
        var capacity = plan?.SoLuongNhan ?? legacyCapacity ?? 0;
        if ((capacity > 0 && accepted >= capacity) || allPositionsFull) return "DaDuChiTieu";
        if (plan == null) return "ChuaCoKeHoach";
        if (!plan.HoatDong) return "NgungNhanMoi";
        if (roundStatus != "DangDienRa") return "DotChuaMo";
        if (now < plan.MoDangKy) return "ChuaDenHan";
        if (now > plan.HanDangKy) return "HetHan";
        return "DangTuyen";
    }
}
