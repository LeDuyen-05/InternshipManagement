namespace InternshipManagement.BLL.DTOs.TienDoThucTap;

public class TienDoThucTapDto
{
    public string MaTienDo { get; set; } = default!;
    public DateTime MocThoiGian { get; set; }
    public string? NoiDungBaoCao { get; set; }
    public DateTime? NgayNop { get; set; }
    public string TrangThaiDuyet { get; set; } = default!;
    public string MaDot { get; set; } = default!;
    public string MaSV { get; set; } = default!;
    public string HoTenSinhVien { get; set; } = default!;
}
