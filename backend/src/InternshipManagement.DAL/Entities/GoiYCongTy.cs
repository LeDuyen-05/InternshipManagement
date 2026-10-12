namespace InternshipManagement.DAL.Entities;

public class GoiYCongTy
{
    public string MaSo { get; set; } = default!;
    public string MaHoSo { get; set; } = default!;
    public string MaCongTy { get; set; } = default!;
    public decimal TiLeTuongThich { get; set; }
    public DateTime NgayGoiY { get; set; }

    public HoSoNangLuc HoSoNangLuc { get; set; } = default!;
    public CongTy CongTy { get; set; } = default!;
}
