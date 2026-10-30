namespace InternshipManagement.DAL.Entities;

public class ChotDotThucTap
{
    public string MaDot { get; set; } = default!;
    public string TrangThai { get; set; } = "ChuaChot";
    public int PhienBan { get; set; }
    public DateTimeOffset? HanMoLai { get; set; }
    public string? NguoiCapNhat { get; set; }
    public DateTimeOffset NgayCapNhat { get; set; }
    public string LyDo { get; set; } = "";
}

public class KhongHoanTatDot
{
    public bool TruocChotDanhSach { get; set; }
    public string MaDot { get; set; } = default!;
    public string MaSV { get; set; } = default!;
    public bool HieuLuc { get; set; } = true;
    public string LyDo { get; set; } = default!;
    public string CanCu { get; set; } = default!;
    public string NguoiXacNhan { get; set; } = default!;
    public DateTimeOffset NgayXacNhan { get; set; }
}

public class NhatKyChotDot
{
    public string MaNhatKy { get; set; } = Guid.NewGuid().ToString("N");
    public string MaDot { get; set; } = default!;
    public int PhienBan { get; set; }
    public string Loai { get; set; } = default!;
    public string NguoiThucHien { get; set; } = default!;
    public DateTimeOffset ThoiDiem { get; set; }
    public string LyDo { get; set; } = default!;
    public string NoiDung { get; set; } = default!;
}
