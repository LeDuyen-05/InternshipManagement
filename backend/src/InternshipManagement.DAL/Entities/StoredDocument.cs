namespace InternshipManagement.DAL.Entities;

// Operational upload metadata; relations and academic locks are revalidated by DocumentService.
public class StoredDocument
{
    public string Id { get; set; } = default!;
    public string Kind { get; set; } = default!;
    public string ResourceId { get; set; } = default!;
    public string? RoundId { get; set; }
    public string ActorId { get; set; } = default!;
    public string RequestId { get; set; } = default!;
    public string ObjectKey { get; set; } = default!;
    public string FileName { get; set; } = default!;
    public string ContentType { get; set; } = default!;
    public long Size { get; set; }
    public string Sha256 { get; set; } = default!;
    public string State { get; set; } = "Uploading";
    public string StorageId { get; set; } = default!;
    public DateTimeOffset? CleanedAt { get; set; }
    public string? CleanedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset LastAttemptAt { get; set; }
    public DateTimeOffset? ReadyAt { get; set; }
}
