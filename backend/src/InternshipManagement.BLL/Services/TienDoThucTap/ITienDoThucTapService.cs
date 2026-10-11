using InternshipManagement.BLL.DTOs.TienDoThucTap;

namespace InternshipManagement.BLL.Services.TienDoThucTap;

public interface ITienDoThucTapService
{
    Task<IReadOnlyList<TienDoThucTapDto>> GetTienDoBySinhVienAsync(string maSV);
    Task<TienDoThucTapDto> NopBaoCaoTienDoAsync(NopBaoCaoRequest request);
}
