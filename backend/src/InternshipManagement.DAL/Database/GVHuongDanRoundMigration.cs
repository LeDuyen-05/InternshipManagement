namespace InternshipManagement.DAL.Database;

public static class GVHuongDanRoundMigration
{
    public static IReadOnlyList<string> Statements { get; } = new[]
    {
        """
        IF COL_LENGTH('GVHUONGDAN', 'maDot') IS NULL
            ALTER TABLE GVHUONGDAN ADD maDot NVARCHAR(20) NULL;
        """,
        """
        UPDATE hd SET maDot = source.maDot
        FROM GVHUONGDAN hd
        JOIN (
            SELECT maGVHuongDan, MIN(maDot) AS maDot
            FROM PHIEUCHAMDIEM
            WHERE maGVHuongDan IS NOT NULL
            GROUP BY maGVHuongDan HAVING COUNT(DISTINCT maDot) = 1
        ) source ON source.maGVHuongDan = hd.maSo
        WHERE hd.maDot IS NULL;

        UPDATE hd SET maDot = source.maDot
        FROM GVHUONGDAN hd
        JOIN (
            SELECT maSV, MIN(maDot) AS maDot
            FROM PHANBOTHUCTAP
            GROUP BY maSV HAVING COUNT(DISTINCT maDot) = 1
        ) source ON source.maSV = hd.maSV
        WHERE hd.maDot IS NULL
          AND NOT EXISTS (SELECT 1 FROM PHIEUCHAMDIEM p WHERE p.maGVHuongDan = hd.maSo);
        """,
        """
        SET XACT_ABORT ON;
        BEGIN TRANSACTION;
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_GVHD_DOTTHUCTAP')
            ALTER TABLE GVHUONGDAN WITH CHECK ADD CONSTRAINT FK_GVHD_DOTTHUCTAP
                FOREIGN KEY (maDot) REFERENCES DOTTHUCTAP(maSo);
        IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('GVHUONGDAN') AND name = 'UQ_GVHD_SV_ACTIVE')
            DROP INDEX UQ_GVHD_SV_ACTIVE ON GVHUONGDAN;
        IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('GVHUONGDAN') AND name = 'IX_GVHUONGDAN_maSV' AND is_unique = 1)
            DROP INDEX IX_GVHUONGDAN_maSV ON GVHUONGDAN;
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('GVHUONGDAN') AND name = 'UQ_GVHD_SV_DOT_ACTIVE')
            CREATE UNIQUE INDEX UQ_GVHD_SV_DOT_ACTIVE ON GVHUONGDAN(maSV, maDot)
                WHERE trangThai = N'DangHuongDan' AND maDot IS NOT NULL;
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('GVHUONGDAN') AND name = 'UQ_GVHD_LEGACY_ACTIVE')
            CREATE UNIQUE INDEX UQ_GVHD_LEGACY_ACTIVE ON GVHUONGDAN(maSV)
                WHERE trangThai = N'DangHuongDan' AND maDot IS NULL;
        COMMIT TRANSACTION;
        """
    };
}
