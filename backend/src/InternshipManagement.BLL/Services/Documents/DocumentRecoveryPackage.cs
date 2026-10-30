using System.Security.Cryptography;
using System.Text.RegularExpressions;

namespace InternshipManagement.BLL.Services.Documents;

// Technical recovery metadata, never returned by ordinary document APIs.
public record RecoveryDocument(string Id, string Kind, string ResourceId, string? RoundId,
    string StorageId, string ObjectKey, string FileName, string ContentType, long Size, string Sha256);
public record RecoveryManifest(int Version, string Database, string DatabaseSha256, DateTimeOffset CreatedAt,
    List<RecoveryDocument> Documents);

public static class DocumentRecoveryPackage
{
    public static void Validate(RecoveryManifest manifest, IReadOnlyList<RecoveryDocument> snapshot, string storageId)
    {
        if (manifest.Version != 1 || manifest.Database != "QuanLyThucTap_GVHD_Test_20261023_101930"
            || !Regex.IsMatch(manifest.DatabaseSha256, "^[A-Fa-f0-9]{64}$"))
            throw new InvalidOperationException("Gói phục hồi không đúng phiên bản/CSDL thử.");
        if (manifest.Documents.Count != snapshot.Count || manifest.Documents.Select(d => d.Id).Distinct().Count() != snapshot.Count
            || manifest.Documents.Select(d => d.ObjectKey).Distinct().Count() != snapshot.Count)
            throw new InvalidOperationException("Danh mục tệp không khớp bản sao CSDL.");
        var expected = snapshot.ToDictionary(d => d.Id);
        foreach (var d in manifest.Documents) {
            if (!Regex.IsMatch(d.Id, "^[a-f0-9]{32}$") || !DocumentAccessService.Kinds.Contains(d.Kind)
                || !Regex.IsMatch(d.ObjectKey, "^internship/(?:[a-f0-9]{32}|recovery-test/[a-f0-9]{32}/[a-f0-9]{32})$")
                || d.Size is <= 0 or > 10 * 1024 * 1024 || !Regex.IsMatch(d.Sha256, "^[A-Fa-f0-9]{64}$")
                || d.StorageId != storageId || !expected.TryGetValue(d.Id, out var original) || original != d)
                throw new InvalidOperationException("Metadata tệp/kho không khớp bản sao CSDL.");
        }
    }

    public static void ValidateBytes(RecoveryDocument document, byte[] bytes)
    {
        if (bytes.LongLength != document.Size
            || !Convert.ToHexString(SHA256.HashData(bytes)).Equals(document.Sha256, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Tệp backup thiếu/hỏng hoặc sai checksum.");
    }

    public static void RequireTestDatabase(string name)
    {
        if (!Regex.IsMatch(name, "^IM_RestoreCheck_[0-9]{8}_[0-9]{6}$"))
            throw new InvalidOperationException("Chỉ được dùng CSDL phục hồi thử riêng; không dùng nguồn/gốc.");
    }
}
