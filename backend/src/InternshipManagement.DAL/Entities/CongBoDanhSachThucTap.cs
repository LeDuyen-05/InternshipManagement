namespace InternshipManagement.DAL.Entities;

public class CongBoDanhSachThucTap
{
    public string MaCongBo { get; set; } = Guid.NewGuid().ToString("N");
    public string MaDot { get; set; } = "";
    public int PhienBan { get; set; } = 1;
    public string TieuDe { get; set; } = "";
    public string NoiDung { get; set; } = "";
    public DateTimeOffset HanPhanHoi { get; set; }
    public DateTimeOffset NgayCongBo { get; set; }
    public string NguoiCongBo { get; set; } = "";
    public string DanhSachJson { get; set; } = "[]";
}

public class PhanHoiDanhSachThucTap
{
    public string MaPhanHoi { get; set; } = Guid.NewGuid().ToString("N");
    public string MaDot { get; set; } = "";
    public string MaCongBo { get; set; } = "";
    public string MaSV { get; set; } = "";
    public int LanPhanHoi { get; set; }
    public bool ThongTinDung { get; set; }
    public string NoiDung { get; set; } = "";
    public string NguoiGui { get; set; } = "";
    public DateTimeOffset NgayGui { get; set; }
    public string? ThongTinMoiJson { get; set; }
    public string? ThongTinCuJson { get; set; }
    public int PhienBanThongTin { get; set; }
}

public class XuLyPhanHoiDanhSach
{
    public string MaXuLy { get; set; } = Guid.NewGuid().ToString("N");
    public string MaDot { get; set; } = "";
    public string MaPhanHoi { get; set; } = "";
    public bool ChapThuan { get; set; }
    public string LyDo { get; set; } = "";
    public string NguoiXuLy { get; set; } = "";
    public DateTimeOffset NgayXuLy { get; set; }
    public string ThongTinCuJson { get; set; } = "";
    public string ThongTinMoiJson { get; set; } = "";
}

public class DanhSachThucTapChinhThuc
{
    public string MaDot { get; set; } = "";
    public string MaCongBo { get; set; } = "";
    public int PhienBanRaSoat { get; set; }
    public string DanhSachJson { get; set; } = "[]";
    public string LyDo { get; set; } = "";
    public string NguoiChot { get; set; } = "";
    public DateTimeOffset NgayChot { get; set; }
}
