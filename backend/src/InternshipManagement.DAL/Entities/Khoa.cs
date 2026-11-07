namespace InternshipManagement.DAL.Entities;

// Đơn vị quản lý thực tập (Khoa CNTT, Khoa Quản trị kinh doanh...). Công ty và đại diện DN dùng chung toàn trường.
public class Khoa
{
    public string MaKhoa { get; set; } = default!;
    public string TenKhoa { get; set; } = default!;
    public bool HoatDong { get; set; } = true;
}
