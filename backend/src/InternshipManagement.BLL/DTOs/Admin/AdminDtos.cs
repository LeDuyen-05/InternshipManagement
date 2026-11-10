namespace InternshipManagement.BLL.DTOs.Admin;

public record AccountDto(string MaTaiKhoan, string TenDangNhap, string TrangThai, string MaVaiTro, string? TenVaiTro, string? MaSV, string? MaGV, string? MaDaiDien, string? TenChuSoHuu = null, string? TenDonVi = null, string? MaKhoa = null);
public record UpdateAccountRequest(string TrangThai, string MaVaiTro, string? MaSV = null, string? MaGV = null, string? MaDaiDien = null, string? MaKhoa = null);
public record CreateCompanyRequest(string MaCongTy, string TenCongTy, string? ViTriTuyen, string? ThoiGian, int SoLuongNhan, string? YeuCau, string? DiaChi = null);
public record ApprovalRequest(string TrangThai);
public record CreateStudentRequest(string MaSV, string HoTen, string? Lop, string? KhoaHoc, double? Gpa, string? KyNang, string? ChuyenNganh, string? CongNghe, string? DuAnDaThucHien);
public record CreateLecturerRequest(string MaGV, string HoTen, string? ChuyenMon, int ChiTieuHD = 10);
public record CreateInternshipRoundRequest(string MaSo, string TenDot, string NamHoc, DateTime ThoiGianBD, DateTime ThoiGianKT, string TrangThai, string? MaLoaiThucTap = null, string? MaRubric = null);
public record CreateAccountRequest(string MaTaiKhoan, string TenDangNhap, string MatKhau, string MaVaiTro, string? MaSV, string? MaGV, string? MaDaiDien, string? TrangThai = "HoatDong", string? MaKhoa = null);
public record RegistrationApprovalRequest(string TrangThai);
public record SupervisorAssignmentRequest(string MaGiangVien, string MaDot);
public record DeadlineUpdateRequest(DateTime HanCu, DateTime HanMoi, string? LyDo = null);
public record UpdateRoundRequest(string TenDot, string NamHoc, DateTime ThoiGianBD, DateTime ThoiGianKT, string TrangThai, string? MaLoaiThucTap = null, string? MaRubric = null);
public record SaveCriteriaRequest(string MaTieuChi, string TenTieuChi, double DiemToiDa, string? NhomDanhGia = "GV", int ThuTu = 0, string MaCLO = "", string MaRubric = "CNTT_CLO_V1");
public record ScoreCriterionRequest(string MaTieuChi, double DiemCham);
public record SaveAssessmentRequest(List<ScoreCriterionRequest> ChiTiet);
public record SendNotificationRequest(string TieuDe, string NoiDung, string? DoiTuong = "ALL", string? LoaiThongBao = "Chung", string? TepDinhKem = null, bool Ghim = false);
public record ReportApprovalRequest(string TrangThai, string? NhanXet = null);
public record GenerateReportSlotsRequest(string MaDot, int SoTuan = 12, DateTime? NgayBatDau = null);
public record ResetPasswordRequest(string? MatKhauMoi = null);
public record ImportStudentAccountRow(string MaSV, string? HoTen = null, string? Lop = null, string? Email = null, int? Dong = null);
public record ImportStudentAccountsRequest(List<ImportStudentAccountRow> Rows, string? MaDot = null, string? MaKhoa = null);
public record StudentAccountImportItem(int Dong, string MaSV, string HoTen, string? Lop, string? Email, string TrangThai, string GhiChu);
public record StudentAccountImportPreview(int TotalRows, int NewStudents, int AccountsToCreate, int AlreadyRegistered, int DuplicateRows, int InvalidRows, IReadOnlyList<StudentAccountImportItem> Items)
{
    public bool CanImport => AccountsToCreate > 0 && DuplicateRows == 0 && InvalidRows == 0;
}
