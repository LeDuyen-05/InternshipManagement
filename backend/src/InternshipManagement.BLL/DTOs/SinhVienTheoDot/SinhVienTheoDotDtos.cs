namespace InternshipManagement.BLL.DTOs.SinhVienTheoDot;

public record ThemSinhVienTheoDotRequest(string MaDot, List<string> MaSinhViens);
public record BoTriBanDauRequest(string MaDot, string MaCongTy, string LyDo, string CanCu, bool DaTiepNhanTrucTiep, bool DaDuocDNTiepNhan, string? MaViTri = null, string? MaLanHoTro = null, int? PhienBanHoTro = null);
public record NhomSinhVienTheoDotDto(string Ma, string Ten, int SoLuong);

public class SinhVienTheoDotDto
{
    public string MaSV { get; set; } = "";
    public string HoTen { get; set; } = "";
    public string? Lop { get; set; }
    public string Nguon { get; set; } = "";
    public bool DaCoDanhSachKhoa { get; set; }
    public bool CoNghiepVu { get; set; }
    public bool CoPhanBoChinhThuc { get; set; }
    public bool CanGoKhoiDanhSach => DaCoDanhSachKhoa && !CoNghiepVu;
    public string TrangThai { get; set; } = "";
    public string TenTrangThai { get; set; } = "";
    public bool CanHoTro { get; set; }
    public string LyDo { get; set; } = "";
    public string? MaCongTy { get; set; }
    public string? TenCongTy { get; set; }
    public int SoNguyenVongDangXet { get; set; }
    public int SoPhanBoDaHuy { get; set; }
    public string? MaPhanBo { get; set; }
    public DateTime? NgayBatDauThucTap { get; set; }
    public DateTime? NgayKetThucThucTap { get; set; }
    public string? NguonThoiGian { get; set; }
    public int PhienBanThoiGian { get; set; }
}

public record DanhSachSinhVienTheoDotDto(
    string MaDot, string TenDot, int TongSinhVien, int TuDanhSachKhoa, int TuNghiepVu,
    int CanHoTro, int DaPhanBoChinhThuc,
    List<NhomSinhVienTheoDotDto> ThongKe, List<SinhVienTheoDotDto> SinhViens);
