namespace InternshipManagement.DAL.Entities;

public class HoSoNangLuc
{
    public string MaHoSo { get; set; } = default!;
    public string MaSinhVien { get; set; } = default!;
    public string NDHoSo { get; set; } = default!;
    public DateTime NgayCapNhat { get; set; }

    public SinhVien SinhVien { get; set; } = default!;
}
