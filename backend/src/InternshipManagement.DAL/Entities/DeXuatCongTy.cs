namespace InternshipManagement.DAL.Entities;

public class DeXuatCongTy
{
    public string MaDeXuat { get; set; } = default!;
    public DateTime NgayDeXuat { get; set; }
    public string MaCongTy { get; set; } = default!;
    public string MaSV { get; set; } = default!;
    public string MaGV { get; set; } = default!;

    public CongTy CongTy { get; set; } = default!;
    public SinhVien SinhVien { get; set; } = default!;
    public GiangVien GiangVien { get; set; } = default!;
}
