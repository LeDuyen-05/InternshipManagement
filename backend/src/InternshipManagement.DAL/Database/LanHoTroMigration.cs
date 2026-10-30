namespace InternshipManagement.DAL.Database;

public static class LanHoTroMigration
{
    public static IReadOnlyList<string> Statements { get; } = new[]
    {
        """
        IF COL_LENGTH('DOTTHUCTAP','TrangThaiDanhSachNoi') IS NULL
            ALTER TABLE DOTTHUCTAP ADD TrangThaiDanhSachNoi NVARCHAR(20) NOT NULL
                CONSTRAINT DF_DOT_DANHSACHNOI DEFAULT N'ChuaCongBo';
        """,
        """
        IF OBJECT_ID(N'LANHOTROTHUCTAP', N'U') IS NULL
        BEGIN
            CREATE TABLE LANHOTROTHUCTAP (
                MaLan NVARCHAR(32) NOT NULL PRIMARY KEY,
                MaDot NVARCHAR(20) NOT NULL,
                TenLan NVARCHAR(200) NOT NULL,
                NgayHoTro DATETIME2 NOT NULL,
                TrangThai NVARCHAR(20) NOT NULL,
                MaLanTruoc NVARCHAR(32) NULL,
                PhienBan INT NOT NULL,
                DanhSachJson NVARCHAR(MAX) NOT NULL,
                NhatKyJson NVARCHAR(MAX) NOT NULL,
                CONSTRAINT FK_LANHOTRO_DOT FOREIGN KEY (MaDot) REFERENCES DOTTHUCTAP(maSo)
            );
            CREATE INDEX IX_LANHOTRO_DOT_NGAY ON LANHOTROTHUCTAP(MaDot, NgayHoTro);
        END;
        """
    };
}
