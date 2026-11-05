namespace InternshipManagement.DAL.Entities;

public class NhapDanhSachDot
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string MaDot { get; set; } = "";
    public string NguoiNhap { get; set; } = "";
    public string TenNguon { get; set; } = "";
    public string CheDo { get; set; } = "";
    public string TrangThai { get; set; } = "XemTruoc";
    public string DuLieuJson { get; set; } = "";
    public string? KetQuaJson { get; set; }
    public DateTimeOffset NgayTao { get; set; }
    public DateTimeOffset HetHan { get; set; }
    public DateTimeOffset? NgayNhap { get; set; }
    public int PhienBan { get; set; }
}
