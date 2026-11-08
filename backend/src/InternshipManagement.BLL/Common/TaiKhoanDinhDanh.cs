namespace InternshipManagement.BLL.Common;

/// <summary>
/// Mã tài khoản và tên đăng nhập khi QTV tạo tài khoản: bỏ khoảng trắng hai đầu rồi kiểm tra độ dài,
/// không chứa khoảng trắng. Đăng nhập luôn cắt khoảng trắng nên tên " gv001 " sẽ không bao giờ dùng được,
/// còn mã tài khoản rỗng làm đường dẫn sửa/khóa/đặt lại mật khẩu không gọi được.
/// </summary>
public static class TaiKhoanDinhDanh
{
    public const int MaToiDa = 20;
    public const int TenToiThieu = 4;
    public const int TenToiDa = 100;

    public static string Ma(string? ma)
    {
        var x = ma?.Trim() ?? "";
        if (x.Length is 0 or > MaToiDa || x.Any(char.IsWhiteSpace))
            throw new ArgumentException($"Mã tài khoản gồm 1–{MaToiDa} ký tự, không chứa khoảng trắng.");
        return x;
    }

    public static string TenDangNhap(string? ten)
    {
        var x = ten?.Trim() ?? "";
        if (x.Length is < TenToiThieu or > TenToiDa || x.Any(char.IsWhiteSpace))
            throw new ArgumentException($"Tên đăng nhập gồm {TenToiThieu}–{TenToiDa} ký tự, không chứa khoảng trắng.");
        return x;
    }
}
