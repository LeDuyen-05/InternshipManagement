namespace InternshipManagement.DAL.Database;

public static class SinhVienThamGiaDotMigration
{
    public static IReadOnlyList<string> Statements { get; } = new[]
    {
        """
        IF OBJECT_ID(N'SVTHAMGIADOT', N'U') IS NULL
        BEGIN
            CREATE TABLE SVTHAMGIADOT (
                MaDot NVARCHAR(20) NOT NULL,
                MaSV NVARCHAR(20) NOT NULL,
                DangThamGia BIT NOT NULL CONSTRAINT DF_SVTGD_ACTIVE DEFAULT 1,
                NgayThem DATETIMEOFFSET NOT NULL,
                NguoiThem NVARCHAR(20) NOT NULL,
                NgayCapNhat DATETIMEOFFSET NOT NULL,
                NguoiCapNhat NVARCHAR(20) NOT NULL,
                CONSTRAINT PK_SVTHAMGIADOT PRIMARY KEY (MaDot, MaSV),
                CONSTRAINT FK_SVTGD_DOT FOREIGN KEY (MaDot) REFERENCES DOTTHUCTAP(maSo),
                CONSTRAINT FK_SVTGD_SV FOREIGN KEY (MaSV) REFERENCES SINHVIEN(maSV)
            );
        END;
        """
    };
}
