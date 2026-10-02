namespace InternshipManagement.DAL.Entities;

/// <summary>
/// GHI CHÚ: ảnh sơ đồ lớp mới nhất chỉ hiển thị 3 thuộc tính (MaSo, MaGV, MaCongTy).
/// Đã bổ sung NgayGioiThieu và TrangThaiKetNoi theo bộ thuộc tính "chính thức" nhóm
/// đã xác nhận trước đó (dựa trên file sơ đồ lớp .mdl gốc) — vì nhiều khả năng ảnh
/// bị cắt bớt thuộc tính khi hiển thị. Đề nghị nhóm xác nhận lại nếu có sai khác.
/// </summary>
public class GioiThieu
{
    public string MaSo { get; set; } = default!;
    public string MaGV { get; set; } = default!;
    public string MaCongTy { get; set; } = default!;
    public DateTime NgayGioiThieu { get; set; }
    public string TrangThaiKetNoi { get; set; } = default!;

    public GiangVien GiangVien { get; set; } = default!;
    public CongTy CongTy { get; set; } = default!;
}
