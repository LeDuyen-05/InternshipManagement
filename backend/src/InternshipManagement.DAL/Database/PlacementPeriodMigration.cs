namespace InternshipManagement.DAL.Database;

public static class PlacementPeriodMigration
{
    public static IReadOnlyList<string> Statements { get; } = new[] {
        """
        IF COL_LENGTH('PHANBOTHUCTAP','NgayBatDauThucTap') IS NULL ALTER TABLE PHANBOTHUCTAP ADD NgayBatDauThucTap DATE NULL;
        IF COL_LENGTH('PHANBOTHUCTAP','NgayKetThucThucTap') IS NULL ALTER TABLE PHANBOTHUCTAP ADD NgayKetThucThucTap DATE NULL;
        IF COL_LENGTH('PHANBOTHUCTAP','PhienBanThoiGian') IS NULL ALTER TABLE PHANBOTHUCTAP ADD PhienBanThoiGian INT NOT NULL CONSTRAINT DF_PB_THOIGIAN DEFAULT 0;
        """
    };
}
