namespace InternshipManagement.DAL.Entities;

/// <summary>
/// Giữ lại theo xác nhận của nhóm. Thuộc tính giữ nguyên như đã thống nhất
/// trước đó (dựa trên sơ đồ lớp .mdl gốc): MaDeXuat làm khóa chính,
/// liên kết CongTy, SinhVien, GiangVien.
/// </summary>
public class DeXuatCongTy
{
    public string MaDeXuat { get; set; } = default!;
    public DateTime NgayDeXuat { get; set; }
    public string MaCongTy { get; set; } = default!;
    public string MaSV { get; set; } = default!;
    public string MaGV { get; set; } = default!;

    public CongTy CongTy { get; set; } = default!;
    public SinhVien SinhVien { get; set; } = default!;
    public GiangVien GiangVien { get; set; } = default!;
}
