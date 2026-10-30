namespace InternshipManagement.DAL.Entities;

public class TieuChi
{
    public string MaTieuChi { get; set; } = default!;
    public string TenTieuChi { get; set; } = default!;
    public decimal DiemToiDa { get; set; }
    public string MaRubric { get; set; } = "CNTT_CLO_V1";
    public string MaCLO { get; set; } = default!;
    /// <summary>"GV" = GVHD chấm, "DN" = đơn vị thực tập chấm, null = tiêu chí cũ không còn dùng.</summary>
    public string? NhomDanhGia { get; set; }
    public int ThuTu { get; set; }

    public ICollection<ChiTietChamDiem> ChiTietChamDiems { get; set; } = new List<ChiTietChamDiem>();
}
