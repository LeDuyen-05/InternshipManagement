using System.Text.Json;
using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Common;

// Stored with the student's support-session membership; older JSON has no grant and grants no extra attempts.
public record SupplementalRegistrationGrant(int SoLuot, DateTimeOffset HanDangKy, string LyDo, string NguoiMo,
    DateTimeOffset NgayMo, int SoHoSoTruocKhiMo = 0);

public static class SupplementalRegistration
{
    public static SupplementalRegistrationGrant? Read(LanHoTroThucTap session, string student)
    {
        using var json = JsonDocument.Parse(session.DanhSachJson);
        foreach (var member in json.RootElement.EnumerateArray())
            if (member.TryGetProperty("MaSV", out var id) && string.Equals(id.GetString(), student, StringComparison.OrdinalIgnoreCase)
                && member.TryGetProperty("DangKyBoSung", out var value) && value.ValueKind == JsonValueKind.Object)
                return value.Deserialize<SupplementalRegistrationGrant>();
        return null;
    }

    public static int Remaining(LanHoTroThucTap session, string student, IEnumerable<DangKyThucTap> applications, DateTimeOffset now)
    {
        var grant = Read(session, student);
        if (session.TrangThai == "DaXoa" || grant is null || grant.SoLuot is < 1 or > 3 || grant.SoHoSoTruocKhiMo < 0
            || string.IsNullOrWhiteSpace(grant.LyDo) || string.IsNullOrWhiteSpace(grant.NguoiMo)
            || now < grant.NgayMo || now >= grant.HanDangKy || session.NgayHoTro.Date > now.ToOffset(TimeSpan.FromHours(7)).Date) return 0;
        var used = applications.Count(x => x.MaSV == student && x.MaDot == session.MaDot && x.MaLanHoTro == session.MaLan) - grant.SoHoSoTruocKhiMo;
        return used < 0 ? 0 : Math.Max(0, grant.SoLuot - used);
    }
}
