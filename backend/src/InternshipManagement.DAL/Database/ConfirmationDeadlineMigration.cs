namespace InternshipManagement.DAL.Database;

public static class ConfirmationDeadlineMigration
{
    public static IReadOnlyList<string> Statements { get; } = new[] {
        """
        IF COL_LENGTH('DOTTHUCTAP', 'HanXacNhanSV') IS NULL
            ALTER TABLE DOTTHUCTAP ADD HanXacNhanSV DATETIMEOFFSET NULL;
        IF COL_LENGTH('DOTTHUCTAP', 'PhienBanXacNhan') IS NULL
            ALTER TABLE DOTTHUCTAP ADD PhienBanXacNhan INT NOT NULL CONSTRAINT DF_DOT_XACNHAN DEFAULT 0;
        """
    };
}
