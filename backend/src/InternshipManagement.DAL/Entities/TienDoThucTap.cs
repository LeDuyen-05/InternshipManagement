namespace InternshipManagement.DAL.Entities;

public class TienDoThucTap
{
    public string MaTienDo { get; set; } = default!;
    public DateTime MocThoiGian { get; set; }
    public string? NoiDungBaoCao { get; set; }
    public DateTime? NgayNop { get; set; }
    public string TrangThaiDuyet { get; set; } = "ChuaNop";
    public string MaDot { get; set; } = default!;
    public string MaSV { get; set; } = default!;

    public DotThucTap DotThucTap { get; set; } = default!;
    public SinhVien SinhVien { get; set; } = default!;
}
