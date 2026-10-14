using InternshipManagement.BLL.DTOs.GoiYCongTy;

namespace InternshipManagement.BLL.Services.GoiYCongTy;

public interface IGoiYCongTyService
{
    Task<GoiYCongTyResponse> GetTopKGoiYAsync(string maSV, int topK = 5);
    Task<GoiYCongTyResponse> RecalculateTopKAsync(string maSV, int topK = 5);
    Task<bool> CapNhatHoSoAsync(string maSV, CapNhatHoSoRequest request);
}
