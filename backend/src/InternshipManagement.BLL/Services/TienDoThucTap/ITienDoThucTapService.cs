using InternshipManagement.BLL.DTOs.TienDoThucTap;

namespace InternshipManagement.BLL.Services.TienDoThucTap;

public interface ITienDoThucTapService
{
    // Sinh viên xem tiến độ
    Task<IReadOnlyList<TienDoThucTapDto>> GetTienDoBySinhVienAsync(string maSV);
    Task<IEnumerable<TienDoThucTapDto>> GetTienDoBySinhVienAndDotAsync(string maSV, string maDot);

    // Sinh viên nộp / cập nhật báo cáo tuần
    Task<TienDoThucTapDto> NopBaoCaoTienDoAsync(NopBaoCaoRequest request);

    // Giảng viên duyệt báo cáo
    Task<IEnumerable<TienDoThucTapDto>> GetBaoCaoChoDuyetByGiangVienAsync(string maGV);
    Task<TienDoThucTapDto?> GetChiTietTienDoAsync(string maTienDo);
    Task<bool> DuyetTienDoAsync(string maTienDo, DuyetTienDoRequest request);
}

