namespace InternshipManagement.BLL.DTOs.GoiYCongTy;

public class GoiYCongTyItemDto
{
    public string MaCongTy { get; set; } = default!;
    public string TenCongTy { get; set; } = default!;
    public string? ViTriTuyen { get; set; }
    public string? ThoiGian { get; set; }
    public int? SoLuongNhan { get; set; }
    public string? YeuCau { get; set; }
    public double TiLeTuongThich { get; set; } // Tỷ lệ phần trăm (0 - 100%)
    public DateTime NgayGoiY { get; set; }
    public List<string> KyNangPhuHop { get; set; } = new();
    public string DanhGiaDoTuongThich { get; set; } = "Phù hợp"; // "Rất phù hợp (Top Match)", "Phù hợp tốt", "Tiềm năng"
}

public class HoSoSinhVienDto
{
    public string MaSV { get; set; } = default!;
    public string HoTen { get; set; } = default!;
    public string? Lop { get; set; }
    public decimal? Gpa { get; set; }
    public string? ChuyenNganh { get; set; }
    public string? KyNang { get; set; }
    public string? CongNghe { get; set; }
    public string? DuAnDaThucHien { get; set; }
    public string MaHoSo { get; set; } = default!;
    public string? NDHoSo { get; set; }
}

public class GoiYCongTyResponse
{
    public HoSoSinhVienDto SinhVien { get; set; } = new();
    public List<GoiYCongTyItemDto> TopKGoiY { get; set; } = new();
    public int TongSoCongTyKhaoSat { get; set; }
    public string ThuatToan { get; set; } = "TF-IDF + Cosine Similarity Vectorization";
    public string NguonDuLieu { get; set; } = "Bảng GOIYCONGTY";
}

public class CapNhatHoSoRequest
{
    public string? NDHoSo { get; set; }
    public string? KyNang { get; set; }
    public string? CongNghe { get; set; }
    public string? DuAnDaThucHien { get; set; }
}
