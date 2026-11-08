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
    // Đối tượng lưu cho thông báo: ALL hoặc mã người nhận (nhận cả tên vai trò như SinhVien); null nếu không hợp lệ.
    public static string? Target(string? value) =>
        string.IsNullOrWhiteSpace(value) || value.Trim().Equals("ALL", StringComparison.OrdinalIgnoreCase) ? "ALL"
        : Code(value) is "SV" or "GV" or "DN" ? Code(value) : null;
    public static bool CanRead(string? role, string? target) {
        var code = Code(role);
        return code == "STAFF" || (code != "NONE" && (target == null || target == "ALL" || target == code));
    }
}
