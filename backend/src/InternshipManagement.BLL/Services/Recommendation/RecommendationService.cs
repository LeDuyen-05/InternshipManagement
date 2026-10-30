using System.Text.RegularExpressions;
using InternshipManagement.BLL.Common;
using InternshipManagement.BLL.DTOs.Recommendation;
using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.Recommendation;

// Both API contracts share business eligibility, LTR and the explicit baseline fallback.
public class RecommendationService(AppDbContext db, TimeProvider? clock = null, ILtrScorer? scorer = null)
{
    private readonly TimeProvider _clock = clock ?? TimeProvider.System;
    private static void Validate(string? round, int k)
    {
        if (string.IsNullOrWhiteSpace(round)) throw new ArgumentException("Vui lòng chọn đợt thực tập để xem gợi ý.");
        if (k is < 1 or > 20) throw new ArgumentException("Top-K phải là số nguyên từ 1 đến 20.");
    }

    public async Task<RecommendationResponse> RecommendAsync(string maSV, int k = 5, bool persist = false, string? maDot = null, CancellationToken cancellationToken = default)
    {
        Validate(maDot, k);
        if (persist) throw new InvalidOperationException("Chưa lưu gợi ý vào bảng cũ vì bảng này không có mã đợt/phiên bản hồ sơ. Hãy dùng kết quả tính trực tiếp theo đợt.");
        var student = await db.SinhViens.AsNoTracking().Include(x => x.HoSoNangLuc).SingleOrDefaultAsync(x => x.MaSV == maSV)
            ?? throw new KeyNotFoundException("Không tìm thấy sinh viên.");
        var round = await db.DotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaSo == maDot)
            ?? throw new KeyNotFoundException("Không tìm thấy đợt thực tập.");
        var state = await db.ChotDotThucTaps.AsNoTracking().SingleOrDefaultAsync(x => x.MaDot == maDot);
        RecommendationResponse Empty(string message, int count = 0) => new(student.MaSV, student.HoTen, student.HoSoNangLuc?.MaHoSo ?? "CHUA_CO_HO_SO", k, [], round.MaSo, count, message);
        if (round.TrangThai != "DangDienRa" || (state is not null && state.TrangThai != "ChuaChot"))
            return Empty("Đợt không mở tiếp nhận mới hoặc đã chốt; không gợi ý đăng ký mới trong đợt này.");

        var eligible = (await new Admin.CompanyRoundService(db, _clock).AvailableAsync(maDot))
            .Where(x => !string.IsNullOrWhiteSpace(x.YeuCau)).OrderBy(x => x.MaCongTy, StringComparer.Ordinal)
            .ThenBy(x => x.MaViTri, StringComparer.Ordinal).ToList();
        if (eligible.Count == 0) return Empty("Chưa có công ty/JD hợp lệ còn nhận đăng ký trong đợt đang chọn.");

        var eligibleCompanyCount = eligible.Select(x => x.MaCongTy).Distinct().Count();
        // GET không tạo hồ sơ hoặc tự gán GPA/chuyên ngành mặc định.
        var actualFields = new[] { student.KyNang, student.CongNghe, student.DuAnDaThucHien, student.HoSoNangLuc?.NDHoSo };
        if (actualFields.All(string.IsNullOrWhiteSpace)) return Empty("Hãy cập nhật kỹ năng, công nghệ, dự án hoặc mô tả năng lực để nhận gợi ý.", eligibleCompanyCount);
        static string Text(InternshipManagement.DAL.Entities.SinhVien sv) => string.Join(" . ",
            new[] { sv.HoSoNangLuc?.NDHoSo, sv.KyNang, sv.CongNghe, sv.DuAnDaThucHien, sv.ChuyenNganh }.Where(x => !string.IsNullOrWhiteSpace(x)));
        var profileText = Text(student);
        var query = Tokenize(profileText);
        if (query.Count == 0) return Empty("Hồ sơ chưa có nội dung năng lực có thể đối sánh.", eligibleCompanyCount);
        var jobs = eligible.Select((x, index) => new LtrJob(index.ToString(System.Globalization.CultureInfo.InvariantCulture), x.ViTriTuyen ?? "", x.YeuCau!)).ToList();
        var attempt = scorer is null ? new LtrAttempt(null, "Disabled") : await scorer.ScoreAsync(
            new(profileText, student.Gpa is null ? null : (double)student.Gpa.Value), jobs, cancellationToken);
        cancellationToken.ThrowIfCancellationRequested();
        // Inference may take seconds: re-read business data before returning any result.
        var latest = (await new Admin.CompanyRoundService(db, _clock).AvailableAsync(maDot))
            .Where(x => !string.IsNullOrWhiteSpace(x.YeuCau)).OrderBy(x => x.MaCongTy, StringComparer.Ordinal).ThenBy(x => x.MaViTri, StringComparer.Ordinal).ToList();
        if (latest.Count == 0) return Empty("Không còn JD hợp lệ nhận đăng ký trong đợt; danh sách vừa được cập nhật.");
        var latestStudent = await db.SinhViens.AsNoTracking().Include(x => x.HoSoNangLuc).SingleAsync(x => x.MaSV == maSV, cancellationToken);
        bool SameOffer(InternshipManagement.BLL.DTOs.DangKyThucTap.CongTyDto a, InternshipManagement.BLL.DTOs.DangKyThucTap.CongTyDto b) =>
            a.MaCongTy == b.MaCongTy && a.MaViTri == b.MaViTri && a.ViTriTuyen == b.ViTriTuyen && a.YeuCau == b.YeuCau;
        if (Text(latestStudent) != profileText || latestStudent.Gpa != student.Gpa || latest.Any(x => !eligible.Any(y => SameOffer(x, y))))
            attempt = new(null, "InputChanged");
        var scoreByOffer = attempt.Items?.ToDictionary(x => x.Id, StringComparer.Ordinal);
        var oldOffers = eligible;
        eligible = latest;
        student = latestStudent;
        query = Tokenize(Text(student));
        if (new[] { student.KyNang, student.CongNghe, student.DuAnDaThucHien, student.HoSoNangLuc?.NDHoSo }.All(string.IsNullOrWhiteSpace) || query.Count == 0)
            return Empty("Hãy cập nhật nội dung năng lực để nhận gợi ý.");
        eligibleCompanyCount = eligible.Select(x => x.MaCongTy).Distinct().Count();
        var trained = scoreByOffer is not null;
        var documents = eligible.Select(x => Tokenize(x.ViTriTuyen + " " + x.YeuCau)).ToList();
        var model = new RankingModel();
        if (!trained) model.Train(documents);
        var ranked = eligible.Select((offer, index) =>
            {
                var score = trained ? scoreByOffer![oldOffers.FindIndex(x => SameOffer(offer, x)).ToString(System.Globalization.CultureInfo.InvariantCulture)] : null;
                var cosine = score?.TfidfCosine ?? Math.Clamp(model.Score(query, documents[index]), 0, 1);
                return new { Offer = offer, Document = documents[index], Score = score?.RankingScore ?? cosine, Cosine = cosine };
            })
            .Where(x => double.IsFinite(x.Score) && (trained || x.Score > 0)).OrderByDescending(x => x.Score).ThenBy(x => x.Offer.MaViTri, StringComparer.Ordinal)
            .GroupBy(x => x.Offer.MaCongTy).Select(g => g.First()).OrderByDescending(x => x.Score).ThenBy(x => x.Offer.MaCongTy, StringComparer.Ordinal)
            .Take(k).Select((x, index) => new RecommendationItem(x.Offer.MaCongTy, x.Offer.TenCongTy,
                Math.Round(x.Cosine, 6), trained ? null : Math.Round(x.Score * 100, 2), index + 1, x.Offer.YeuCau!, round.MaSo,
                x.Offer.ViTriTuyen!, x.Offer.SoLuongNhan ?? 0,
                query.Keys.Intersect(x.Document.Keys).OrderBy(t => t, StringComparer.Ordinal).Take(12).ToList(), x.Offer.MaViTri,
                trained ? x.Score : null)).ToList();
        return new(student.MaSV, student.HoTen, student.HoSoNangLuc?.MaHoSo ?? "CHUA_CO_HO_SO", k, ranked, round.MaSo,
            eligibleCompanyCount, ranked.Count == 0 ? "Chưa tìm thấy nội dung hồ sơ khớp với JD đang mở trong đợt. Có thể tìm công ty hoặc liên hệ Khoa hỗ trợ."
                : trained ? "Gợi ý LambdaMART tham khảo, huấn luyện/đánh giá trên nhãn luật; chưa có đánh giá người chấm độc lập."
                : "Đang dùng TF-IDF/cosine tham khảo" + (attempt.FallbackReason == "Disabled" ? "; dịch vụ mô hình chưa bật." : "; dịch vụ mô hình chưa sẵn sàng hoặc dữ liệu vừa đổi."),
            trained ? "LightGBM LambdaMART v3 (six_features_wide)" : "TF-IDF + cosine (baseline tham khảo)",
            trained ? "TrainedModel" : attempt.FallbackReason == "Disabled" ? "BaselineOnly" : "BaselineFallback", trained,
            trained ? "Điểm xếp hạng, không phải phần trăm hoặc xác suất trúng tuyển." : "Độ tương đồng nội dung, không phải xác suất trúng tuyển.",
            trained ? attempt.ModelVersion : null, trained ? null : attempt.FallbackReason);
    }

    public async Task<EvaluationResponse> EvaluateAsync(string maSV, int k = 5, string? maDot = null)
    {
        Validate(maDot, k);
        if (!await db.SinhViens.AnyAsync(x => x.MaSV == maSV)) throw new KeyNotFoundException("Không tìm thấy sinh viên.");
        if (!await db.DotThucTaps.AnyAsync(x => x.MaSo == maDot)) throw new KeyNotFoundException("Không tìm thấy đợt thực tập.");
        // Không dùng phân bổ/nguyện vọng hiện tại làm nhãn test hoặc trả NDCG giả cho web.
        return new(k);
    }

    private static readonly Regex TokenRx = new(@"[\p{L}\p{N}][\p{L}\p{N}#+]*", RegexOptions.Compiled);
    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
        { "và", "của", "với", "cho", "các", "một", "là", "có", "được", "trong", "tại", "the", "and", "of", "for", "with", "to", "in", "a", "an" };
    private static readonly HashSet<string> ShortAllow = new(StringComparer.OrdinalIgnoreCase) { "c", "r" };
    private static Dictionary<string, double> Tokenize(string text) => TokenRx.Matches(text.ToLowerInvariant()).Select(x => x.Value)
        .Where(x => !StopWords.Contains(x) && (x.Length > 1 || ShortAllow.Contains(x)))
        .GroupBy(x => x, StringComparer.Ordinal).ToDictionary(g => g.Key, g => (double)g.Count(), StringComparer.Ordinal);
}
