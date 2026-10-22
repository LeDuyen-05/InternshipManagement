namespace InternshipManagement.BLL.Common;

/// <summary>
/// Quy ước chấm điểm học phần Thực tập theo file chấm điểm của Khoa:
/// GVHD chấm nhóm "GV" (CLO1.1 → CLO3.4, tối đa 5đ), đơn vị thực tập chấm nhóm "DN"
/// (CLO4.1, CLO4.2 – Phiếu nhận xét, tối đa 5đ). Tổng điểm thang 10.
/// Quy đổi điểm chữ theo quy chế đào tạo tín chỉ (Thông tư 08/2021/TT-BGDĐT).
/// </summary>
public static class ThangDiem
{
    public const string NhomGiangVien = "GV";
    public const string NhomDoanhNghiep = "DN";

    /// <summary>Điểm học phần tối thiểu để đạt (điểm chữ D).</summary>
    public const decimal DiemDat = 4.0m;

    public static decimal LamTron(decimal diem) => Math.Round(diem, 1, MidpointRounding.AwayFromZero);

    public static (string DiemChu, string XepLoai, bool Dat) QuyDoi(decimal tongDiem)
    {
        var d = LamTron(tongDiem);
        return d switch
        {
            >= 8.5m => ("A", "Giỏi", true),
            >= 8.0m => ("B+", "Khá giỏi", true),
            >= 7.0m => ("B", "Khá", true),
            >= 6.5m => ("C+", "Trung bình khá", true),
            >= 5.5m => ("C", "Trung bình", true),
            >= 5.0m => ("D+", "Trung bình yếu", true),
            >= 4.0m => ("D", "Yếu", true),
            _ => ("F", "Kém", false)
        };
    }

    public static string MoTaXepLoai(decimal tongDiem)
    {
        var (chu, loai, _) = QuyDoi(tongDiem);
        return $"{loai} ({chu})";
    }
}
