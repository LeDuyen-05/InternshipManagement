namespace InternshipManagement.DAL.Entities;

public class TienDoThucTap
{
    // Nullable để không tự xác nhận thời điểm nộp của dữ liệu lịch sử chỉ lưu DATE.
    public bool? NopTre { get; set; }
    public DateTimeOffset? HanNopBoSung { get; set; }
    public string MaTienDo { get; set; } = default!;
    public string MaDot { get; set; } = default!;
    public string MaSV { get; set; } = default!;
    public DateTime MocThoiGian { get; set; }
    public string? NoiDungBaoCao { get; set; }
    public DateTime? NgayNop { get; set; }
    public string TrangThaiDuyet { get; set; } = "ChuaNop";
    public string? NhanXetGV { get; set; }
    public string? NhanXet { get; set; }
    // Bản báo cáo lưu trữ tại lần hủy nơi này; không tự chuyển thành báo cáo của DN mới.
    public string? MaPhanBoLuuTru { get; set; }

    public DotThucTap DotThucTap { get; set; } = default!;
    public SinhVien SinhVien { get; set; } = default!;
}
