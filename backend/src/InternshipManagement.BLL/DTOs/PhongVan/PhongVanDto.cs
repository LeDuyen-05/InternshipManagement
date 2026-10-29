namespace InternshipManagement.BLL.DTOs.PhongVan;

public class PhongVanDto
{
    public string MaPV { get; set; } = default!;
    public string MaSinhVien { get; set; } = default!;
    public string? TenCongTy { get; set; }
    public string? ViTriTuyen { get; set; }
    public string? NguoiPhongVan { get; set; }
    public string? ChucVuNguoiPV { get; set; }
    public string? HinhThuc { get; set; }
    public DateTime NgayPV { get; set; }
    public string? KetQua { get; set; }
}
