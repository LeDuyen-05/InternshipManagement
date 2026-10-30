namespace InternshipManagement.BLL.DTOs.PhongVan;

public class PhongVanDto
{
    public int PhienBan { get; set; }
    public string? MaPVTruoc { get; set; }
    public bool DaThayThe { get; set; }
    public List<InterviewHistoryDto> LichSu { get; set; } = new();
    public string MaPV { get; set; } = default!;
    public string MaSinhVien { get; set; } = default!;
    public string? TenCongTy { get; set; }
    public string? ViTriTuyen { get; set; }
    public string? NguoiPhongVan { get; set; }
    public string? ChucVuNguoiPV { get; set; }
    public string? HinhThuc { get; set; }
    public DateTimeOffset NgayPV { get; set; }
    public string? KetQua { get; set; }
    public string? MaDK { get; set; }
    public string? MaDot { get; set; }
    public string? LyDoKetQua { get; set; }
    public string? NguonKetQua { get; set; }
    public DateTimeOffset? ThoiDiemKetQua { get; set; }
}

public record InterviewHistoryDto(string Loai, string? KetQuaCu, string KetQuaMoi, string LyDo, DateTimeOffset ThoiDiem);
