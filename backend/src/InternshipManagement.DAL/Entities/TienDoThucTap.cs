namespace InternshipManagement.DAL.Entities;

public class TienDoThucTap
{
    public string MaTienDo { get; set; } = default!;
    public string MaDot { get; set; } = default!;
    public DateTime MocThoiGian { get; set; }
    public string NDBaoCao { get; set; } = default!;
    public bool TrangThaiDuyet { get; set; }

    public DotThucTap DotThucTap { get; set; } = default!;
}
