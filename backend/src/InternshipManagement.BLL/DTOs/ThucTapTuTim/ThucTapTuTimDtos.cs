namespace InternshipManagement.BLL.DTOs.ThucTapTuTim;

public record GuiHoSoTuTimRequest(string MaDot, string? MaCongTy, string TenCongTy, string DiaChi,
    string ViTri, string NguoiLienHe, string LienHe, DateTime NgayBatDau, DateTime NgayKetThuc, bool DaDuocTiepNhan);

public record DuyetHoSoTuTimRequest(string TrangThai, string? LyDo = null, string? MaCongTy = null);
