using InternshipManagement.BLL.DTOs.GoiYCongTy;

namespace InternshipManagement.BLL.Services.GoiYCongTy;

public interface IGoiYCongTyService
{
    Task ValidateContextAsync(string maSV, int topK, string? maDot);
    Task<GoiYCongTyResponse> GetTopKGoiYAsync(string maSV, int topK = 5, string? maDot = null, CancellationToken cancellationToken = default);
    Task<GoiYCongTyResponse> RecalculateTopKAsync(string maSV, int topK = 5, string? maDot = null, CancellationToken cancellationToken = default);
    Task<bool> CapNhatHoSoAsync(string maSV, CapNhatHoSoRequest request);
}
