using InternshipManagement.BLL.DTOs.ThongKe;

namespace InternshipManagement.BLL.Services.ThongKe;

public interface IThongKeService
{
    Task<ThongKeBaoCaoResponse> GetBaoCaoThongKeAsync(string? maDot);
    Task<IReadOnlyList<DotThucTapItemDto>> GetDanhSachDotThucTapAsync();
    Task<byte[]> ExportCsvBangDiemAsync(string? maDot);
}
