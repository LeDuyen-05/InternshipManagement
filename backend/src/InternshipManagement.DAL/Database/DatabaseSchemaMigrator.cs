using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Database;

/// <summary>Small, idempotent upgrade for installations created before the CNTT CLO rubric.</summary>
public static class DatabaseSchemaMigrator
{
    public static async Task ApplyAsync(AppDbContext context)
    {
        const string sql = """
            IF COL_LENGTH('DOTTHUCTAP', 'maRubric') IS NULL
                ALTER TABLE DOTTHUCTAP ADD maRubric NVARCHAR(40) NULL;
            UPDATE DOTTHUCTAP SET maRubric = 'LEGACY_4TC' WHERE maRubric IS NULL;

            IF COL_LENGTH('TIEUCHI', 'maRubric') IS NULL
                ALTER TABLE TIEUCHI ADD maRubric NVARCHAR(40) NULL;
            IF COL_LENGTH('TIEUCHI', 'maCLO') IS NULL
                ALTER TABLE TIEUCHI ADD maCLO NVARCHAR(20) NULL;
            UPDATE TIEUCHI SET maRubric = 'LEGACY_4TC' WHERE maRubric IS NULL;
            UPDATE TIEUCHI SET maCLO = maTieuChi WHERE maCLO IS NULL;

            IF COL_LENGTH('PHIEUCHAMDIEM', 'nhanXetGV') IS NULL
                ALTER TABLE PHIEUCHAMDIEM ADD nhanXetGV NVARCHAR(MAX) NULL;
            IF COL_LENGTH('PHIEUCHAMDIEM', 'daDoiChieuPhieuDN') IS NULL
                ALTER TABLE PHIEUCHAMDIEM ADD daDoiChieuPhieuDN BIT NOT NULL CONSTRAINT DF_PHIEUCHAMDIEM_daDoiChieuPhieuDN DEFAULT 0;
            IF COL_LENGTH('PHIEUCHAMDIEM', 'ghiChuPhieuDN') IS NULL
                ALTER TABLE PHIEUCHAMDIEM ADD ghiChuPhieuDN NVARCHAR(500) NULL;

            IF NOT EXISTS (SELECT 1 FROM TIEUCHI WHERE maTieuChi = 'CLO11')
            BEGIN
                INSERT INTO TIEUCHI (maTieuChi, tenTieuChi, diemToiDa, maRubric, maCLO) VALUES
                ('CLO11', N'Mục tiêu, nội dung và ý nghĩa công việc thực tập', 0.75, 'CNTT_CLO_V1', 'CLO1.1'),
                ('CLO12', N'Giới thiệu đơn vị thực tập', 0.75, 'CNTT_CLO_V1', 'CLO1.2'),
                ('CLO13', N'Vị trí công việc và kế hoạch thực tập', 0.50, 'CNTT_CLO_V1', 'CLO1.3'),
                ('CLO21', N'Vận dụng kiến thức để thực hiện công việc', 0.50, 'CNTT_CLO_V1', 'CLO2.1'),
                ('CLO22', N'Giải thích phương pháp thực hiện công việc', 0.50, 'CNTT_CLO_V1', 'CLO2.2'),
                ('CLO31', N'Yêu cầu công việc tại doanh nghiệp', 0.50, 'CNTT_CLO_V1', 'CLO3.1'),
                ('CLO32', N'Chất lượng báo cáo thực tập', 0.50, 'CNTT_CLO_V1', 'CLO3.2'),
                ('CLO33', N'Thuyết trình kết quả thực tập', 0.50, 'CNTT_CLO_V1', 'CLO3.3'),
                ('CLO34', N'Trả lời câu hỏi của giảng viên', 0.50, 'CNTT_CLO_V1', 'CLO3.4'),
                ('CLO41', N'Doanh nghiệp nhận xét thái độ, trách nhiệm và kỷ luật', 2.00, 'CNTT_CLO_V1', 'CLO4.1'),
                ('CLO42', N'Doanh nghiệp nhận xét năng lực vận dụng kiến thức thực tế', 3.00, 'CNTT_CLO_V1', 'CLO4.2');
            END
            """;

        await context.Database.ExecuteSqlRawAsync(sql);
    }
}
