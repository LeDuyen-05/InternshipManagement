namespace InternshipManagement.BLL.DTOs.DangKyThucTap;

public class CongTyDto
{
    public string MaCongTy { get; set; } = default!;
    public string TenCongTy { get; set; } = default!;
    public string? ViTriTuyen { get; set; }
    public string? ThoiGian { get; set; }
    public int? SoLuongNhan { get; set; }
    public string? YeuCau { get; set; }
    public string TrangThai { get; set; } = default!;
}

public class DeXuatCongTyRequest
{
    public string TenCongTy { get; set; } = default!;
    public string? ViTriTuyen { get; set; }
    public string? ThoiGian { get; set; }
    public int? SoLuongNhan { get; set; }
    public string? YeuCau { get; set; }
    public string MaSV { get; set; } = default!;
}
