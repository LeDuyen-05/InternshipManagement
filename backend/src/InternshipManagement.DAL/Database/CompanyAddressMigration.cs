namespace InternshipManagement.DAL.Database;

public static class CompanyAddressMigration
{
    public static IReadOnlyList<string> Statements { get; } = new[] {
        "IF COL_LENGTH('CONGTY', 'DiaChi') IS NULL ALTER TABLE CONGTY ADD DiaChi NVARCHAR(500) NULL;"
    };
}
