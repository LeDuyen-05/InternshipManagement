namespace InternshipManagement.BLL.DTOs.GioiThieu;

public class CreateDeXuatCongTyDto
{
    public string MaGV { get; set; } = default!;
    public string TenCongTy { get; set; } = default!;
    public string? ViTriTuyen { get; set; }
    public string? ThoiGian { get; set; }
    public int SoLuongNhan { get; set; } = 1;
    public string? YeuCau { get; set; }
}
