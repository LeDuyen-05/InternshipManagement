using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Repositories;

/// <summary>Dữ liệu thô cho một dòng của bảng điểm theo mẫu Khoa.</summary>
public record BangDiemNguon(SinhVien SinhVien, string? TenCongTy, string? MaGV, string? TenGV, PhieuChamDiem? Phieu);

public interface IPhieuChamDiemRepository : IRepository<PhieuChamDiem>
{
    /// <summary>Chỉ trả về tiêu chí đang sử dụng (có nhóm đánh giá GV/DN), sắp theo thứ tự.</summary>
    Task<IReadOnlyList<TieuChi>> GetDanhSachTieuChiAsync();
    Task<PhieuChamDiem?> GetPhieuChamBySinhVienAndDotAsync(string maSV, string maDot);
    Task<IReadOnlyList<PhieuChamDiem>> GetDanhSachPhieuChamByGiangVienAsync(string maGV, string maDot);

    /// <summary>
    /// Tạo mới hoặc cập nhật phiếu của (maSV, maDot). Chỉ ghi đè các tiêu chí có trong <paramref name="chiTiets"/>,
    /// giữ nguyên điểm các tiêu chí khác (phần GV và phần DN được chấm độc lập).
    /// Các trường MaGVHuongDan/MaDaiDien/NhanXetGV/NhanXetDN chỉ cập nhật khi khác null.
    /// </summary>
    Task<PhieuChamDiem> LuuPhieuChamDiemAsync(PhieuChamDiem phieu, IEnumerable<ChiTietChamDiem> chiTiets);
    Task<GVHuongDan?> GetActiveAssignmentAsync(string maSV);
    Task<DotThucTap?> GetDotThucTapAsync(string maDot);
    Task<IReadOnlyList<BangDiemNguon>> GetBangDiemNguonAsync(string maDot, string? maGV);
}
