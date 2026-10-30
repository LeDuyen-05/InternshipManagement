using System.Security.Cryptography;
using Microsoft.Data.SqlClient;

namespace InternshipManagement.BLL.Services.Admin;

public sealed class SqlDatabaseBackupExecutor(string connectionString) : IDatabaseBackupExecutor
{
    public string Database { get; } = new SqlConnectionStringBuilder(connectionString).InitialCatalog;

    public async Task<BackupFileResult> ExecuteAsync(string path, int timeoutSeconds, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(Database)) throw new InvalidOperationException("Missing database.");
        // Use a separate, non-transactional session. Never accept SQL/database/path from HTTP.
        var builder = new SqlConnectionStringBuilder(connectionString) { InitialCatalog = "master", Pooling = false };
        await using var connection = new SqlConnection(builder.ConnectionString);
        await connection.OpenAsync(ct);
        await using var gate = connection.CreateCommand();
        gate.CommandText = "DECLARE @r int; EXEC @r = sys.sp_getapplock @Resource=@resource, @LockMode='Exclusive', @LockOwner='Session', @LockTimeout=0; SELECT @r;";
        gate.Parameters.AddWithValue("@resource", "IM.DatabaseBackup." + Database.ToUpperInvariant());
        if (Convert.ToInt32(await gate.ExecuteScalarAsync(ct)) < 0) throw new InvalidOperationException("Another database backup is running.");

        var quoted = "[" + Database.Replace("]", "]]", StringComparison.Ordinal) + "]";
        await using (var command = connection.CreateCommand())
        {
            command.CommandTimeout = timeoutSeconds;
            command.CommandText = $"BACKUP DATABASE {quoted} TO DISK=@file WITH COPY_ONLY, CHECKSUM, NOFORMAT, NOINIT, NAME=@name;";
            command.Parameters.AddWithValue("@file", path);
            command.Parameters.AddWithValue("@name", "InternshipManagement full copy-only " + DateTimeOffset.UtcNow.ToString("O"));
            await command.ExecuteNonQueryAsync(ct);
        }
        await using (var verify = connection.CreateCommand())
        {
            verify.CommandTimeout = timeoutSeconds;
            verify.CommandText = "RESTORE VERIFYONLY FROM DISK=@file WITH CHECKSUM;";
            verify.Parameters.AddWithValue("@file", path);
            await verify.ExecuteNonQueryAsync(ct);
        }
        await using (var header = connection.CreateCommand())
        {
            header.CommandTimeout = timeoutSeconds;
            header.CommandText = "RESTORE HEADERONLY FROM DISK=@file;";
            header.Parameters.AddWithValue("@file", path);
            await using var reader = await header.ExecuteReaderAsync(ct);
            if (!await reader.ReadAsync(ct) || !string.Equals(reader["DatabaseName"].ToString(), Database, StringComparison.OrdinalIgnoreCase)
                || Convert.ToInt32(reader["BackupType"]) != 1 || !Convert.ToBoolean(reader["HasBackupChecksums"])
                || !Convert.ToBoolean(reader["IsCopyOnly"]))
                throw new InvalidOperationException("Backup header does not match the expected database/type/checksum.");
        }
        // Success also requires the API to access the same file, not a different machine's path.
        await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
        if (stream.Length == 0) throw new IOException("Empty backup.");
        var checksum = Convert.ToHexString(await SHA256.HashDataAsync(stream, ct));
        return new(stream.Length, checksum);
    }
}
