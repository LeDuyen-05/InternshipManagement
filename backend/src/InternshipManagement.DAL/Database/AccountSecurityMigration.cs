namespace InternshipManagement.DAL.Database;

public static class AccountSecurityMigration
{
    public static readonly string[] Statements =
    [
        @"IF COL_LENGTH('TAIKHOAN','securityStamp') IS NULL
          ALTER TABLE TAIKHOAN ADD securityStamp NVARCHAR(32) NOT NULL
              CONSTRAINT DF_TAIKHOAN_securityStamp DEFAULT (REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', '')) WITH VALUES;"
    ];
}
