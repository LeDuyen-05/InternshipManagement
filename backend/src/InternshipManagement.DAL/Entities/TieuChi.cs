namespace InternshipManagement.DAL.Entities;

public class TieuChi
{
    public string MaTieuChi { get; set; } = default!;
    public string TenTieuChi { get; set; } = default!;
    public decimal DiemToiDa { get; set; }

    public ICollection<ChiTietChamDiem> ChiTietChamDiems { get; set; } = new List<ChiTietChamDiem>();
}
