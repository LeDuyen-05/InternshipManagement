namespace InternshipManagement.DAL.Entities;

public class DeXuatThucTapTuTim
{
    public string MaHoSo { get; set; } = default!;
    public string MaSV { get; set; } = default!;
    public string MaDot { get; set; } = default!;
    public string? MaCongTy { get; set; }
    public string TenCongTy { get; set; } = default!;
    public string DiaChi { get; set; } = default!;
    public string ViTri { get; set; } = default!;
    public string NguoiLienHe { get; set; } = default!;
    public string LienHe { get; set; } = default!;
    public DateTime NgayBatDau { get; set; }
    public DateTime NgayKetThuc { get; set; }
    public string TrangThai { get; set; } = "ChoDuyet";
    public DateTime NgayGui { get; set; }
    public DateTime? NgayDuyet { get; set; }
    public string? NguoiDuyet { get; set; }
    public string? LyDo { get; set; }
    public string? MaPhanBo { get; set; }
}
