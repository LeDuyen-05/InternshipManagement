using System.ComponentModel.DataAnnotations.Schema;

namespace InternshipManagement.DAL.Entities;

public class HuongDanDoanhNghiep
{
    public string MaSo { get; set; } = default!;
    public string MaDaiDien { get; set; } = default!;
    public string MaPhanBo { get; set; } = default!;
    public DateTime NgayBD { get; set; }
    public string VaiTro { get; set; } = default!;
    public string DanhGia { get; set; } = default!;

    public DaiDienDoanhNghiep DaiDienDoanhNghiep { get; set; } = default!;
    public PhanBoThucTap PhanBoThucTap { get; set; } = default!;

    [NotMapped]
    public ICollection<PhieuChamDiem> PhieuChamDiems { get; set; } = new List<PhieuChamDiem>();
}
