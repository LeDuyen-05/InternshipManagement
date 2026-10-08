using InternshipManagement.BLL.DTOs.TienDoThucTap;

namespace InternshipManagement.BLL.Services.TienDoThucTap;

public interface ITienDoThucTapService
{
    Task<IEnumerable<TienDoThucTapDto>> GetTienDoBySinhVienAsync(string maSV);
    
    Task<IEnumerable<TienDoThucTapDto>> GetTienDoBySinhVienAndDotAsync(string maSV, string maDot);
    
    Task<IEnumerable<TienDoThucTapDto>> GetBaoCaoChoDuyetByGiangVienAsync(string maGV);
    
    Task<TienDoThucTapDto?> GetChiTietTienDoAsync(string maTienDo);
    
    Task<bool> DuyetTienDoAsync(string maTienDo, DuyetTienDoRequest request);
}
