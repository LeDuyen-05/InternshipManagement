using System.Text.Json;
using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Common;

public record SupportReply(string MaLan, string PhanHoi, DateTimeOffset ThoiDiem, string? LyDo, string? Nguon, string? NguoiGhiNhan);

public static class SupportConsent
{
    public static SupportReply? Latest(IEnumerable<LanHoTroThucTap> sessions, string student)
    {
        var replies = new List<SupportReply>();
        foreach (var session in sessions.Where(x => x.TrangThai != "DaXoa"))
        {
            using var json = JsonDocument.Parse(session.DanhSachJson);
            foreach (var member in json.RootElement.EnumerateArray())
            {
                string? Read(string field) => member.TryGetProperty(field, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
                if (!string.Equals(Read("MaSV"), student, StringComparison.OrdinalIgnoreCase)) continue;
                var reply = Read("PhanHoi");
                if (reply is not ("NhanHoTro" or "TuChoiHoTro") || !member.TryGetProperty("ThoiDiemPhanHoi", out var date) || !date.TryGetDateTimeOffset(out var at)) continue;
                replies.Add(new(session.MaLan, reply, at, Read("LyDoPhanHoi"), Read("NguonPhanHoi"), Read("NguoiPhanHoi")));
            }
        }
        // At the same timestamp prefer acceptance: never finalize a failure from an ambiguous tie.
        return replies.OrderByDescending(x => x.ThoiDiem).ThenBy(x => x.PhanHoi == "NhanHoTro" ? 0 : 1).ThenBy(x => x.MaLan, StringComparer.Ordinal).FirstOrDefault();
    }
}
