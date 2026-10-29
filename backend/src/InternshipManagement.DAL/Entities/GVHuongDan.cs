namespace InternshipManagement.DAL.Entities;

public class GVHuongDan
{
    public string MaSo { get; set; } = default!;
    public string MaGiangVien { get; set; } = default!;
    public string MaSinhVien { get; set; } = default!;
    public DateTime NgayPC { get; set; }
    public string TrangThai { get; set; } = "DangHuongDan";

    public GiangVien GiangVien { get; set; } = default!;
    public SinhVien SinhVien { get; set; } = default!;
    public ICollection<PhieuChamDiem> PhieuChamDiems { get; set; } = new List<PhieuChamDiem>();
}
