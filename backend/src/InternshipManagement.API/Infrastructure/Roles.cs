using System.Security.Claims;

namespace InternshipManagement.API.Infrastructure;

public static class Roles
{
    public const string QuanTriVien = "QuanTriVien";
    public const string Khoa = "Khoa";
    public const string GiangVien = "GiangVien";
    public const string SinhVien = "SinhVien";
    public const string DaiDienDN = "DaiDienDN";
}

public static class ClaimsPrincipalExtensions
{
    public static string? MaSV(this ClaimsPrincipal u) => Clean(u.FindFirst("maSV")?.Value);
    public static string? MaGV(this ClaimsPrincipal u) => Clean(u.FindFirst("maGV")?.Value);
    public static string? MaTaiKhoan(this ClaimsPrincipal u) =>
        u.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? u.FindFirst("sub")?.Value;
    public static bool IsStaff(this ClaimsPrincipal u) => u.IsInRole(Roles.Khoa);
    private static string? Clean(string? v) => string.IsNullOrWhiteSpace(v) ? null : v;
}
