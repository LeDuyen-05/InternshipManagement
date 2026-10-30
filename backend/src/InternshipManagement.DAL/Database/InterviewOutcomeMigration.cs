namespace InternshipManagement.DAL.Database;

public static class InterviewOutcomeMigration
{
    public static IReadOnlyList<string> Statements { get; } = new[]
    {
        """
        IF COL_LENGTH('PHONGVAN', 'MaDK') IS NULL ALTER TABLE PHONGVAN ADD MaDK NVARCHAR(20) NULL;
        IF COL_LENGTH('PHONGVAN', 'LyDoKetQua') IS NULL ALTER TABLE PHONGVAN ADD LyDoKetQua NVARCHAR(1000) NULL;
        IF COL_LENGTH('PHONGVAN', 'NguonKetQua') IS NULL ALTER TABLE PHONGVAN ADD NguonKetQua NVARCHAR(20) NULL;
        IF COL_LENGTH('PHONGVAN', 'NguoiGhiKetQua') IS NULL ALTER TABLE PHONGVAN ADD NguoiGhiKetQua NVARCHAR(20) NULL;
        IF COL_LENGTH('PHONGVAN', 'ThoiDiemKetQua') IS NULL ALTER TABLE PHONGVAN ADD ThoiDiemKetQua DATETIMEOFFSET NULL;
        IF COL_LENGTH('DANGKYTHUCTAP', 'LyDoKetThuc') IS NULL ALTER TABLE DANGKYTHUCTAP ADD LyDoKetThuc NVARCHAR(1000) NULL;
        """,
        """
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_PV_DANGKY')
            ALTER TABLE PHONGVAN ADD CONSTRAINT FK_PV_DANGKY FOREIGN KEY (MaDK) REFERENCES DANGKYTHUCTAP(maDK);
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('PHONGVAN') AND name = 'IX_PV_DANGKY')
            CREATE INDEX IX_PV_DANGKY ON PHONGVAN(MaDK);
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('PHONGVAN') AND name = 'UQ_PV_DANGKY_CHO')
            CREATE UNIQUE INDEX UQ_PV_DANGKY_CHO ON PHONGVAN(MaDK) WHERE MaDK IS NOT NULL AND ketQua = N'ChuaCoKetQua';
        IF OBJECT_ID('NHATKYPHONGVAN', 'U') IS NULL
        CREATE TABLE NHATKYPHONGVAN (
            MaNhatKy NVARCHAR(20) NOT NULL PRIMARY KEY,
            MaPV NVARCHAR(20) NOT NULL,
            MaDK NVARCHAR(20) NOT NULL,
            KetQuaCu NVARCHAR(50) NULL,
            KetQuaMoi NVARCHAR(50) NOT NULL,
            LyDo NVARCHAR(1000) NOT NULL,
            Nguon NVARCHAR(20) NOT NULL,
            NguoiThucHien NVARCHAR(20) NOT NULL,
            ThoiDiem DATETIMEOFFSET NOT NULL,
            CONSTRAINT FK_NKPV_PV FOREIGN KEY (MaPV) REFERENCES PHONGVAN(maPV),
            CONSTRAINT FK_NKPV_DK FOREIGN KEY (MaDK) REFERENCES DANGKYTHUCTAP(maDK)
        );
        """,
        """
        IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_PV_KETQUA' AND definition LIKE '%Vang%')
        BEGIN
            IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_PV_KETQUA')
                ALTER TABLE PHONGVAN DROP CONSTRAINT CK_PV_KETQUA;
            ALTER TABLE PHONGVAN WITH NOCHECK ADD CONSTRAINT CK_PV_KETQUA CHECK
                (ketQua IN (N'ChuaCoKetQua', N'Dat', N'KhongDat', N'Vang'));
        END;
        """
    };
}
