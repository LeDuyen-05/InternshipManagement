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

    // Chỉ tiêu trong đợt đang diễn ra: khi đủ chỉ tiêu, công ty tự động đóng tuyển.
    public string? MaDot { get; set; }
    public int DaTiepNhan { get; set; }
    public int? ConLai { get; set; }
    public bool DaDuChiTieu { get; set; }
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
