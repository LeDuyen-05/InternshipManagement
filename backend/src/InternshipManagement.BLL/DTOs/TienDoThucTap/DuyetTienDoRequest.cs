using System.ComponentModel.DataAnnotations;

namespace InternshipManagement.BLL.DTOs.TienDoThucTap;

public class DuyetTienDoRequest
{
    [Required(ErrorMessage = "Trạng thái duyệt là bắt buộc")]
    public string TrangThaiDuyet { get; set; } = default!;

    public string? NhanXetGV { get; set; }
    [MaxLength(1000)]
    public string? NhanXet { get; set; }
}
