namespace InternshipManagement.DAL.Entities;

/// <summary>
/// THIẾU THÔNG TIN: sơ đồ lớp không thể hiện mã định danh riêng cho lớp này.
/// ĐỀ XUẤT (chưa được nhóm xác nhận): dùng khóa chính phức hợp (MaHoSo, MaCongTy),
/// theo cùng nguyên tắc đã áp dụng cho ChiTietChamDiem. Nếu hệ thống cần lưu
/// nhiều lần gợi ý cho cùng 1 cặp hồ sơ - công ty theo thời gian, cần bổ sung
/// thêm tiêu chí phân biệt (ví dụ NgayGoiY vào khóa) — đề nghị nhóm xác nhận lại.
/// </summary>
public class GoiYCongTy
{
    public string MaHoSo { get; set; } = default!;
    public string MaCongTy { get; set; } = default!;
    public double TiLeTuongThich { get; set; }
    public DateTime NgayGoiY { get; set; }

    public HoSoNangLuc HoSoNangLuc { get; set; } = default!;
    public CongTy CongTy { get; set; } = default!;
}
