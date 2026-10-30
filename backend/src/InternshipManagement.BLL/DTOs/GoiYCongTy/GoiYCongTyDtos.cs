namespace InternshipManagement.BLL.DTOs.GoiYCongTy;

public class GoiYCongTyItemDto
{
    public string MaDot { get; set; } = default!;
    public string? MaViTri { get; set; }
    public string MaCongTy { get; set; } = default!;
    public string TenCongTy { get; set; } = default!;
    public string? ViTriTuyen { get; set; }
    public string? ThoiGian { get; set; }
    public int? SoLuongNhan { get; set; }
    public string? YeuCau { get; set; }
    public double? TiLeTuongThich { get; set; } // Baseline cosine only; null for LTR.
    public double? RankingScore { get; set; }
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
    public string MaDot { get; set; } = default!;
    public int K { get; set; }
    public string ModelStatus { get; set; } = "NotApplicable";
    public string? ModelVersion { get; set; }
    public string? FallbackReason { get; set; }
    public bool DaSuDungModelTrain { get; set; }
    public string ThongBao { get; set; } = "";
    public string YNghiaDiem { get; set; } = "Độ tương đồng nội dung, không phải xác suất trúng tuyển.";
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
