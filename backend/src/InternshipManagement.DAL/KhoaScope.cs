namespace InternshipManagement.DAL;

/// <summary>
/// Phạm vi khoa của người đang thao tác. <see cref="MaKhoa"/> = null nghĩa là không giới hạn
/// (Quản trị viên, đại diện doanh nghiệp, tác vụ hệ thống); có giá trị thì mọi truy vấn chỉ thấy dữ liệu của khoa đó.
/// </summary>
public interface IKhoaScope
{
    string? MaKhoa { get; }
}

public static class PhamViKhoa
{
    // Tài khoản Khoa/GV/SV chưa được gắn khoa: không thấy dữ liệu nào thay vì thấy toàn trường.
    public const string KhongCoKhoa = "__CHUA_GAN_KHOA__";
}

/// <summary>Phạm vi cố định, dùng cho kiểm thử và tác vụ chạy nền.</summary>
public sealed class FixedKhoaScope(string? maKhoa) : IKhoaScope
{
    public string? MaKhoa { get; } = maKhoa;
}
