namespace InternshipManagement.DAL.Entities;

public class GioiThieu
{
    public string MaSo { get; set; } = default!;
    public string MaGV { get; set; } = default!;
    public string MaCongTy { get; set; } = default!;
    public DateTime NgayGioiThieu { get; set; }
    public string TrangThaiKetNoi { get; set; } = default!;

    public GiangVien GiangVien { get; set; } = default!;
    public CongTy CongTy { get; set; } = default!;
}
