namespace InternshipManagement.DAL.Entities;

public class ViTriTheoDot
{
    public string MaViTri { get; set; } = default!;
    public string MaCongTy { get; set; } = default!;
    public string MaDot { get; set; } = default!;
    public string TenViTri { get; set; } = default!;
    public string YeuCau { get; set; } = default!;
    public int SoLuongNhan { get; set; }
    public bool HoatDong { get; set; } = true;
    public CongTyTheoDot KeHoach { get; set; } = default!;
}
