using InternshipManagement.BLL.DTOs.GoiYCongTy;
using InternshipManagement.BLL.Services.Recommendation;
using InternshipManagement.DAL.Repositories;

namespace InternshipManagement.BLL.Services.GoiYCongTy;

// Adapter giữ hợp đồng UI cũ; xếp hạng/filter dùng duy nhất RecommendationService.
public class GoiYCongTyService(IGoiYCongTyRepository repository, RecommendationService recommendations, TimeProvider? clock = null) : IGoiYCongTyService
{
    public Task ValidateContextAsync(string maSV, int topK, string? maDot) => recommendations.EvaluateAsync(maSV, topK, maDot);

    public async Task<GoiYCongTyResponse> GetTopKGoiYAsync(string maSV, int topK = 5, string? maDot = null, CancellationToken cancellationToken = default)
    {
        var ranked = await recommendations.RecommendAsync(maSV, topK, maDot: maDot, cancellationToken: cancellationToken);
        var student = await repository.GetSinhVienWithHoSoAsync(maSV) ?? throw new KeyNotFoundException("Không tìm thấy sinh viên.");
        return new()
        {
            MaDot = ranked.MaDot, K = ranked.K, ModelStatus = ranked.ModelStatus,
            ModelVersion = ranked.ModelVersion, FallbackReason = ranked.FallbackReason,
            DaSuDungModelTrain = ranked.DaSuDungModelTrain, ThongBao = ranked.ThongBao, YNghiaDiem = ranked.YNghiaDiem,
            ThuatToan = ranked.ThuatToan, NguonDuLieu = "Hồ sơ hiện hành và kế hoạch/JD của đúng DN–đợt, tính trực tiếp",
            TongSoCongTyKhaoSat = ranked.TongCongTyHopLe,
            SinhVien = new()
            {
                MaSV = student.MaSV, HoTen = student.HoTen, Lop = student.Lop, Gpa = student.Gpa,
                ChuyenNganh = student.ChuyenNganh, KyNang = student.KyNang, CongNghe = student.CongNghe,
                DuAnDaThucHien = student.DuAnDaThucHien, MaHoSo = student.HoSoNangLuc?.MaHoSo ?? "CHUA_CO_HO_SO",
                NDHoSo = student.HoSoNangLuc?.NDHoSo
            },
            TopKGoiY = ranked.Items.Select(x => new GoiYCongTyItemDto
            {
                MaCongTy = x.MaCongTy, MaViTri = x.MaViTri, MaDot = x.MaDot, TenCongTy = x.TenCongTy, ViTriTuyen = x.ViTriTuyen,
                ThoiGian = "Theo đợt " + ranked.MaDot, SoLuongNhan = x.SoLuongNhan, YeuCau = x.YeuCau,
                TiLeTuongThich = x.TiLeTuongThich, RankingScore = x.RankingScore, NgayGoiY = (clock ?? TimeProvider.System).GetUtcNow().ToOffset(TimeSpan.FromHours(7)).DateTime,
                KyNangPhuHop = x.TuKhoaTrungKhop.ToList(), DanhGiaDoTuongThich = ranked.DaSuDungModelTrain ? "Thứ hạng tham khảo" : "Tham khảo theo nội dung"
            }).ToList()
        };
    }

    public Task<GoiYCongTyResponse> RecalculateTopKAsync(string maSV, int topK = 5, string? maDot = null, CancellationToken cancellationToken = default)
        => GetTopKGoiYAsync(maSV, topK, maDot, cancellationToken);

    public async Task<bool> CapNhatHoSoAsync(string maSV, CapNhatHoSoRequest request)
    {
        if (request.KyNang?.Length > 500 || request.CongNghe?.Length > 500 || request.DuAnDaThucHien?.Length > 1000 || request.NDHoSo?.Length > 10000)
            throw new ArgumentException("Kỹ năng/công nghệ tối đa 500 ký tự, dự án 1.000, mô tả năng lực 10.000 ký tự.");
        await repository.CapNhatHoSoAsync(maSV, request.NDHoSo, request.KyNang, request.CongNghe, request.DuAnDaThucHien);
        return true;
    }
}
