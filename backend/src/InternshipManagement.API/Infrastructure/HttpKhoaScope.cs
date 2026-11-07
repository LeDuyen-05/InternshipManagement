using InternshipManagement.DAL;
using InternshipManagement.DAL.Common;

namespace InternshipManagement.API.Infrastructure;

/// <summary>
/// Khoa của người gọi API, lấy từ claim do bước xác thực token gắn vào (đọc lại từ CSDL ở mỗi request).
/// Cán bộ Khoa, giảng viên, sinh viên bị giới hạn trong khoa mình; QTV và doanh nghiệp không bị giới hạn.
/// </summary>
public sealed class HttpKhoaScope(IHttpContextAccessor accessor) : IKhoaScope
{
    public const string ClaimType = "phamViKhoa";

    public string? MaKhoa
    {
        get
        {
            var user = accessor.HttpContext?.User;
            if (user?.Identity?.IsAuthenticated != true) return null;
            if (!(user.IsInRole(Roles.Khoa) || user.IsInRole(Roles.GiangVien) || user.IsInRole(Roles.SinhVien))) return null;
            var value = user.FindFirst(ClaimType)?.Value;
            if (value == KhoaCuaTaiKhoan.KhongGioiHan) return null;
            return string.IsNullOrWhiteSpace(value) ? PhamViKhoa.KhongCoKhoa : value;
        }
    }
}
