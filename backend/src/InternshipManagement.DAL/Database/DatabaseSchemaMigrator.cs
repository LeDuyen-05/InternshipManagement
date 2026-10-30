using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Database;

/// <summary>Small, idempotent upgrade for installations created before the CNTT CLO rubric.</summary>
public static class DatabaseSchemaMigrator
{
    public static async Task ApplyAsync(AppDbContext context)
    {
        var statements = new[]
        {
            "IF COL_LENGTH('DOTTHUCTAP', 'maRubric') IS NULL ALTER TABLE DOTTHUCTAP ADD maRubric NVARCHAR(40) NULL;",
            "IF COL_LENGTH('DOTTHUCTAP', 'maRubric') IS NOT NULL EXEC('UPDATE DOTTHUCTAP SET maRubric = ''LEGACY_4TC'' WHERE maRubric IS NULL');",

            "IF COL_LENGTH('TIEUCHI', 'maRubric') IS NULL ALTER TABLE TIEUCHI ADD maRubric NVARCHAR(40) NULL;",
            "IF COL_LENGTH('TIEUCHI', 'maCLO') IS NULL ALTER TABLE TIEUCHI ADD maCLO NVARCHAR(20) NULL;",
            "IF COL_LENGTH('TIEUCHI', 'maRubric') IS NOT NULL EXEC('UPDATE TIEUCHI SET maRubric = ''LEGACY_4TC'' WHERE maRubric IS NULL');",
            "IF COL_LENGTH('TIEUCHI', 'maCLO') IS NOT NULL EXEC('UPDATE TIEUCHI SET maCLO = maTieuChi WHERE maCLO IS NULL');",

            "IF COL_LENGTH('PHIEUCHAMDIEM', 'nhanXetGV') IS NULL ALTER TABLE PHIEUCHAMDIEM ADD nhanXetGV NVARCHAR(MAX) NULL;",
            "IF COL_LENGTH('PHIEUCHAMDIEM', 'daDoiChieuPhieuDN') IS NULL ALTER TABLE PHIEUCHAMDIEM ADD daDoiChieuPhieuDN BIT NOT NULL CONSTRAINT DF_PHIEUCHAMDIEM_daDoiChieuPhieuDN DEFAULT 0;",
            "IF COL_LENGTH('PHIEUCHAMDIEM', 'ghiChuPhieuDN') IS NULL ALTER TABLE PHIEUCHAMDIEM ADD ghiChuPhieuDN NVARCHAR(500) NULL;",

            // Dọn dẹp dứt điểm các mã tiêu chí thừa cũ (CLO11..CLO42 không có trong phiếu chấm) để bảo đảm duy nhất 1 bộ 11 CLO chuẩn
            "DELETE FROM TIEUCHI WHERE maTieuChi IN ('CLO11','CLO12','CLO13','CLO21','CLO22','CLO31','CLO32','CLO33','CLO34','CLO41','CLO42') AND NOT EXISTS (SELECT 1 FROM CHITIETCHAMDIEM c WHERE c.maTieuChi = TIEUCHI.maTieuChi);"
        };

        foreach (var sql in statements)
        {
            try
            {
                await context.Database.ExecuteSqlRawAsync(sql);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Migrator warning on statement: {ex.Message}");
            }
        }
    }
}
