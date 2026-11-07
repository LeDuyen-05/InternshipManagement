namespace InternshipManagement.DAL.Entities;

public class LoaiThucTap
{
    public string MaLoai { get; set; } = "";
    public string TenLoai { get; set; } = "";
    public bool HoatDong { get; set; } = true;
}

public class BoTieuChi
{
    public string MaRubric { get; set; } = "";
    public string TenBo { get; set; } = "";
    public string? MaLoaiThucTap { get; set; }
    public int PhienBan { get; set; } = 1;
    public string TrangThai { get; set; } = "Nhap";
    public int PhienBanCapNhat { get; set; }
    public string? NguoiTao { get; set; }
    public DateTimeOffset NgayTao { get; set; }
    public string? NguoiPhatHanh { get; set; }
    public DateTimeOffset? NgayPhatHanh { get; set; }
    public string? MaKhoa { get; set; }
}
