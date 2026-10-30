namespace InternshipManagement.DAL.Database;

public static class CompanyRoundMigration
{
    public static IReadOnlyList<string> Statements { get; } = new[] {
        """
        IF COL_LENGTH('DANGKYTHUCTAP','ViTriDangKy') IS NULL ALTER TABLE DANGKYTHUCTAP ADD ViTriDangKy NVARCHAR(500) NULL;
        IF COL_LENGTH('DANGKYTHUCTAP','YeuCauDangKy') IS NULL ALTER TABLE DANGKYTHUCTAP ADD YeuCauDangKy NVARCHAR(MAX) NULL;
        IF OBJECT_ID('CONGTYTHEODOT','U') IS NULL
        CREATE TABLE CONGTYTHEODOT (
            MaCongTy NVARCHAR(20) NOT NULL, MaDot NVARCHAR(20) NOT NULL,
            ViTriTuyen NVARCHAR(500) NOT NULL, YeuCau NVARCHAR(MAX) NOT NULL,
            SoLuongNhan INT NOT NULL, MoDangKy DATETIMEOFFSET NOT NULL, HanDangKy DATETIMEOFFSET NOT NULL,
            HoatDong BIT NOT NULL DEFAULT 1, PhienBan INT NOT NULL DEFAULT 0,
            CONSTRAINT PK_CONGTYTHEODOT PRIMARY KEY (MaCongTy,MaDot),
            CONSTRAINT FK_CT_DOT_CT FOREIGN KEY (MaCongTy) REFERENCES CONGTY(maCongTy),
            CONSTRAINT FK_CT_DOT_DOT FOREIGN KEY (MaDot) REFERENCES DOTTHUCTAP(maSo),
            CONSTRAINT CK_CT_DOT_SOLUONG CHECK (SoLuongNhan > 0),
            CONSTRAINT CK_CT_DOT_HAN CHECK (HanDangKy > MoDangKy)
        );
        """,
        """
        IF COL_LENGTH('CONGTYTHEODOT','MaGVGioiThieu') IS NULL ALTER TABLE CONGTYTHEODOT ADD MaGVGioiThieu NVARCHAR(20) NULL;
        """,
        """
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_CT_DOT_GV')
            ALTER TABLE CONGTYTHEODOT ADD CONSTRAINT FK_CT_DOT_GV FOREIGN KEY (MaGVGioiThieu) REFERENCES GIANGVIEN(maGV);
        """
    };
}
