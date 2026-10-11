namespace InternshipManagement.DAL.Entities;

public class HoSoNangLuc
{
    public string MaHoSo { get; set; } = default!;
    public string MaSV { get; set; } = default!;
    public string? NDHoSo { get; set; }
    public string? FileCV { get; set; }
    public string? EmbeddingHoSo { get; set; }
    public DateTime NgayCapNhat { get; set; }

    public SinhVien SinhVien { get; set; } = default!;
    public ICollection<GoiYCongTy> GoiYCongTys { get; set; } = new List<GoiYCongTy>();
}
