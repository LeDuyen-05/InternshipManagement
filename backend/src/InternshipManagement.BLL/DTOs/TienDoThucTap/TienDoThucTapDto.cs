namespace InternshipManagement.BLL.DTOs.TienDoThucTap;

public class TienDoThucTapDto
{
    public bool? NopTre { get; set; }
    public DateTimeOffset? HanNopBoSung { get; set; }
    public string MaTienDo { get; set; } = default!;
    public string MaDot { get; set; } = default!;
    public string? TenDot { get; set; }
    public string MaSV { get; set; } = default!;
    public DateTime MocThoiGian { get; set; }
    public string? NoiDungBaoCao { get; set; }
    public DateTime? NgayNop { get; set; }
    public string TrangThaiDuyet { get; set; } = default!;
    public string? NhanXetGV { get; set; }
    public string? NhanXet { get; set; }
    public string? HoTenSinhVien { get; set; }
    public string? MaPhanBoLuuTru { get; set; }
}


public class NopBaoCaoRequest
{
    public string? MaTienDo { get; set; }
    // API lấy SV từ tài khoản và đợt từ mốc báo cáo, không buộc client khai lại.
    public string? MaSV { get; set; }
    public string? MaDot { get; set; }
    public DateTime MocThoiGian { get; set; }
    public string NoiDungBaoCao { get; set; } = default!;
}
