using System.Text.RegularExpressions;
using InternshipManagement.BLL.DTOs.GoiYCongTy;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;

namespace InternshipManagement.BLL.Services.GoiYCongTy;

public class GoiYCongTyService : IGoiYCongTyService
{
    private readonly IGoiYCongTyRepository _repository;

    // Danh mục từ khóa công nghệ nhận diện phân tích (Explainable AI - XAI)
    private static readonly string[] PhoBienKeywords = new[]
    {
        "C#", ".NET", "ASP.NET", "Java", "Spring Boot", "Spring", "Python", "FastAPI", "Django",
        "Machine Learning", "AI", "React", "ReactJS", "Vue", "Angular", "TypeScript", "JavaScript",
        "NodeJS", "Express", "SQL", "SQL Server", "MySQL", "PostgreSQL", "MongoDB", "Redis",
        "Docker", "Kubernetes", "Git", "RESTful API", "Microservices", "OOP", "HTML", "CSS",
        "Tailwind", "Bootstrap", "AWS", "Azure", "CI/CD", "Linux", "Scrum", "Agile", "Unit Test",
        "Flutter", "Android", "iOS", "Kotlin", "Swift", "PHP", "Laravel"
    };

    public GoiYCongTyService(IGoiYCongTyRepository repository)
    {
        _repository = repository;
    }

    public async Task<GoiYCongTyResponse> GetTopKGoiYAsync(string maSV, int topK = 5)
    {
        var hoSo = await _repository.EnsureHoSoNangLucAsync(maSV);
        var sv = await _repository.GetSinhVienWithHoSoAsync(maSV);

        if (sv == null)
        {
            throw new ArgumentException($"Không tìm thấy sinh viên có mã '{maSV}'.");
        }

        var listGoiY = await _repository.GetGoiYByHoSoAsync(hoSo.MaHoSo, topK);

        // Nếu bảng GOIYCONGTY chưa có dữ liệu cho hồ sơ này, chạy thuật toán tính toán và lưu DB
        if (listGoiY == null || listGoiY.Count == 0)
        {
            return await RecalculateTopKAsync(maSV, topK);
        }

        var congTyList = await _repository.GetCongTyDaDuyetAsync();

        var response = new GoiYCongTyResponse
        {
            SinhVien = MapHoSoSinhVien(sv, hoSo),
            TongSoCongTyKhaoSat = congTyList.Count,
            ThuatToan = "TF-IDF + Cosine Similarity Vectorization (Offline Precomputed)",
            NguonDuLieu = "Bảng GOIYCONGTY (SQL Server)",
            TopKGoiY = listGoiY.Select(g =>
            {
                var ct = g.CongTy;
                var matchedSkills = FindMatchingKeywords(hoSo.NDHoSo, ct?.YeuCau ?? "");
                return new GoiYCongTyItemDto
                {
                    MaCongTy = g.MaCongTy,
                    TenCongTy = ct?.TenCongTy ?? g.MaCongTy,
                    ViTriTuyen = ct?.ViTriTuyen,
                    ThoiGian = ct?.ThoiGian,
                    SoLuongNhan = ct?.SoLuongNhan,
                    YeuCau = ct?.YeuCau,
                    TiLeTuongThich = (double)Math.Round(g.TyLeTuongThich, 1),
                    NgayGoiY = g.NgayGoiY,
                    KyNangPhuHop = matchedSkills,
                    DanhGiaDoTuongThich = GetDanhGia((double)g.TyLeTuongThich),
                };
            }).ToList(),
        };

        return response;
    }

    public async Task<GoiYCongTyResponse> RecalculateTopKAsync(string maSV, int topK = 5)
    {
        var hoSo = await _repository.EnsureHoSoNangLucAsync(maSV);
        var sv = await _repository.GetSinhVienWithHoSoAsync(maSV);

        if (sv == null)
        {
            throw new ArgumentException($"Không tìm thấy sinh viên có mã '{maSV}'.");
        }

        var congTyList = await _repository.GetCongTyDaDuyetAsync();

        if (!congTyList.Any())
        {
            return new GoiYCongTyResponse
            {
                SinhVien = MapHoSoSinhVien(sv, hoSo),
                TongSoCongTyKhaoSat = 0,
                NguonDuLieu = "Chưa có công ty được duyệt",
                TopKGoiY = new List<GoiYCongTyItemDto>(),
            };
        }

        // Tính toán độ tương đồng TF-IDF Cosine Similarity trực tiếp
        var calculatedScores = TinhToanDoTuongDong(hoSo.NDHoSo, congTyList);

        var topRows = calculatedScores
            .OrderByDescending(x => x.score)
            .Take(topK)
            .ToList();

        // Chuẩn bị danh sách bản ghi lưu vào bảng GOIYCONGTY (MaSo tối đa 20 ký tự)
        var entityList = topRows.Select((r, idx) => new DAL.Entities.GoiYCongTy
        {
            MaSo = $"GY{DateTime.UtcNow:yyMMddHHmmss}{idx:D2}",
            MaHoSo = hoSo.MaHoSo,
            MaCongTy = r.congTy.MaCongTy,
            TyLeTuongThich = (decimal)Math.Round(r.score, 2),
            NgayGoiY = DateTime.Now,
        }).ToList();

        await _repository.LuuGoiYAsync(hoSo.MaHoSo, entityList);

        return new GoiYCongTyResponse
        {
            SinhVien = MapHoSoSinhVien(sv, hoSo),
            TongSoCongTyKhaoSat = congTyList.Count,
            ThuatToan = "TF-IDF + Cosine Similarity Vectorization (Realtime Sync & Persisted)",
            NguonDuLieu = "Bảng GOIYCONGTY (Đã cập nhật mới)",
            TopKGoiY = topRows.Select(r =>
            {
                var ct = r.congTy;
                var matched = FindMatchingKeywords(hoSo.NDHoSo, ct.YeuCau ?? "");
                return new GoiYCongTyItemDto
                {
                    MaCongTy = ct.MaCongTy,
                    TenCongTy = ct.TenCongTy,
                    ViTriTuyen = ct.ViTriTuyen,
                    ThoiGian = ct.ThoiGian,
                    SoLuongNhan = ct.SoLuongNhan,
                    YeuCau = ct.YeuCau,
                    TiLeTuongThich = Math.Round(r.score, 1),
                    NgayGoiY = DateTime.Now,
                    KyNangPhuHop = matched,
                    DanhGiaDoTuongThich = GetDanhGia(r.score),
                };
            }).ToList(),
        };
    }

    public async Task<bool> CapNhatHoSoAsync(string maSV, CapNhatHoSoRequest request)
    {
        await _repository.CapNhatHoSoAsync(
            maSV,
            request.NDHoSo,
            request.KyNang,
            request.CongNghe,
            request.DuAnDaThucHien
        );

        // Tự động tính toán lại Top-K sau khi cập nhật hồ sơ
        await RecalculateTopKAsync(maSV);
        return true;
    }

    private static HoSoSinhVienDto MapHoSoSinhVien(DAL.Entities.SinhVien sv, DAL.Entities.HoSoNangLuc hoSo)
    {
        return new HoSoSinhVienDto
        {
            MaSV = sv.MaSV,
            HoTen = sv.HoTen,
            Lop = sv.Lop,
            Gpa = sv.Gpa,
            ChuyenNganh = sv.ChuyenNganh,
            KyNang = sv.KyNang,
            CongNghe = sv.CongNghe,
            DuAnDaThucHien = sv.DuAnDaThucHien,
            MaHoSo = hoSo.MaHoSo,
            NDHoSo = hoSo.NDHoSo,
        };
    }

    private static string GetDanhGia(double score)
    {
        if (score >= 80) return "Rất phù hợp (Top Match)";
        if (score >= 65) return "Phù hợp tốt (Good Match)";
        if (score >= 50) return "Tiềm năng (Potential Match)";
        return "Cần trau dồi thêm";
    }

    // Trích xuất các từ khóa công nghệ xuất hiện chung ở cả 2 văn bản
    private static List<string> FindMatchingKeywords(string doc1, string doc2)
    {
        var matched = new List<string>();
        if (string.IsNullOrWhiteSpace(doc1) || string.IsNullOrWhiteSpace(doc2)) return matched;

        var d1Lower = doc1.ToLower();
        var d2Lower = doc2.ToLower();

        foreach (var kw in PhoBienKeywords)
        {
            var pattern = $@"\b{Regex.Escape(kw.ToLower())}\b";
            if (Regex.IsMatch(d1Lower, pattern) && Regex.IsMatch(d2Lower, pattern))
            {
                matched.Add(kw);
            }
        }

        return matched;
    }

    // Thuật toán tính độ tương đồng TF-IDF Cosine Similarity
    private static List<(CongTy congTy, double score)> TinhToanDoTuongDong(string studentDoc, IReadOnlyList<CongTy> congTys)
    {
        var result = new List<(CongTy, double)>();
        if (string.IsNullOrWhiteSpace(studentDoc) || !congTys.Any()) return result;

        // Xây dựng tập từ vựng từ tất cả văn bản
        var allDocs = new List<string> { studentDoc };
        allDocs.AddRange(congTys.Select(c => $"{c.TenCongTy} {c.ViTriTuyen} {c.YeuCau}"));

        var tokenizedDocs = allDocs.Select(Tokenize).ToList();
        var vocabulary = tokenizedDocs.SelectMany(t => t).Distinct().ToList();
        var vocabIndex = vocabulary.Select((word, idx) => (word, idx)).ToDictionary(x => x.word, x => x.idx);

        // Tính IDF: log((N + 1) / (df + 1)) + 1
        int N = allDocs.Count;
        var idf = new double[vocabulary.Count];
        for (int i = 0; i < vocabulary.Count; i++)
        {
            var word = vocabulary[i];
            int df = tokenizedDocs.Count(doc => doc.Contains(word));
            idf[i] = Math.Log((double)(N + 1) / (df + 1)) + 1.0;
        }

        // Tính TF-IDF Vector cho Sinh viên (doc index 0)
        var studentVector = ComputeTfidfVector(tokenizedDocs[0], vocabIndex, idf);

        // Tính Cosine Similarity cho từng công ty
        for (int i = 0; i < congTys.Count; i++)
        {
            var companyDoc = tokenizedDocs[i + 1];
            var companyVector = ComputeTfidfVector(companyDoc, vocabIndex, idf);

            var cosSim = ComputeCosineSimilarity(studentVector, companyVector);
            // Chuẩn hóa sang thang 100%, có ngưỡng sàn thực tế để hiển thị đẹp
            var percentage = Math.Clamp(cosSim * 100.0, 0.0, 100.0);
            result.Add((congTys[i], percentage));
        }

        return result;
    }

    private static List<string> Tokenize(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return new List<string>();
        return Regex.Matches(text.ToLower(), @"[\p{L}\p{N}#\.\+]+")
            .Select(m => m.Value)
            .Where(w => w.Length > 1)
            .ToList();
    }

    private static double[] ComputeTfidfVector(List<string> tokens, Dictionary<string, int> vocabIndex, double[] idf)
    {
        var vector = new double[vocabIndex.Count];
        if (!tokens.Any()) return vector;

        var termCounts = tokens.GroupBy(t => t).ToDictionary(g => g.Key, g => g.Count());

        foreach (var kvp in termCounts)
        {
            if (vocabIndex.TryGetValue(kvp.Key, out int idx))
            {
                double tf = (double)kvp.Value / tokens.Count;
                vector[idx] = tf * idf[idx];
            }
        }

        return vector;
    }

    private static double ComputeCosineSimilarity(double[] v1, double[] v2)
    {
        double dot = 0.0, mag1 = 0.0, mag2 = 0.0;
        for (int i = 0; i < v1.Length; i++)
        {
            dot += v1[i] * v2[i];
            mag1 += v1[i] * v1[i];
            mag2 += v2[i] * v2[i];
        }

        if (mag1 == 0 || mag2 == 0) return 0.0;
        return dot / (Math.Sqrt(mag1) * Math.Sqrt(mag2));
    }
}
