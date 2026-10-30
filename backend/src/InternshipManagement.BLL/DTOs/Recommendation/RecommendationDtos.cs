namespace InternshipManagement.BLL.DTOs.Recommendation;

public record RecommendationItem(string MaCongTy, string TenCongTy, double CosineScore, double? TiLeTuongThich, int Rank, string YeuCau,
    string MaDot, string ViTriTuyen, int SoLuongNhan, IReadOnlyList<string> TuKhoaTrungKhop, string? MaViTri = null, double? RankingScore = null);
public record RecommendationResponse(string MaSV, string HoTen, string MaHoSo, int K, IReadOnlyList<RecommendationItem> Items,
    string MaDot, int TongCongTyHopLe, string ThongBao,
    string ThuatToan = "TF-IDF + cosine (baseline tham khảo)", string ModelStatus = "NotApplicable",
    bool DaSuDungModelTrain = false, string YNghiaDiem = "Độ tương đồng nội dung, không phải xác suất trúng tuyển.",
    string? ModelVersion = null, string? FallbackReason = null);
public record EvaluationResponse(int K, double? Ndcg = null, double? IdealDcg = null, double? Dcg = null,
    string Status = "OfflineWeakLabelEvaluation", string Message = "Kết quả nghiên cứu hiện có dùng nhãn luật; không tính NDCG từ hồ sơ nghiệp vụ hiện tại.");
