using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;

namespace InternshipManagement.BLL.Services.Auth;

public enum PasswordCheck { Failed, Success, SuccessNeedsRehash }
public interface IPasswordService { string Hash(string password); PasswordCheck Verify(string password, string stored); }

public sealed class PasswordService : IPasswordService
{
    private static readonly PasswordHasher<object> Hasher = new();
    private static readonly object Dummy = new();

    public string Hash(string password) => Hasher.HashPassword(Dummy, password);

    public PasswordCheck Verify(string password, string stored)
    {
        if (string.IsNullOrEmpty(stored)) return PasswordCheck.Failed;
        if (IsIdentityV3(stored))
            return Hasher.VerifyHashedPassword(Dummy, stored, password) switch
            {
                PasswordVerificationResult.Success => PasswordCheck.Success,
                PasswordVerificationResult.SuccessRehashNeeded => PasswordCheck.SuccessNeedsRehash,
                _ => PasswordCheck.Failed
            };
        if (IsLegacySha256(stored))     // dữ liệu cũ SHA-256 hex: cho đăng nhập 1 lần rồi nâng cấp
            return string.Equals(Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(password))), stored,
                StringComparison.OrdinalIgnoreCase) ? PasswordCheck.SuccessNeedsRehash : PasswordCheck.Failed;
        return PasswordCheck.Failed;    // plaintext KHÔNG còn được chấp nhận
    }
    public static bool IsIdentityV3(string s) => s.StartsWith("AQAAAA", StringComparison.Ordinal);
    public static bool IsLegacySha256(string s) => s.Length == 64 && s.All(Uri.IsHexDigit);
}
