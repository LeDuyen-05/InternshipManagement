namespace InternshipManagement.BLL.DTOs.GVHuongDan;

public class PhanCongDonLeRequest
{
    public string MaDot { get; set; } = default!;
    public string MaGV { get; set; } = default!;
    public string MaSV { get; set; } = default!;
}

public class PhanCongHangLoatRequest
{
    public string MaDot { get; set; } = default!;
    public string MaGV { get; set; } = default!;
    public List<string> DanhSachMaSV { get; set; } = new();
}

public class DoiGiangVienRequest
{
    public string MaDot { get; set; } = default!;
    public string MaSo { get; set; } = default!;
    public string MaGVMoi { get; set; } = default!;
}

public class PhanCongHangLoatResult
{
    public List<SVHuongDanDto> ThanhCong { get; set; } = new();
    public List<PhanCongKhongThanhCongDto> KhongThanhCong { get; set; } = new();
}

public class PhanCongKhongThanhCongDto
{
    public string MaSV { get; set; } = default!;
    public string LyDo { get; set; } = default!;
}

public class TuDongPhanCongPreviewItem
{
    public string MaSV { get; set; } = default!;
    public string HoTenSV { get; set; } = default!;
    public string Lop { get; set; } = default!;
    public string? TenCongTy { get; set; }
    public string MaGV { get; set; } = default!;
    public string HoTenGV { get; set; } = default!;
    public string ChuyenMonGV { get; set; } = default!;
    public string LyDoGhep { get; set; } = default!;
    /// <summary>1 = GV giới thiệu doanh nghiệp, 2 = phù hợp chuyên môn, 3 = cân bằng chỉ tiêu.</summary>
    public int MucUuTien { get; set; }
}

public class TuDongPhanCongConfirmRequest
{
    public string MaDot { get; set; } = default!;
    public List<PhanCongDonLeRequest> DanhSachPhanCong { get; set; } = new();
}

public class TuDongPhanCongResult
{
    public string MaDot { get; set; } = default!;
    public int TongSoSVChuaPhanCong { get; set; }
    public int SoLuongGhepThanhCong { get; set; }
    public int SoLuongKhongTheGhep { get; set; }
    public List<TuDongPhanCongPreviewItem> DanhSachDeXuat { get; set; } = new();
    public List<string> SinhVienChuaTheGhep { get; set; } = new();
}
