namespace InternshipManagement.DAL.Entities;

public class SinhVienThamGiaDot
{
    public string MaDot { get; set; } = default!;
    public string MaSV { get; set; } = default!;
    public bool DangThamGia { get; set; } = true;
    public DateTimeOffset NgayThem { get; set; }
    public string NguoiThem { get; set; } = default!;
    public DateTimeOffset NgayCapNhat { get; set; }
    public string NguoiCapNhat { get; set; } = default!;
}
