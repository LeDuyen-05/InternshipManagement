namespace InternshipManagement.DAL.Entities;

public class ChiTietChamDiem
{
    public string MaSo { get; set; } = default!;
    public string MaPhieu { get; set; } = default!;
    public string MaTieuChi { get; set; } = default!;
    public decimal DiemCham { get; set; }

    public PhieuChamDiem PhieuChamDiem { get; set; } = default!;
    public TieuChi TieuChi { get; set; } = default!;
}
