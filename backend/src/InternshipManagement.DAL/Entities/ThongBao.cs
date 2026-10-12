namespace InternshipManagement.DAL.Entities;

public class ThongBao
{
    public string MaThongBao { get; set; } = default!;
    public string TieuDe { get; set; } = default!;
    public string NoiDung { get; set; } = default!;
    public DateTime NgayTao { get; set; }
    public string? MaNguoiGui { get; set; }
}
