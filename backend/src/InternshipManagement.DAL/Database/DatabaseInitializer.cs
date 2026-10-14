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

        var master = new SqlConnectionStringBuilder(connectionString) { InitialCatalog = "master" };
        await using (var c = new SqlConnection(master.ConnectionString))
        {
            await c.OpenAsync(ct);                       // lỗi kết nối → để exception nổi lên (fail fast)
            await using var cmd = c.CreateCommand();
            cmd.CommandText = @"IF DB_ID(@n) IS NULL BEGIN
                DECLARE @sql NVARCHAR(MAX) = N'CREATE DATABASE ' + QUOTENAME(@n) + N' COLLATE Vietnamese_CI_AS';
                EXEC(@sql); END";
            cmd.Parameters.AddWithValue("@n", dbName);
            await cmd.ExecuteNonQueryAsync(ct);
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
                await using var migCmd = conn.CreateCommand();
                migCmd.CommandText = @"
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
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_GVHD_SV_ACTIVE')
    CREATE UNIQUE INDEX UQ_GVHD_SV_ACTIVE ON GVHUONGDAN(maSV) WHERE trangThai = N'DangHuongDan';
";
                migCmd.CommandTimeout = 60;
                await migCmd.ExecuteNonQueryAsync(ct);
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
            foreach (var batch in Regex.Split(script, @"^\s*GO\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase))
            {
                if (string.IsNullOrWhiteSpace(batch)) continue;
                await using var cmd = conn.CreateCommand();
                cmd.Transaction = tx;
                cmd.CommandText = batch;
                cmd.CommandTimeout = 120;
                await cmd.ExecuteNonQueryAsync(ct);
            }
            await tx.CommitAsync(ct);
            logger.LogInformation("Đã khởi tạo schema + dữ liệu mẫu cho {Db}.", dbName);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            logger.LogError(ex, "Khởi tạo database thất bại — đã rollback.");
            throw;                                        // KHÔNG nuốt lỗi
        }
    }
}
