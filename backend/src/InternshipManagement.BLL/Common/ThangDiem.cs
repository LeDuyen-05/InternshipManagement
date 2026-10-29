namespace InternshipManagement.BLL.Common;


public static class ThangDiem
{
    public const string NhomGiangVien = "GV";
    public const string NhomDoanhNghiep = "DN";

    public const decimal DiemDat = 4.0m; 

    public static decimal LamTron(decimal diem) => Math.Round(diem, 1, MidpointRounding.AwayFromZero);

    public static (string DiemChu, string XepLoai, bool Dat) QuyDoi(decimal tongDiem)
    {
        var d = LamTron(tongDiem);
        return d switch
        {
            >= 8.5m => ("A", "Giỏi", true),
            >= 8.0m => ("B+", "Khá", true),
            >= 7.0m => ("B", "Khá", true),
            >= 6.5m => ("C+", "Trung bình", true),
            >= 5.5m => ("C", "Trung bình", true),
            >= 5.0m => ("D+", "Trung bình yếu", true),
            >= 4.0m => ("D", "Trung bình yếu", true),
            _ => ("F", "Kém", false)
        };
    }

    public static double QuyDoiThang4(decimal tongDiem)
    {
        var d = LamTron(tongDiem);
        return d switch
        {
            >= 8.5m => 4.0,
            >= 8.0m => 3.5,
            >= 7.0m => 3.0,
            >= 6.5m => 2.5,
            >= 5.5m => 2.0,
            >= 5.0m => 1.5,
            >= 4.0m => 1.0,
            _ => 0.0
        };
    }

    public static string MoTaXepLoai(decimal tongDiem)
    {
        var (chu, loai, _) = QuyDoi(tongDiem);
        return $"{loai} ({chu})";
    }
}
