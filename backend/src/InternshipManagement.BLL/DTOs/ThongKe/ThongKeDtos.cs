namespace InternshipManagement.BLL.DTOs.ThongKe;

public class ThongKeTongQuanDto
{
    public int TongSinhVien { get; set; }
    public int DaPhanCongGVHD { get; set; }
    public int ChuaPhanCongGVHD { get; set; }
    public double TiLePhanCong { get; set; }

    public int TongBaoCaoTienDo { get; set; }
    public int TienDoDaDuyet { get; set; }
    public int TienDoChoDuyet { get; set; }
    public int TienDoChuaNop { get; set; }

    public int DaChamCLO { get; set; }
    public int ChuaChamCLO { get; set; }
    public double DiemTrungBinhCLO { get; set; }
    public int SoLuongDat { get; set; }
    public int SoLuongKhongDat { get; set; }
    public double TiLeDatCLO { get; set; }
}

public class PhanBoDiemCLODto
{
    public string XepLoai { get; set; } = default!;
    public string KhoangDiem { get; set; } = default!;
    public int SoLuong { get; set; }
    public double TiLe { get; set; }
}

public class DiemChiTietCLODto
{
    public string MaCLO { get; set; } = default!;
    public string TenCLO { get; set; } = default!;
    public double DiemTrungBinh { get; set; }
    public double DiemToiDa { get; set; } = 10.0;
    public double TrongSo { get; set; }
}

public class ThongKeTaiGVDto
{
    public string MaGV { get; set; } = default!;
    public string HoTen { get; set; } = default!;
    public string? ChuyenMon { get; set; }
    public int SoLuongSVHD { get; set; }
    public int SoLuongHienTai { get; set; }
    public double TiLeTai { get; set; }
    public string TrangThaiTai { get; set; } = "BinhThuong"; // "DuTai", "ConCho", "QuaTai"
}

public class SinhVienDiemCLODto
{
    public string MaSV { get; set; } = default!;
    public string HoTen { get; set; } = default!;
    public string? Lop { get; set; }
    public string? TenCongTy { get; set; }
    public string? TenGVHD { get; set; }
    public double? DiemCLO1 { get; set; }
    public double? DiemCLO2 { get; set; }
    public double? DiemCLO3 { get; set; }
    public double? DiemCLO4 { get; set; }
    public double? TongDiem { get; set; }
    public string XepLoai { get; set; } = "Chưa có";
    public string KetQua { get; set; } = "Chưa chấm"; // "Đạt", "Không đạt", "Chưa chấm"
    public DateTime? NgayCham { get; set; }
    public List<DiemTieuChiSinhVienDto> DiemTheoTieuChi { get; set; } = new();
}

public class DiemTieuChiSinhVienDto
{
    public string MaCLO { get; set; } = default!;
    public double DiemCham { get; set; }
    public double DiemToiDa { get; set; }
}

public class ThongKeBaoCaoResponse
{
    public string MaDot { get; set; } = default!;
    public string TenDot { get; set; } = default!;
    public ThongKeTongQuanDto TongQuan { get; set; } = new();
    public List<PhanBoDiemCLODto> PhanBoDiem { get; set; } = new();
    public List<DiemChiTietCLODto> DiemTheoCLO { get; set; } = new();
    public List<ThongKeTaiGVDto> TaiGiangVien { get; set; } = new();
    public List<SinhVienDiemCLODto> DanhSachBangDiem { get; set; } = new();
}

public class DotThucTapItemDto
{
    public string MaDot { get; set; } = default!;
    public string TenDot { get; set; } = default!;
    public string NamHoc { get; set; } = default!;
    public DateTime ThoiGianBD { get; set; }
    public DateTime ThoiGianKT { get; set; }
    public string ThoiGian { get; set; } = default!;
    public string TrangThai { get; set; } = default!;
    public string LabelTrangThai { get; set; } = default!;
    public string? MaRubric { get; set; }
}
