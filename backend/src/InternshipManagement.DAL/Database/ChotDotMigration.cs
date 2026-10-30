namespace InternshipManagement.DAL.Database;

public static class ChotDotMigration
{
    // Không gán đã chốt cho đợt cũ: chỉ quyết định có người xác nhận mới tạo dấu khóa.
    public static IReadOnlyList<string> Statements { get; } = new[] { """
        IF OBJECT_ID('CHOTDOTTHUCTAP','U') IS NULL
        CREATE TABLE CHOTDOTTHUCTAP (
            MaDot NVARCHAR(20) NOT NULL PRIMARY KEY REFERENCES DOTTHUCTAP(maSo),
            TrangThai NVARCHAR(20) NOT NULL, PhienBan INT NOT NULL DEFAULT 0,
            HanMoLai DATETIMEOFFSET NULL, NguoiCapNhat NVARCHAR(20) NULL,
            NgayCapNhat DATETIMEOFFSET NOT NULL, LyDo NVARCHAR(1000) NOT NULL
        );
        IF OBJECT_ID('KHONGHOANTATDOT','U') IS NULL
        CREATE TABLE KHONGHOANTATDOT (
            MaDot NVARCHAR(20) NOT NULL REFERENCES DOTTHUCTAP(maSo),
            MaSV NVARCHAR(20) NOT NULL REFERENCES SINHVIEN(maSV), HieuLuc BIT NOT NULL DEFAULT 1,
            LyDo NVARCHAR(1000) NOT NULL, CanCu NVARCHAR(1000) NOT NULL,
            NguoiXacNhan NVARCHAR(20) NOT NULL, NgayXacNhan DATETIMEOFFSET NOT NULL,
            CONSTRAINT PK_KHONGHOANTATDOT PRIMARY KEY(MaDot,MaSV)
        );
        IF OBJECT_ID('NHATKYCHOTDOT','U') IS NULL
        CREATE TABLE NHATKYCHOTDOT (
            MaNhatKy NVARCHAR(32) NOT NULL PRIMARY KEY, MaDot NVARCHAR(20) NOT NULL REFERENCES DOTTHUCTAP(maSo),
            PhienBan INT NOT NULL, Loai NVARCHAR(30) NOT NULL, NguoiThucHien NVARCHAR(20) NOT NULL,
            ThoiDiem DATETIMEOFFSET NOT NULL, LyDo NVARCHAR(1000) NOT NULL, NoiDung NVARCHAR(MAX) NOT NULL
        );
        """ };
}
