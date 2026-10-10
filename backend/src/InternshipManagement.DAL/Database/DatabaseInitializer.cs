using Microsoft.Data.SqlClient;

namespace InternshipManagement.DAL.Database;

public static class DatabaseInitializer
{
    public static async Task InitializeAsync(string connectionString, string script)
    {
        var workingConnectionString = await ResolveWorkingConnectionStringAsync(connectionString);
        var builder = new SqlConnectionStringBuilder(workingConnectionString);
        var databaseName = string.IsNullOrWhiteSpace(builder.InitialCatalog) ? "QuanLyThucTap" : builder.InitialCatalog;
        builder.InitialCatalog = "master";

        try
        {
            await using (var master = new SqlConnection(builder.ConnectionString))
            {
                await master.OpenAsync();
                await using var command = master.CreateCommand();
                command.CommandText = $"IF DB_ID(N'{databaseName.Replace("'", "''")}') IS NULL CREATE DATABASE [{databaseName.Replace("]", "]]")}]";
                await command.ExecuteNonQueryAsync();
            }

            builder.InitialCatalog = databaseName;
            await using var connection = new SqlConnection(builder.ConnectionString);
            await connection.OpenAsync();

            await using var check = connection.CreateCommand();
            check.CommandText = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TAIKHOAN'";
            var exists = Convert.ToInt32(await check.ExecuteScalarAsync()) > 0;
            if (exists)
            {
                await using var notificationTable = connection.CreateCommand();
                notificationTable.CommandText = "IF OBJECT_ID(N'THONGBAO', N'U') IS NULL CREATE TABLE THONGBAO (maThongBao NVARCHAR(20) NOT NULL PRIMARY KEY, tieuDe NVARCHAR(200) NOT NULL, noiDung NVARCHAR(MAX) NOT NULL, ngayTao DATETIME2 NOT NULL, maNguoiGui NVARCHAR(20) NULL)";
                await notificationTable.ExecuteNonQueryAsync();
                return;
            }

            foreach (var batch in SplitBatches(script))
            {
                if (string.IsNullOrWhiteSpace(batch)) continue;
                await using var cmd = connection.CreateCommand();
                cmd.CommandText = batch;
                cmd.CommandTimeout = 120;
                await cmd.ExecuteNonQueryAsync();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DatabaseInitializer Warning] Database auto-initialization exception: {ex.Message}");
        }
    }

    public static async Task<string> ResolveWorkingConnectionStringAsync(string primaryConnectionString)
    {
        var candidates = new[]
        {
            primaryConnectionString,
            "Server=.\\SQLEXPRESS;Database=QuanLyThucTap;Trusted_Connection=True;TrustServerCertificate=True;",
            "Server=(localdb)\\mssqllocaldb;Database=QuanLyThucTap;Trusted_Connection=True;TrustServerCertificate=True;",
            "Server=localhost;Database=QuanLyThucTap;Trusted_Connection=True;TrustServerCertificate=True;",
            "Server=127.0.0.1;Database=QuanLyThucTap;Trusted_Connection=True;TrustServerCertificate=True;"
        };

        foreach (var connStr in candidates)
        {
            try
            {
                var builder = new SqlConnectionStringBuilder(connStr);
                builder.InitialCatalog = "master";
                await using var conn = new SqlConnection(builder.ConnectionString);
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
                await conn.OpenAsync(cts.Token);
                return connStr;
            }
            catch
            {
                // Try next candidate
            }
        }
        return primaryConnectionString;
    }

    private static IEnumerable<string> SplitBatches(string script)
    {
        return System.Text.RegularExpressions.Regex.Split(script, @"^\s*GO\s*$(?:\r?\n)?", System.Text.RegularExpressions.RegexOptions.Multiline | System.Text.RegularExpressions.RegexOptions.IgnoreCase);
    }
}
