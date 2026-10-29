namespace InternshipManagement.BLL.Services.Recommendation;

/// <summary>
/// Ranking model đúng phạm vi đã chốt: score chính là Cosine Similarity của hai vector TF-IDF.
/// "Huấn luyện" ở đây là bước xây vocabulary/IDF trên tập dữ liệu huấn luyện và dùng score
/// cosine để học thứ tự ưu tiên. Không bổ sung thuật toán ML thứ hai.
/// </summary>
public sealed class RankingModel
{
    public IReadOnlyList<string> Vocabulary { get; private set; } = Array.Empty<string>();
    public IReadOnlyDictionary<string, double> Idf { get; private set; } = new Dictionary<string, double>();

    public void Train(IReadOnlyList<IReadOnlyDictionary<string, double>> trainingDocuments)
    {
        Vocabulary = trainingDocuments.SelectMany(x => x.Keys).Distinct().OrderBy(x => x).ToList();
        var n = trainingDocuments.Count + 1d;
        Idf = Vocabulary.ToDictionary(term => term, term => Math.Log(n / (1d + trainingDocuments.Count(d => d.ContainsKey(term)))) + 1d);
    }

    public double Score(IReadOnlyDictionary<string, double> query, IReadOnlyDictionary<string, double> document)
    {
        var dot=0d; var nq=0d; var nd=0d;
        foreach (var term in Vocabulary)
        {
            var q=query.GetValueOrDefault(term) * Idf.GetValueOrDefault(term,1);
            var d=document.GetValueOrDefault(term) * Idf.GetValueOrDefault(term,1);
            dot += q*d; nq += q*q; nd += d*d;
        }
        return nq==0 || nd==0 ? 0 : dot/(Math.Sqrt(nq)*Math.Sqrt(nd));
    }
}
