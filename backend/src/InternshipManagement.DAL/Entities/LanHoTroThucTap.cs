namespace InternshipManagement.DAL.Entities;

// Aggregate lưu snapshot và nhật ký từng lần, phiên bản chống ghi đè kết quả.
public class LanHoTroThucTap
{
    public string MaLan { get; set; } = Guid.NewGuid().ToString("N");
    public string MaDot { get; set; } = "";
    public string TenLan { get; set; } = "";
    public DateTime NgayHoTro { get; set; }
    public string TrangThai { get; set; } = "Nhap";
    public string? MaLanTruoc { get; set; }
    public int PhienBan { get; set; }
    public string DanhSachJson { get; set; } = "[]";
    public string NhatKyJson { get; set; } = "[]";
}
