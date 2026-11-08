namespace InternshipManagement.DAL.Database;

public static class ThoiHanMigration
{
    public static IReadOnlyList<string> Statements { get; } = new[]
    {
        """
        IF COL_LENGTH('DOTTHUCTAP', 'MoChamGV') IS NULL ALTER TABLE DOTTHUCTAP ADD MoChamGV DATETIMEOFFSET NULL;
        IF COL_LENGTH('DOTTHUCTAP', 'HanChamGV') IS NULL ALTER TABLE DOTTHUCTAP ADD HanChamGV DATETIMEOFFSET NULL;
        IF COL_LENGTH('DOTTHUCTAP', 'HanChamDN') IS NULL ALTER TABLE DOTTHUCTAP ADD HanChamDN DATETIMEOFFSET NULL;
        IF COL_LENGTH('DOTTHUCTAP', 'PhienBanThoiHan') IS NULL ALTER TABLE DOTTHUCTAP ADD PhienBanThoiHan INT NOT NULL CONSTRAINT DF_DOT_THOIHAN DEFAULT 0;
        IF COL_LENGTH('TIENDOTHUCTAP', 'NopTre') IS NULL ALTER TABLE TIENDOTHUCTAP ADD NopTre BIT NULL;
        IF COL_LENGTH('TIENDOTHUCTAP', 'HanNopBoSung') IS NULL ALTER TABLE TIENDOTHUCTAP ADD HanNopBoSung DATETIMEOFFSET NULL;
        IF COL_LENGTH('TIENDOTHUCTAP', 'HanNopLai') IS NULL
        BEGIN
            ALTER TABLE TIENDOTHUCTAP ADD HanNopLai DATETIMEOFFSET NULL;
            -- Báo cáo đang bị yêu cầu sửa từ trước khi có hạn nộp lại: cho nộp lại 3 ngày (InternshipDeadlinePolicy.SoNgayNopLai),
            -- tính hết ngày giờ Việt Nam, kể từ lần cập nhật này. Chỉ chạy một lần cùng lúc thêm cột.
            EXEC(N'UPDATE TIENDOTHUCTAP SET HanNopLai = DATEADD(SECOND, -1, TODATETIMEOFFSET(DATEADD(DAY, 4, CAST(CAST(SWITCHOFFSET(SYSDATETIMEOFFSET(), ''+07:00'') AS date) AS datetime2)), ''+07:00''))
                WHERE trangThaiDuyet = N''YeuCauSua'' AND MaPhanBoLuuTru IS NULL');
        END
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('TIENDOTHUCTAP') AND name = 'ngayNop' AND system_type_id = TYPE_ID('date'))
            ALTER TABLE TIENDOTHUCTAP ALTER COLUMN ngayNop DATETIME2 NULL;
        IF OBJECT_ID('NHATKYTHOIHAN', 'U') IS NULL
        CREATE TABLE NHATKYTHOIHAN (
            MaNhatKy NVARCHAR(20) NOT NULL PRIMARY KEY,
            MaDot NVARCHAR(20) NOT NULL,
            Loai NVARCHAR(30) NOT NULL,
            Truoc NVARCHAR(MAX) NOT NULL,
            Sau NVARCHAR(MAX) NOT NULL,
            LyDo NVARCHAR(1000) NOT NULL,
            NguoiThucHien NVARCHAR(20) NOT NULL,
            ThoiDiem DATETIMEOFFSET NOT NULL,
            CONSTRAINT FK_NKTH_DOT FOREIGN KEY (MaDot) REFERENCES DOTTHUCTAP(maSo)
        );
        """
    };
}
