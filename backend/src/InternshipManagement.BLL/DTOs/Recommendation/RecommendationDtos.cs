namespace InternshipManagement.BLL.DTOs.Recommendation;

public record RecommendationItem(string MaCongTy, string TenCongTy, double CosineScore, double TiLeTuongThich, int Rank, string YeuCau);
public record RecommendationResponse(string MaSV, string HoTen, string MaHoSo, int K, IReadOnlyList<RecommendationItem> Items);
public record EvaluationResponse(int K, double Ndcg, double IdealDcg, double Dcg);
