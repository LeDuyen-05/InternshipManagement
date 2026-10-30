namespace InternshipManagement.DAL.Database;

public static class XuLyDanhSachMigration
{
    public static IReadOnlyList<string> Statements { get; } = new[]
    {
        """
        IF COL_LENGTH('KHONGHOANTATDOT','TruocChotDanhSach') IS NULL
            ALTER TABLE KHONGHOANTATDOT ADD TruocChotDanhSach BIT NOT NULL CONSTRAINT DF_KHT_TRUOCCHOT DEFAULT 0;
        """,
        """
        IF COL_LENGTH('PHANHOIDANHSACHTHUCTAP','ThongTinMoiJson') IS NULL
            ALTER TABLE PHANHOIDANHSACHTHUCTAP ADD ThongTinMoiJson NVARCHAR(MAX) NULL,
                ThongTinCuJson NVARCHAR(MAX) NULL, PhienBanThongTin INT NOT NULL CONSTRAINT DF_PHDS_INFO DEFAULT 0;
        IF COL_LENGTH('PHANBOTHUCTAP','TenCongTyXacNhan') IS NULL
            ALTER TABLE PHANBOTHUCTAP ADD TenCongTyXacNhan NVARCHAR(500) NULL, DiaChiCongTyXacNhan NVARCHAR(1000) NULL,
                MaSoThueCongTyXacNhan NVARCHAR(30) NULL;
        """,
        """
        IF OBJECT_ID(N'XULYPHANHOIDANHSACH', N'U') IS NULL
            CREATE TABLE XULYPHANHOIDANHSACH (
                MaXuLy NVARCHAR(32) NOT NULL PRIMARY KEY,
                MaDot NVARCHAR(20) NOT NULL REFERENCES DOTTHUCTAP(maSo),
                MaPhanHoi NVARCHAR(32) NOT NULL UNIQUE REFERENCES PHANHOIDANHSACHTHUCTAP(MaPhanHoi),
                ChapThuan BIT NOT NULL, LyDo NVARCHAR(2000) NOT NULL, NguoiXuLy NVARCHAR(20) NOT NULL,
                NgayXuLy DATETIMEOFFSET NOT NULL, ThongTinCuJson NVARCHAR(MAX) NOT NULL, ThongTinMoiJson NVARCHAR(MAX) NOT NULL
            );
        IF OBJECT_ID(N'DANHSACHTHUCTAPCHINHTHUC', N'U') IS NULL
            CREATE TABLE DANHSACHTHUCTAPCHINHTHUC (
                MaDot NVARCHAR(20) NOT NULL PRIMARY KEY REFERENCES DOTTHUCTAP(maSo),
                MaCongBo NVARCHAR(32) NOT NULL REFERENCES CONGBODANHSACHTHUCTAP(MaCongBo),
                PhienBanRaSoat INT NOT NULL, DanhSachJson NVARCHAR(MAX) NOT NULL,
                LyDo NVARCHAR(2000) NOT NULL, NguoiChot NVARCHAR(20) NOT NULL, NgayChot DATETIMEOFFSET NOT NULL
            );
        """
    };
}
