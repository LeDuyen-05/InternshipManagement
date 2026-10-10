namespace InternshipManagement.DAL.Entities;

public class GiangVien
{
    public string MaGV { get; set; } = default!;
    public string HoTen { get; set; } = default!;
    public string ChuyenMon { get; set; } = default!;
    public int SoLuongSVHD { get; set; }

    public ICollection<GVHuongDan> GVHuongDans { get; set; } = new List<GVHuongDan>();
    public ICollection<GioiThieu> GioiThieus { get; set; } = new List<GioiThieu>();
}
