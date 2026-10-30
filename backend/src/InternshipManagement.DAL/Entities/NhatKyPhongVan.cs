namespace InternshipManagement.DAL.Entities;

public class NhatKyPhongVan
{
    public string Loai { get; set; } = "KetQua";
    public string? MaPVMoi { get; set; }
    public string? NoiDungCu { get; set; }
    public string? NoiDungMoi { get; set; }
    public string MaNhatKy { get; set; } = default!;
    public string MaPV { get; set; } = default!;
    public string MaDK { get; set; } = default!;
    public string? KetQuaCu { get; set; }
    public string KetQuaMoi { get; set; } = default!;
    public string LyDo { get; set; } = default!;
    public string Nguon { get; set; } = default!;
    public string NguoiThucHien { get; set; } = default!;
    public DateTimeOffset ThoiDiem { get; set; }
}
