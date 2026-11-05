namespace InternshipManagement.BLL.DTOs.Admin;

public class AdminListQuery
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
    public string? MaDot { get; set; }
    public string? TrangThai { get; set; }
    public string? MaVaiTro { get; set; }
    public string? Lop { get; set; }
    public string? ChuyenNganh { get; set; }
    public string PhamVi { get; set; } = "HienHanh";

    public int Offset => (Page - 1) * PageSize;

    public void Validate()
    {
        if (Page <= 0) Page = 1;
        if (PageSize <= 0) PageSize = 20;
        if (Page > 1_000_000 || PageSize > 100)
            throw new ArgumentException("Trang phải từ 1 đến 1.000.000; số dòng mỗi trang từ 1 đến 100.");
        Search = Clean(Search, 200); MaDot = Clean(MaDot, 20); TrangThai = Clean(TrangThai, 50);
        MaVaiTro = Clean(MaVaiTro, 20); Lop = Clean(Lop, 50); ChuyenNganh = Clean(ChuyenNganh, 200);
    }

    private static string? Clean(string? value, int maximum)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        value = value.Trim();
        if (value.Length > maximum) throw new ArgumentException($"Giá trị bộ lọc không được vượt quá {maximum} ký tự.");
        return value;
    }
}
