namespace InternshipManagement.BLL.DTOs.GioiThieu;

public class GioiThieuDto
{
    public string MaSo { get; set; } = default!;
    public string MaGV { get; set; } = default!;
    public string TenGiangVien { get; set; } = string.Empty;
    public string MaCongTy { get; set; } = default!;
    public string TenCongTy { get; set; } = string.Empty;
    public string? ViTriTuyen { get; set; }
    public DateTime NgayGioiThieu { get; set; }
    public string TrangThaiKetNoi { get; set; } = default!;
}
