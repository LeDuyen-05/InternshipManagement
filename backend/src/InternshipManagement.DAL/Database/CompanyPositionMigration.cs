namespace InternshipManagement.DAL.Database;

public static class CompanyPositionMigration
{
    public static IReadOnlyList<string> Statements { get; } = new[] {
        """
        IF OBJECT_ID('VITRITHEODOT','U') IS NULL
        CREATE TABLE VITRITHEODOT (
            MaViTri NVARCHAR(40) NOT NULL PRIMARY KEY,
            MaCongTy NVARCHAR(20) NOT NULL, MaDot NVARCHAR(20) NOT NULL,
            TenViTri NVARCHAR(500) NOT NULL, YeuCau NVARCHAR(MAX) NOT NULL,
            SoLuongNhan INT NOT NULL CHECK (SoLuongNhan > 0), HoatDong BIT NOT NULL DEFAULT 1,
            CONSTRAINT UQ_VT_SCOPE UNIQUE (MaViTri,MaCongTy,MaDot),
            CONSTRAINT FK_VT_KEHOACH FOREIGN KEY (MaCongTy,MaDot) REFERENCES CONGTYTHEODOT(MaCongTy,MaDot)
        );
        IF COL_LENGTH('DANGKYTHUCTAP','MaViTri') IS NULL ALTER TABLE DANGKYTHUCTAP ADD MaViTri NVARCHAR(40) NULL;
        IF COL_LENGTH('PHANBOTHUCTAP','MaViTri') IS NULL ALTER TABLE PHANBOTHUCTAP ADD MaViTri NVARCHAR(40) NULL;
        """,
        """
        -- Only the first conversion creates a position and links existing records. Restarts never relink external/new records.
        DECLARE @Converted TABLE (MaViTri NVARCHAR(40),MaCongTy NVARCHAR(20),MaDot NVARCHAR(20));
        INSERT INTO VITRITHEODOT (MaViTri,MaCongTy,MaDot,TenViTri,YeuCau,SoLuongNhan,HoatDong)
        OUTPUT inserted.MaViTri,inserted.MaCongTy,inserted.MaDot INTO @Converted
        SELECT CONVERT(NVARCHAR(36),NEWID()),c.MaCongTy,c.MaDot,c.ViTriTuyen,c.YeuCau,c.SoLuongNhan,1
        FROM CONGTYTHEODOT c WHERE NOT EXISTS (SELECT 1 FROM VITRITHEODOT v WHERE v.MaCongTy=c.MaCongTy AND v.MaDot=c.MaDot);
        UPDATE d SET MaViTri=v.MaViTri FROM DANGKYTHUCTAP d JOIN @Converted v ON d.maCongTy=v.MaCongTy AND d.maDot=v.MaDot WHERE d.MaViTri IS NULL;
        UPDATE p SET MaViTri=v.MaViTri FROM PHANBOTHUCTAP p JOIN @Converted v ON p.maCongTy=v.MaCongTy AND p.maDot=v.MaDot
        WHERE p.MaViTri IS NULL AND ISNULL(p.NguonPhanBo,'') <> 'TiepNhanBenNgoai';
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_DK_VITRI')
            ALTER TABLE DANGKYTHUCTAP ADD CONSTRAINT FK_DK_VITRI FOREIGN KEY (MaViTri,maCongTy,maDot) REFERENCES VITRITHEODOT(MaViTri,MaCongTy,MaDot);
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_PB_VITRI')
            ALTER TABLE PHANBOTHUCTAP ADD CONSTRAINT FK_PB_VITRI FOREIGN KEY (MaViTri,maCongTy,maDot) REFERENCES VITRITHEODOT(MaViTri,MaCongTy,MaDot);
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_PB_VITRI' AND object_id=OBJECT_ID('PHANBOTHUCTAP'))
            CREATE INDEX IX_PB_VITRI ON PHANBOTHUCTAP(MaViTri,maCongTy,maDot,trangThai);
        """
    };
}
