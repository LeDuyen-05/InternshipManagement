namespace InternshipManagement.BLL.DTOs.GVHuongDan;

public class PhanCongDonLeRequest
{
    public string MaGV { get; set; } = default!;
    public string MaSV { get; set; } = default!;
}

public class PhanCongHangLoatRequest
{
    public string MaGV { get; set; } = default!;
    public List<string> DanhSachMaSV { get; set; } = new();
}

public class DoiGiangVienRequest
{
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
