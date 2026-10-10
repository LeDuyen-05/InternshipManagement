using System.Globalization;
using System.Text.RegularExpressions;
using InternshipManagement.BLL.DTOs.Recommendation;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.BLL.Services.Recommendation;

public class RecommendationService
{
    private readonly AppDbContext _db;
    public RecommendationService(AppDbContext db) => _db = db;

    public async Task<RecommendationResponse> RecommendAsync(string maSV, int k = 5)
    {
        k = Math.Clamp(k, 1, 20);
        var sv = await _db.SinhViens.AsNoTracking().FirstOrDefaultAsync(x => x.MaSV == maSV)
                 ?? throw new KeyNotFoundException("Không tìm thấy sinh viên.");
        var profile = await _db.HoSoNangLucs.AsNoTracking().FirstOrDefaultAsync(x => x.MaSinhVien == maSV);
        var profileText = profile?.NDHoSo;
        if (string.IsNullOrWhiteSpace(profileText))
            profileText = $"{sv.KyNang} {sv.ChuyenNganh} {sv.CongNghe} {sv.DuAnDaThucHien}";

        var companies = await _db.CongTys.AsNoTracking().Where(x => x.TrangThai == "DaDuyet").ToListAsync();
        var ranked = Rank(profileText!, companies).Take(k).ToList();

        if (profile is not null && ranked.Count > 0)
        {
            var old = await _db.GoiYCongTys.Where(x => x.MaHoSo == profile.MaHoSo).ToListAsync();
            _db.GoiYCongTys.RemoveRange(old);
            foreach (var x in ranked)
            {
                _db.GoiYCongTys.Add(new GoiYCongTy
                {
                    MaSo = $"GY{Guid.NewGuid():N}"[..20], MaHoSo = profile.MaHoSo, MaCongTy = x.company.MaCongTy,
                    TiLeTuongThich = Math.Round((decimal)x.score * 100m, 2), NgayGoiY = DateTime.Today
                });
            }
            await _db.SaveChangesAsync();
        }

        var items = ranked.Select((x, i) => new RecommendationItem(x.company.MaCongTy, x.company.TenCongTy, Math.Round(x.score, 6), Math.Round(x.score * 100, 2), i + 1, x.company.YeuCau)).ToList();
        return new RecommendationResponse(maSV, sv.HoTen, profile?.MaHoSo ?? "CHUA_CO_HO_SO", k, items);
    }

    public async Task<EvaluationResponse> EvaluateAsync(string maSV, int k = 5)
    {
        k = Math.Clamp(k, 1, 20);
        var sv = await _db.SinhViens.AsNoTracking().FirstOrDefaultAsync(x => x.MaSV == maSV) ?? throw new KeyNotFoundException("Không tìm thấy sinh viên.");
        var profile = await _db.HoSoNangLucs.AsNoTracking().FirstOrDefaultAsync(x => x.MaSinhVien == maSV);
        var text = profile?.NDHoSo;
        if (string.IsNullOrWhiteSpace(text)) text = $"{sv.KyNang} {sv.ChuyenNganh} {sv.CongNghe} {sv.DuAnDaThucHien}";
        var companies = await _db.CongTys.AsNoTracking().Where(x => x.TrangThai == "DaDuyet").ToListAsync();
        var ranked = Rank(text!, companies).ToList();
        var assigned = await _db.PhanBoThucTaps.AsNoTracking().Where(x => x.MaSinhVien == maSV).Select(x => x.MaCongTy).ToListAsync();
        var approved = await _db.DangKyThucTaps.AsNoTracking().Where(x => x.MaSinhVien == maSV && x.TrangThai == "DaDuyet").Select(x => x.MaCongTy).ToListAsync();
        var relevant = new Dictionary<string, double>();
        foreach (var id in approved) relevant[id] = Math.Max(relevant.GetValueOrDefault(id), 2);
        foreach (var id in assigned) relevant[id] = Math.Max(relevant.GetValueOrDefault(id), 3);

        var top = ranked.Take(k).Select(x => relevant.GetValueOrDefault(x.company.MaCongTy)).ToList();
        var ideal = relevant.Values.OrderByDescending(x => x).Take(k).ToList();
        var dcg = Dcg(top); var idcg = Dcg(ideal);
        return new EvaluationResponse(k, idcg == 0 ? 0 : Math.Round(dcg / idcg, 6), idcg, dcg);
    }

    private static List<(CongTy company, double score)> Rank(string query, List<CongTy> companies)
    {
        var docs = companies.Select(x => Tokenize(x.YeuCau ?? "")).ToList();
        var q = Tokenize(query);
        var model = new RankingModel();
        model.Train(docs);
        var vocabulary = model.Vocabulary.ToList();
        var result = new List<(CongTy, double)>();
        for (var i = 0; i < companies.Count; i++)
        {
            result.Add((companies[i], model.Score(q, docs[i])));
        }
        return result.OrderByDescending(x => x.Item2).ThenBy(x => x.Item1.MaCongTy).ToList();
    }

    private static Dictionary<string, double> Tokenize(string text)
    {
        var words = Regex.Matches(text.ToLower(new CultureInfo("vi-VN")), @"[\p{L}\p{N}]+")
            .Select(x => x.Value).Where(x => x.Length > 1).ToList();
        return words.GroupBy(x => x).ToDictionary(x => x.Key, x => (double)x.Count());
    }

    private static double Dcg(IEnumerable<double> relevances)
    {
        var i = 1; var sum = 0d;
        foreach (var rel in relevances) { sum += (Math.Pow(2, rel) - 1) / Math.Log(i + 1, 2); i++; }
        return sum;
    }
}
