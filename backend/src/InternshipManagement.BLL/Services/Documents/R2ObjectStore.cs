using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;

namespace InternshipManagement.BLL.Services.Documents;

public class DocumentStorageOptions
{
    public bool Enabled { get; set; }
    public string Endpoint { get; set; } = "";
    public string Bucket { get; set; } = "";
    public string AccessKeyId { get; set; } = "";
    public string SecretAccessKey { get; set; } = "";
    public int MaxFileMb { get; set; } = 10;
    public int MaxFilesPerResource { get; set; } = 20;
    public string StorageId => Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(Endpoint.TrimEnd('/').ToLowerInvariant() + "/" + Bucket)));
    public void Validate()
    {
        if (MaxFileMb is < 1 or > 10 || MaxFilesPerResource is < 1 or > 100) throw new InvalidOperationException("Giới hạn kho tệp không hợp lệ.");
        if (!Enabled) return;
        if (!Uri.TryCreate(Endpoint, UriKind.Absolute, out var uri) || uri.Scheme != "https" || uri.Port != 443
            || !System.Text.RegularExpressions.Regex.IsMatch(uri.Host, "^[a-fA-F0-9]{32}\\.r2\\.cloudflarestorage\\.com$")
            || uri.AbsolutePath != "/" || !string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.UserInfo)
            || !System.Text.RegularExpressions.Regex.IsMatch(Bucket, "^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$")
            || string.IsNullOrWhiteSpace(AccessKeyId) || string.IsNullOrWhiteSpace(SecretAccessKey))
            throw new InvalidOperationException("Cấu hình R2 chưa hợp lệ; kiểm tra endpoint, bucket và khóa tại backend.");
    }
}
public interface IDocumentObjectStore
{
    Task PutAsync(string key, byte[] bytes, string contentType, CancellationToken ct);
    Task<byte[]> GetAsync(string key, long expectedSize, CancellationToken ct);
    Task DeleteTemporaryAsync(string key, CancellationToken ct);
}
public sealed class R2ObjectStore(DocumentStorageOptions options) : IDocumentObjectStore
{
    private AmazonS3Client Client()
    {
        options.Validate();
        if (!options.Enabled) throw new InvalidOperationException("Kho tệp chưa được cấu hình.");
        return new(new BasicAWSCredentials(options.AccessKeyId, options.SecretAccessKey), new AmazonS3Config {
            ServiceURL = options.Endpoint, AuthenticationRegion = "auto", ForcePathStyle = true,
            Timeout = TimeSpan.FromSeconds(60), MaxErrorRetry = 1 });
    }
    public async Task PutAsync(string key, byte[] bytes, string contentType, CancellationToken ct)
    {
        using var client = Client(); using var stream = new MemoryStream(bytes, false);
        await client.PutObjectAsync(new PutObjectRequest { BucketName = options.Bucket, Key = key, InputStream = stream,
            ContentType = contentType, DisablePayloadSigning = true, DisableDefaultChecksumValidation = true, AutoCloseStream = false }, ct);
    }
    public async Task<byte[]> GetAsync(string key, long expectedSize, CancellationToken ct)
    {
        using var client = Client(); using var response = await client.GetObjectAsync(options.Bucket, key, ct);
        if (response.ContentLength != expectedSize || expectedSize > options.MaxFileMb * 1024L * 1024) throw new InvalidOperationException("Kích thước tệp không khớp hồ sơ lưu.");
        using var output = new MemoryStream(); var buffer = new byte[81920]; int n;
        while ((n = await response.ResponseStream.ReadAsync(buffer, ct)) > 0) {
            if (output.Length + n > expectedSize) throw new InvalidOperationException("Tệp vượt dung lượng đã ghi nhận.");
            await output.WriteAsync(buffer.AsMemory(0, n), ct);
        }
        if (output.Length != expectedSize) throw new InvalidOperationException("Nội dung tệp chưa đầy đủ.");
        return output.ToArray();
    }
    public async Task DeleteTemporaryAsync(string key, CancellationToken ct)
    {
        using var client = Client(); await client.DeleteObjectAsync(options.Bucket, key, ct);
    }
}
