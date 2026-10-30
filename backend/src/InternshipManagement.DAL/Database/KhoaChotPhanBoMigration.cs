namespace InternshipManagement.DAL.Database;

public static class KhoaChotPhanBoMigration
{
    public static IReadOnlyList<string> Statements { get; } = new[]
    {
        """
        IF COL_LENGTH('PHANBOTHUCTAP', 'daDuocKhoaDuyet') IS NULL
            ALTER TABLE PHANBOTHUCTAP ADD daDuocKhoaDuyet BIT NOT NULL CONSTRAINT DF_PBTT_KHOADUYET DEFAULT 1 WITH VALUES;
        IF COL_LENGTH('PHANBOTHUCTAP', 'ngaySVXacNhan') IS NULL
            ALTER TABLE PHANBOTHUCTAP ADD ngaySVXacNhan DATETIME2 NULL;
        IF COL_LENGTH('PHANBOTHUCTAP', 'ngayKhoaDuyet') IS NULL
            ALTER TABLE PHANBOTHUCTAP ADD ngayKhoaDuyet DATETIME2 NULL;
        IF COL_LENGTH('PHANBOTHUCTAP', 'nguoiKhoaDuyet') IS NULL
            ALTER TABLE PHANBOTHUCTAP ADD nguoiKhoaDuyet NVARCHAR(20) NULL;
        """,
        """
        IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('PHANBOTHUCTAP')
                       AND name = 'CK_PBTT_TRANGTHAI' AND definition LIKE '%ChoKhoaDuyet%')
        BEGIN
            SET XACT_ABORT ON;
            BEGIN TRANSACTION;
            IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('PHANBOTHUCTAP') AND name = 'CK_PBTT_TRANGTHAI')
                ALTER TABLE PHANBOTHUCTAP DROP CONSTRAINT CK_PBTT_TRANGTHAI;
            ALTER TABLE PHANBOTHUCTAP WITH CHECK ADD CONSTRAINT CK_PBTT_TRANGTHAI
                CHECK (trangThai IN (N'ChuaNhanViec', N'ChoKhoaDuyet', N'DangThucTap', N'HoanThanh', N'Huy'));
            COMMIT TRANSACTION;
        END;
        """
    };
}
