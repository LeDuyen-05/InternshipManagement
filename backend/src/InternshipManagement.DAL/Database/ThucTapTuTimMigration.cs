namespace InternshipManagement.DAL.Database;

public static class ThucTapTuTimMigration
{
    public static IReadOnlyList<string> Statements { get; } = new[]
    {
        """
        IF COL_LENGTH('CONGTY', 'chiTiepNhanTuTim') IS NULL
            ALTER TABLE CONGTY ADD chiTiepNhanTuTim BIT NOT NULL CONSTRAINT DF_CT_TUTIM DEFAULT 0;
        """,
        """
        IF OBJECT_ID(N'DEXUATTHUCTAPTUTIM', N'U') IS NULL
        BEGIN
            CREATE TABLE DEXUATTHUCTAPTUTIM (
                MaHoSo NVARCHAR(20) NOT NULL CONSTRAINT PK_TUTIM PRIMARY KEY,
                MaSV NVARCHAR(20) NOT NULL,
                MaDot NVARCHAR(20) NOT NULL,
                MaCongTy NVARCHAR(20) NULL,
                TenCongTy NVARCHAR(200) NOT NULL,
                DiaChi NVARCHAR(500) NOT NULL,
                ViTri NVARCHAR(200) NOT NULL,
                NguoiLienHe NVARCHAR(200) NOT NULL,
                LienHe NVARCHAR(200) NOT NULL,
                NgayBatDau DATETIME2 NOT NULL,
                NgayKetThuc DATETIME2 NOT NULL,
                TrangThai NVARCHAR(20) NOT NULL,
                NgayGui DATETIME2 NOT NULL,
                NgayDuyet DATETIME2 NULL,
                NguoiDuyet NVARCHAR(20) NULL,
                LyDo NVARCHAR(1000) NULL,
                MaPhanBo NVARCHAR(20) NULL,
                CONSTRAINT FK_TUTIM_SV FOREIGN KEY (MaSV) REFERENCES SINHVIEN(maSV),
                CONSTRAINT FK_TUTIM_DOT FOREIGN KEY (MaDot) REFERENCES DOTTHUCTAP(maSo),
                CONSTRAINT FK_TUTIM_CT FOREIGN KEY (MaCongTy) REFERENCES CONGTY(maCongTy),
                CONSTRAINT FK_TUTIM_PB FOREIGN KEY (MaPhanBo) REFERENCES PHANBOTHUCTAP(maPB),
                CONSTRAINT CK_TUTIM_DATE CHECK (NgayKetThuc >= NgayBatDau),
                CONSTRAINT CK_TUTIM_STATUS CHECK (TrangThai IN (N'ChoDuyet', N'DaDuyet', N'TuChoi'))
            );
        END;
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('DEXUATTHUCTAPTUTIM') AND name = 'UQ_TUTIM_CHO_DUYET')
            CREATE UNIQUE INDEX UQ_TUTIM_CHO_DUYET ON DEXUATTHUCTAPTUTIM(MaSV, MaDot) WHERE TrangThai = N'ChoDuyet';
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('DEXUATTHUCTAPTUTIM') AND name = 'UQ_TUTIM_PHANBO')
            CREATE UNIQUE INDEX UQ_TUTIM_PHANBO ON DEXUATTHUCTAPTUTIM(MaPhanBo) WHERE MaPhanBo IS NOT NULL;
        """
    };
}
