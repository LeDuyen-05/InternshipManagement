namespace InternshipManagement.DAL.Database;

/// <summary>
/// Nhiều khoa dùng chung hệ thống. Chạy lại nhiều lần không đổi dữ liệu: dữ liệu cũ chỉ được gán vào khoa đầu tiên
/// đúng một lần, ngay khi cột MaKhoa vừa được thêm (cài đặt cũ là của Khoa CNTT).
/// </summary>
public static class FacultyMigration
{
    private const string KhoaDauTien = "(SELECT TOP 1 MaKhoa FROM KHOA ORDER BY MaKhoa)";

    private static string ThemCot(string bang, string capNhat) => $"""
        IF COL_LENGTH('{bang}','MaKhoa') IS NULL
        BEGIN
            ALTER TABLE {bang} ADD MaKhoa NVARCHAR(20) NULL;
            EXEC(N'{capNhat.Replace("'", "''")}');
        END
        """;

    private static string KhoaNgoai(string bang, string ten) => $"""
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = '{ten}')
            ALTER TABLE {bang} ADD CONSTRAINT {ten} FOREIGN KEY (MaKhoa) REFERENCES KHOA(MaKhoa);
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_{bang}_MAKHOA' AND object_id = OBJECT_ID('{bang}'))
            CREATE INDEX IX_{bang}_MAKHOA ON {bang}(MaKhoa);
        """;

    public static readonly string[] Statements =
    {
        """
        IF OBJECT_ID('KHOA','U') IS NULL
            CREATE TABLE KHOA (
                MaKhoa NVARCHAR(20) NOT NULL CONSTRAINT PK_KHOA PRIMARY KEY,
                TenKhoa NVARCHAR(200) NOT NULL CONSTRAINT UQ_KHOA_TEN UNIQUE,
                HoatDong BIT NOT NULL CONSTRAINT DF_KHOA_HOATDONG DEFAULT 1
            );
        IF NOT EXISTS (SELECT 1 FROM KHOA)
            INSERT INTO KHOA (MaKhoa, TenKhoa, HoatDong) VALUES (N'CNTT', N'Khoa Công nghệ thông tin', 1);
        """,
        ThemCot("SINHVIEN", $"UPDATE SINHVIEN SET MaKhoa = {KhoaDauTien}"),
        ThemCot("GIANGVIEN", $"UPDATE GIANGVIEN SET MaKhoa = {KhoaDauTien}"),
        ThemCot("DOTTHUCTAP", $"UPDATE DOTTHUCTAP SET MaKhoa = {KhoaDauTien}"),
        ThemCot("BOTIEUCHI", $"UPDATE BOTIEUCHI SET MaKhoa = {KhoaDauTien}"),
        // Thông báo cũ đều do Khoa CNTT đăng (trước đây chỉ vai trò Khoa được đăng); NULL về sau = toàn trường.
        ThemCot("THONGBAO", $"UPDATE THONGBAO SET MaKhoa = {KhoaDauTien}"),
        ThemCot("TAIKHOAN", $"UPDATE TAIKHOAN SET MaKhoa = {KhoaDauTien} WHERE maVaiTro = N'VT02'"),
        KhoaNgoai("SINHVIEN", "FK_SV_KHOA"),
        KhoaNgoai("GIANGVIEN", "FK_GV_KHOA"),
        KhoaNgoai("DOTTHUCTAP", "FK_DOT_KHOA"),
        KhoaNgoai("BOTIEUCHI", "FK_BTC_KHOA"),
        KhoaNgoai("THONGBAO", "FK_TB_KHOA"),
        KhoaNgoai("TAIKHOAN", "FK_TK_KHOA"),
        // Biểu mẫu cũ là bộ chung "GLOBAL" do Khoa CNTT tải lên: chuyển thành bộ biểu mẫu của khoa đó.
        // Khi đã có danh mục khoa thì không tạo mới bộ "GLOBAL" nữa, nên câu lệnh chỉ có tác dụng một lần.
        """
        IF OBJECT_ID('STORED_DOCUMENT','U') IS NOT NULL AND EXISTS (SELECT 1 FROM KHOA)
            UPDATE STORED_DOCUMENT SET ResourceId = (SELECT TOP 1 MaKhoa FROM KHOA ORDER BY MaKhoa)
            WHERE Kind = N'Template' AND ResourceId = N'GLOBAL';
        """,
    };
}
