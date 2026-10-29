using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using InternshipManagement.DAL.Entities;
using Microsoft.IdentityModel.Tokens;

namespace InternshipManagement.API.Infrastructure;

public class JwtTokenService(IConfiguration configuration)
{
    public string Create(TaiKhoan account)
    {
        var key = configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("Thiếu Jwt:Key trong cấu hình (>= 32 byte).");
        var issuer = configuration["Jwt:Issuer"] ?? "InternshipManagement";
        var audience = configuration["Jwt:Audience"] ?? "InternshipManagement.Web";

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, account.MaTaiKhoan),
            new(ClaimTypes.NameIdentifier, account.MaTaiKhoan),
            new(ClaimTypes.Name, account.TenDangNhap),
            new(ClaimTypes.Role, account.VaiTro?.TenVaiTro ?? account.MaVaiTro),
            new("maVaiTro", account.MaVaiTro)
        };

        if (!string.IsNullOrWhiteSpace(account.MaSV))
            claims.Add(new Claim("maSV", account.MaSV));
        if (!string.IsNullOrWhiteSpace(account.MaGV))
            claims.Add(new Claim("maGV", account.MaGV));
        if (!string.IsNullOrWhiteSpace(account.MaDaiDien))
            claims.Add(new Claim("maDaiDien", account.MaDaiDien));

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
