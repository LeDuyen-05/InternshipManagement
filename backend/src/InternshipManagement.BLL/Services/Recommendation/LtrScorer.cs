using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace InternshipManagement.BLL.Services.Recommendation;

public sealed class LtrOptions
{
    public bool Enabled { get; set; }
    public string Endpoint { get; set; } = "http://127.0.0.1:5210/v1/score";
    public string Token { get; set; } = "";
    public int TimeoutMilliseconds { get; set; } = 5000;
    public const string ModelHash = "6dc17b7ad73ef449be9f8cb6154d90b011f540ef71086af03fbe3b9c992b4471";
    public const string EncoderRevision = "e8f8c211226b894fcb81acc59f3b34ba3efd5f42";

    public void Validate()
    {
        if (!Enabled) return;
        if (!Uri.TryCreate(Endpoint, UriKind.Absolute, out var uri) || uri.Scheme != "http" ||
            uri.Host != "127.0.0.1" || uri.AbsolutePath != "/v1/score" || uri.Query != "" || uri.UserInfo != "" || uri.Fragment != "" ||
            Token.Length < 32 || Token.Any(c => char.IsWhiteSpace(c) || char.IsControl(c)) || TimeoutMilliseconds is < 100 or > 15000)
            throw new InvalidOperationException("Inference cần endpoint loopback /v1/score, khóa riêng >=32 ký tự và timeout 100–15000 ms.");
    }
}

public sealed record LtrProfile(string Text, double? Gpa);
public sealed record LtrJob(string Id, string Title, string Description);
public sealed record LtrScore([property: JsonRequired] string Id,
    [property: JsonPropertyName("ranking_score"), JsonRequired] double RankingScore,
    [property: JsonPropertyName("tfidf_cosine"), JsonRequired] double TfidfCosine);
public sealed record LtrAttempt(IReadOnlyList<LtrScore>? Items, string? FallbackReason = null, string? ModelVersion = null);
public interface ILtrScorer
{
    Task<LtrAttempt> ScoreAsync(LtrProfile profile, IReadOnlyList<LtrJob> jobs, CancellationToken cancellationToken = default);
}

public sealed class HttpLtrScorer(HttpClient http, LtrOptions options) : ILtrScorer
{
    private sealed record WireResponse(
        [property: JsonPropertyName("schema_version")] string Schema,
        string Status, [property: JsonPropertyName("model_sha256")] string ModelHash,
        [property: JsonPropertyName("encoder_revision")] string EncoderRevision,
        [property: JsonPropertyName("score_kind")] string ScoreKind,
        [property: JsonPropertyName("label_type")] string LabelType, List<LtrScore>? Items);

    public async Task<LtrAttempt> ScoreAsync(LtrProfile profile, IReadOnlyList<LtrJob> jobs, CancellationToken cancellationToken = default)
    {
        if (!options.Enabled) return new(null, "Disabled");
        options.Validate();
        if (jobs.Count > 500 || profile.Gpa is < 0 or > 4) return new(null, "InputNotSupported");
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(options.TimeoutMilliseconds);
        using var request = new HttpRequestMessage(HttpMethod.Post, options.Endpoint);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.Token);
        var payload = JsonSerializer.SerializeToUtf8Bytes(new { schema_version = "web-v3-1", profile, jobs }, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        if (payload.Length > 2 * 1024 * 1024) return new(null, "InputNotSupported");
        request.Content = new ByteArrayContent(payload);
        request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
        try
        {
            using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, timeout.Token);
            if (!response.IsSuccessStatusCode) return new(null, "Unavailable");
            // Bound the response as well as the entire send/body-read operation.
            const int maxBytes = 256 * 1024;
            if (response.Content.Headers.ContentLength > maxBytes) return new(null, "InvalidResponse");
            await using var stream = await response.Content.ReadAsStreamAsync(timeout.Token);
            using var buffer = new MemoryStream();
            var chunk = new byte[8192];
            int count;
            while ((count = await stream.ReadAsync(chunk, timeout.Token)) > 0)
            {
                if (buffer.Length + count > maxBytes) return new(null, "InvalidResponse");
                buffer.Write(chunk, 0, count);
            }
            var body = JsonSerializer.Deserialize<WireResponse>(buffer.ToArray(), new JsonSerializerOptions(JsonSerializerDefaults.Web));
            if (body is null || body.Schema != "web-v3-1" || body.Status != "ready" || body.ModelHash != LtrOptions.ModelHash ||
                body.EncoderRevision != LtrOptions.EncoderRevision || body.ScoreKind != "ranking_score_not_probability" || body.LabelType != "weak_rule" ||
                body.Items is null || body.Items.Count != jobs.Count ||
                body.Items.Any(x => x is null || !double.IsFinite(x.RankingScore) || !double.IsFinite(x.TfidfCosine) || x.TfidfCosine is < -0.000001 or > 1.000001) ||
                !body.Items.Select(x => x.Id).Order(StringComparer.Ordinal).SequenceEqual(jobs.Select(x => x.Id).Order(StringComparer.Ordinal)))
                return new(null, "InvalidResponse");
            return new(body.Items, ModelVersion: body.ModelHash);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested) { return new(null, "Timeout"); }
        catch (HttpRequestException) { return new(null, "Unavailable"); }
        catch (IOException) { return new(null, "Unavailable"); }
        catch (JsonException) { return new(null, "InvalidResponse"); }
    }
}
