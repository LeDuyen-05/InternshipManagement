namespace InternshipManagement.DAL.Entities;

/// <summary>
/// Lớp kết hợp giữa PhieuChamDiem và TieuChi — dùng khóa chính phức hợp
/// (MaPhieuCham, MaTieuChi) theo xác nhận của nhóm, không tạo mã riêng.
/// </summary>
public class ChiTietChamDiem
{
    public string MaPhieuCham { get; set; } = default!;
    public string MaTieuChi { get; set; } = default!;
    public double DiemCham { get; set; }
    public string NhanXet { get; set; } = default!;

    public PhieuChamDiem PhieuChamDiem { get; set; } = default!;
    public TieuChi TieuChi { get; set; } = default!;
}
