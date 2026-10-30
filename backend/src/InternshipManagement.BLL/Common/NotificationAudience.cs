namespace InternshipManagement.BLL.Common;

public static class NotificationAudience
{
    public static string Code(string? role) => role?.Trim().ToLowerInvariant() switch {
        "khoa" or "quantrivien" or "admin" or "vt01" or "vt02" => "STAFF",
        "sinhvien" or "sinh vien" or "sv" or "vt04" => "SV",
        "giangvien" or "giang vien" or "gv" or "vt03" => "GV",
        "daidiendn" or "doanhnghiep" or "doanh nghiep" or "dn" or "vt05" => "DN",
        _ => "NONE"
    };
    public static bool CanRead(string? role, string? target) {
        var code = Code(role);
        return code == "STAFF" || (code != "NONE" && (target == null || target == "ALL" || target == code));
    }
}
