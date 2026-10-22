namespace InternshipManagement.DAL.Entities;

public class TieuChi
{
    public string MaTieuChi { get; set; } = default!;
    public string TenTieuChi { get; set; } = default!;
    public decimal DiemToiDa { get; set; }
    public string MaRubric { get; set; } = "LEGACY_4TC";
    public string MaCLO { get; set; } = default!;

    public ICollection<ChiTietChamDiem> ChiTietChamDiems { get; set; } = new List<ChiTietChamDiem>();
}
