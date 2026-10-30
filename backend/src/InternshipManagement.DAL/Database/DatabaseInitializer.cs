using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;

namespace InternshipManagement.DAL.Database;

public static class DatabaseInitializer
{
    private const string ResourceName = "InternshipManagement.DAL.schema.sql";

    public static async Task InitializeAsync(string connectionString, ILogger logger, CancellationToken ct = default)
    {
        var target = new SqlConnectionStringBuilder(connectionString);
        var dbName = string.IsNullOrWhiteSpace(target.InitialCatalog) ? "QuanLyThucTap" : target.InitialCatalog;

        // 1. Thử kết nối trực tiếp đến database đích trước (dành cho cloud database như SmarterASP / Azure)
        bool dbReady = false;
        try
        {
            await using var directTest = new SqlConnection(target.ConnectionString);
            await directTest.OpenAsync(ct);
            dbReady = true;
        }
        catch (SqlException)
        {
            // Database đích chưa tồn tại, thường gặp ở môi trường local development
            dbReady = false;
        }

        if (!dbReady)
        {
            try
            {
                var master = new SqlConnectionStringBuilder(connectionString) { InitialCatalog = "master" };
                await using (var c = new SqlConnection(master.ConnectionString))
                {
                    await c.OpenAsync(ct);
                    await using var cmd = c.CreateCommand();
                    cmd.CommandText = @"IF DB_ID(@n) IS NULL BEGIN
                        DECLARE @sql NVARCHAR(MAX) = N'CREATE DATABASE ' + QUOTENAME(@n) + N' COLLATE Vietnamese_CI_AS';
                        EXEC(@sql); END";
                    cmd.Parameters.AddWithValue("@n", dbName);
                    await cmd.ExecuteNonQueryAsync(ct);
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Không thể kết nối database master để tạo {Db}. Tiếp tục thử kết nối trực tiếp.", dbName);
            }
        }

        target.InitialCatalog = dbName;
        await using var conn = new SqlConnection(target.ConnectionString);
        await conn.OpenAsync(ct);

        await using (var check = conn.CreateCommand())
        {
            check.CommandText = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'";
            if (Convert.ToInt32(await check.ExecuteScalarAsync(ct)) > 0)
            {
                logger.LogInformation("Database {Db} đã có bảng — tự động cập nhật các cột và bảng tương thích nếu còn thiếu.", dbName);
                foreach (var migration in Migrations.Concat(AccountSecurityMigration.Statements).Concat(GVHuongDanRoundMigration.Statements).Concat(ThucTapTuTimMigration.Statements).Concat(KhoaChotPhanBoMigration.Statements).Concat(SinhVienThamGiaDotMigration.Statements).Concat(DieuChinhNoiThucTapMigration.Statements).Concat(InterviewOutcomeMigration.Statements).Concat(InterviewCorrectionMigration.Statements).Concat(ThoiHanMigration.Statements).Concat(ConfirmationDeadlineMigration.Statements).Concat(PlacementPeriodMigration.Statements).Concat(CompanyRoundMigration.Statements).Concat(CompanyPositionMigration.Statements).Concat(ChotDotMigration.Statements).Concat(DocumentStorageMigration.Statements).Concat(LanHoTroMigration.Statements).Concat(CongBoDanhSachMigration.Statements).Concat(XuLyDanhSachMigration.Statements))
                {
                    await using var migCmd = conn.CreateCommand();
                    migCmd.CommandText = migration;
                    migCmd.CommandTimeout = 60;
                    await migCmd.ExecuteNonQueryAsync(ct);
                }
                return;
            }
        }

        string script;
        await using (var s = typeof(DatabaseInitializer).Assembly.GetManifestResourceStream(ResourceName)
                     ?? throw new InvalidOperationException("Thiếu embedded resource schema.sql"))
        using (var r = new StreamReader(s, Encoding.UTF8))
            script = await r.ReadToEndAsync(ct);

        await using var tx = (SqlTransaction)await conn.BeginTransactionAsync(ct);
        try
        {
            foreach (var rawBatch in Regex.Split(script, @"^\s*GO\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase))
            {
                var batch = rawBatch.Trim();
                if (string.IsNullOrWhiteSpace(batch)) continue;

                // Bỏ qua các lệnh USE hoặc CREATE DATABASE cấp máy chủ khi chạy trên database cloud đã có sẵn
                if (Regex.IsMatch(batch, @"\bUSE\s+\w+", RegexOptions.IgnoreCase) ||
                    Regex.IsMatch(batch, @"\bCREATE\s+DATABASE\b", RegexOptions.IgnoreCase) ||
                    Regex.IsMatch(batch, @"sys\.databases", RegexOptions.IgnoreCase))
                {
                    continue;
                }

                await using var cmd = conn.CreateCommand();
                cmd.Transaction = tx;
                cmd.CommandText = batch;
                cmd.CommandTimeout = 120;
                await cmd.ExecuteNonQueryAsync(ct);
            }
            await tx.CommitAsync(ct);
            foreach (var migration in AccountSecurityMigration.Statements.Concat(GVHuongDanRoundMigration.Statements).Concat(ThucTapTuTimMigration.Statements).Concat(KhoaChotPhanBoMigration.Statements).Concat(SinhVienThamGiaDotMigration.Statements).Concat(DieuChinhNoiThucTapMigration.Statements).Concat(InterviewOutcomeMigration.Statements).Concat(InterviewCorrectionMigration.Statements).Concat(ThoiHanMigration.Statements).Concat(ConfirmationDeadlineMigration.Statements).Concat(PlacementPeriodMigration.Statements).Concat(CompanyRoundMigration.Statements).Concat(CompanyPositionMigration.Statements).Concat(ChotDotMigration.Statements).Concat(DocumentStorageMigration.Statements).Concat(LanHoTroMigration.Statements).Concat(CongBoDanhSachMigration.Statements).Concat(XuLyDanhSachMigration.Statements))
            {
                await using var migCmd = conn.CreateCommand();
                migCmd.CommandText = migration;
                migCmd.CommandTimeout = 60;
                await migCmd.ExecuteNonQueryAsync(ct);
            }
            logger.LogInformation("Đã khởi tạo schema + dữ liệu mẫu cho {Db}.", dbName);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            logger.LogError(ex, "Khởi tạo database thất bại — đã rollback.");
            throw;                                        // KHÔNG nuốt lỗi
        }
    }

    // Mỗi phần tử là một batch riêng: SQL Server không cho tham chiếu cột vừa ALTER ADD trong cùng batch.
    private static readonly string[] Migrations =
    {
        @"
IF COL_LENGTH('GIANGVIEN','chiTieuHD') IS NULL
    ALTER TABLE GIANGVIEN ADD chiTieuHD INT NOT NULL CONSTRAINT DF_GIANGVIEN_chiTieuHD DEFAULT 10;
IF COL_LENGTH('HOSONANGLUC','FileCV') IS NULL
    ALTER TABLE HOSONANGLUC ADD FileCV NVARCHAR(500) NULL;
IF COL_LENGTH('TIENDOTHUCTAP','nhanXet') IS NULL
    ALTER TABLE TIENDOTHUCTAP ADD nhanXet NVARCHAR(1000) NULL;
IF COL_LENGTH('TIENDOTHUCTAP','nhanXetGV') IS NULL
    ALTER TABLE TIENDOTHUCTAP ADD nhanXetGV NVARCHAR(500) NULL;
IF COL_LENGTH('TAIKHOAN','email') IS NULL
    ALTER TABLE TAIKHOAN ADD email NVARCHAR(200) NULL;
IF COL_LENGTH('TAIKHOAN','soDienThoai') IS NULL
    ALTER TABLE TAIKHOAN ADD soDienThoai NVARCHAR(30) NULL;
IF OBJECT_ID(N'THONGBAO', N'U') IS NULL
    CREATE TABLE THONGBAO (
        maThongBao  NVARCHAR(20)    NOT NULL PRIMARY KEY,
        tieuDe      NVARCHAR(200)   NOT NULL,
        noiDung     NVARCHAR(MAX)   NOT NULL,
        ngayTao     DATETIME2       NOT NULL,
        maNguoiGui  NVARCHAR(20)    NULL
    );
IF COL_LENGTH('TIEUCHI','nhomDanhGia') IS NULL
    ALTER TABLE TIEUCHI ADD nhomDanhGia NVARCHAR(10) NULL;
IF COL_LENGTH('TIEUCHI','thuTu') IS NULL
    ALTER TABLE TIEUCHI ADD thuTu INT NOT NULL CONSTRAINT DF_TIEUCHI_thuTu DEFAULT 0;
IF COL_LENGTH('PHIEUCHAMDIEM','nhanXetGV') IS NULL
    ALTER TABLE PHIEUCHAMDIEM ADD nhanXetGV NVARCHAR(1000) NULL;
IF COL_LENGTH('PHIEUCHAMDIEM','nhanXetDN') IS NULL
    ALTER TABLE PHIEUCHAMDIEM ADD nhanXetDN NVARCHAR(1000) NULL;
IF COL_LENGTH('CONGTY','maSVDeXuat') IS NULL
    ALTER TABLE CONGTY ADD maSVDeXuat NVARCHAR(20) NULL;
-- Lưu cả giờ phỏng vấn (trước đây cột DATE làm mất giờ doanh nghiệp đã hẹn)
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_NAME = 'PHONGVAN' AND COLUMN_NAME = 'ngayPV' AND DATA_TYPE = 'date')
    ALTER TABLE PHONGVAN ALTER COLUMN ngayPV DATETIME2(0) NOT NULL;
",
        // Bộ tiêu chí 11 CLO duy nhất theo file chấm điểm của Khoa CNTT. Xóa mọi tiêu chí không liên quan.
        @"
DELETE FROM TIEUCHI WHERE maTieuChi NOT IN (N'CLO1.1', N'CLO1.2', N'CLO1.3', N'CLO2.1', N'CLO2.2', N'CLO3.1', N'CLO3.2', N'CLO3.3', N'CLO3.4', N'CLO4.1', N'CLO4.2');

IF NOT EXISTS (SELECT 1 FROM TIEUCHI WHERE maTieuChi = N'CLO1.1')
BEGIN
    INSERT INTO TIEUCHI (maTieuChi, tenTieuChi, diemToiDa, nhomDanhGia, thuTu, maRubric, maCLO) VALUES
        (N'CLO1.1', N'Xác định được mục tiêu, nội dung, ý nghĩa của công việc thực tập', 0.75, N'GV', 1, N'CNTT_CLO_V1', N'CLO1.1'),
        (N'CLO1.2', N'Giới thiệu chung về đơn vị thực tập', 0.75, N'GV', 2, N'CNTT_CLO_V1', N'CLO1.2'),
        (N'CLO1.3', N'Nắm vững vị trí công việc thực tập (Thông tin vị trí thực tập, lên kế hoạch thực tập)', 0.50, N'GV', 3, N'CNTT_CLO_V1', N'CLO1.3'),
        (N'CLO2.1', N'Vận dụng được kiến thức giải quyết các công việc được giao', 0.50, N'GV', 4, N'CNTT_CLO_V1', N'CLO2.1'),
        (N'CLO2.2', N'Giải thích được các phương pháp làm để thực hiện công việc được giao', 0.50, N'GV', 5, N'CNTT_CLO_V1', N'CLO2.2'),
        (N'CLO3.1', N'Nắm rõ được yêu cầu công việc tham gia tại doanh nghiệp', 0.50, N'GV', 6, N'CNTT_CLO_V1', N'CLO3.1'),
        (N'CLO3.2', N'Hoàn thành quyển báo cáo đề tài nghiêm túc, hợp lý, ngữ nghĩa trong sáng, không sai lỗi chính tả', 0.50, N'GV', 7, N'CNTT_CLO_V1', N'CLO3.2'),
        (N'CLO3.3', N'Thuyết trình nội dung rõ ràng với giáo viên', 0.50, N'GV', 8, N'CNTT_CLO_V1', N'CLO3.3'),
        (N'CLO3.4', N'Trả lời câu hỏi của giáo viên', 0.50, N'GV', 9, N'CNTT_CLO_V1', N'CLO3.4'),
        (N'CLO4.1', N'Nhận xét của đơn vị thực tập về ý thức, trách nhiệm, kỷ luật (Phiếu nhận xét)', 2.00, N'DN', 10, N'CNTT_CLO_V1', N'CLO4.1'),
        (N'CLO4.2', N'Khả năng vận dụng kiến thức vào thực tiễn trong quá trình thực tập (Phiếu nhận xét)', 3.00, N'DN', 11, N'CNTT_CLO_V1', N'CLO4.2');
END
"
    };
}
