namespace InternshipManagement.DAL.Entities;

/// <summary>
/// Lớp kết hợp giữa PhieuChamDiem và TieuChi — dùng khóa chính phức hợp
/// (MaPhieuCham, MaTieuChi) theo xác nhận của nhóm, không tạo mã riêng.
/// </summary>
public class ChiTietChamDiem
{
    public string MaSo { get; set; } = default!;
    public string MaPhieuCham { get; set; } = default!;
    public string MaTieuChi { get; set; } = default!;
    public decimal DiemCham { get; set; }

    public PhieuChamDiem PhieuChamDiem { get; set; } = default!;
    public TieuChi TieuChi { get; set; } = default!;
}
