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
        var key = configuration["Jwt:Key"] ?? "InternshipManagement-Development-Key-2026-Change-Me";
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, account.MaTaiKhoan),
            new Claim(ClaimTypes.Name, account.TenDangNhap),
            new Claim(ClaimTypes.Role, account.VaiTro?.TenVaiTro ?? account.MaVaiTro),
            new Claim("maVaiTro", account.MaVaiTro),
            new Claim("maSV", account.MaSV ?? ""),
            new Claim("maGV", account.MaGV ?? ""),
            new Claim("maDaiDien", account.MaDaiDien ?? "")
        };
        var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(claims: claims, expires: DateTime.UtcNow.AddHours(8), signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
