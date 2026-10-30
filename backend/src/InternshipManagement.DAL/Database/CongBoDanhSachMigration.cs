namespace InternshipManagement.DAL.Database;

public static class CongBoDanhSachMigration
{
    public static IReadOnlyList<string> Statements { get; } = new[]
    {
        """
        IF OBJECT_ID(N'CONGBODANHSACHTHUCTAP', N'U') IS NULL
        BEGIN
            CREATE TABLE CONGBODANHSACHTHUCTAP (
                MaCongBo NVARCHAR(32) NOT NULL PRIMARY KEY,
                MaDot NVARCHAR(20) NOT NULL,
                PhienBan INT NOT NULL,
                TieuDe NVARCHAR(200) NOT NULL,
                NoiDung NVARCHAR(2000) NOT NULL,
                HanPhanHoi DATETIMEOFFSET NOT NULL,
                NgayCongBo DATETIMEOFFSET NOT NULL,
                NguoiCongBo NVARCHAR(20) NOT NULL,
                DanhSachJson NVARCHAR(MAX) NOT NULL,
                CONSTRAINT FK_CBDS_DOT FOREIGN KEY (MaDot) REFERENCES DOTTHUCTAP(maSo),
                CONSTRAINT UQ_CBDS_VERSION UNIQUE (MaDot, PhienBan)
            );
        END;
        """,
        """
        IF OBJECT_ID(N'PHANHOIDANHSACHTHUCTAP', N'U') IS NULL
        BEGIN
            CREATE TABLE PHANHOIDANHSACHTHUCTAP (
                MaPhanHoi NVARCHAR(32) NOT NULL PRIMARY KEY,
                MaDot NVARCHAR(20) NOT NULL,
                MaCongBo NVARCHAR(32) NOT NULL,
                MaSV NVARCHAR(20) NOT NULL,
                LanPhanHoi INT NOT NULL,
                ThongTinDung BIT NOT NULL,
                NoiDung NVARCHAR(2000) NOT NULL,
                NguoiGui NVARCHAR(20) NOT NULL,
                NgayGui DATETIMEOFFSET NOT NULL,
                CONSTRAINT FK_PHDS_CB FOREIGN KEY (MaCongBo) REFERENCES CONGBODANHSACHTHUCTAP(MaCongBo),
                CONSTRAINT FK_PHDS_SV FOREIGN KEY (MaSV) REFERENCES SINHVIEN(maSV),
                CONSTRAINT UQ_PHDS_LAN UNIQUE (MaCongBo, MaSV, LanPhanHoi)
            );
        END;
        """
    };
}
