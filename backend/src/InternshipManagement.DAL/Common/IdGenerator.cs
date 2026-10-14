namespace InternshipManagement.DAL.Common;

public static class IdGenerator
{
    public static string New(string prefix) => $"{prefix}{Guid.NewGuid():N}"[..20];
}
