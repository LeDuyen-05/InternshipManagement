namespace InternshipManagement.BLL.DTOs.Admin;

public record UpdateAccountRequest(string TrangThai, string MaVaiTro, string? MaSV = null, string? MaGV = null, string? MaDaiDien = null);
public record CreateCompanyRequest(string MaCongTy, string TenCongTy, string? ViTriTuyen, string? ThoiGian, int SoLuongNhan, string? YeuCau);
public record ApprovalRequest(string TrangThai);
public record CreateStudentRequest(string MaSV, string HoTen, string? Lop, string? KhoaHoc, double? Gpa, string? KyNang, string? ChuyenNganh, string? CongNghe, string? DuAnDaThucHien);
public record CreateLecturerRequest(string MaGV, string HoTen, string? ChuyenMon);
public record CreateInternshipRoundRequest(string MaSo, string TenDot, string NamHoc, DateTime ThoiGianBD, DateTime ThoiGianKT, string TrangThai);
public record CreateAccountRequest(string MaTaiKhoan, string TenDangNhap, string MatKhau, string MaVaiTro, string? MaSV, string? MaGV, string? MaDaiDien);
public record RegistrationApprovalRequest(string TrangThai);
public record SupervisorAssignmentRequest(string MaGiangVien);
public record DeadlineUpdateRequest(DateTime HanCu, DateTime HanMoi);
public record UpdateRoundRequest(string TenDot, string NamHoc, DateTime ThoiGianBD, DateTime ThoiGianKT, string TrangThai);
public record SaveCriteriaRequest(string MaTieuChi, string TenTieuChi, double DiemToiDa);
public record ScoreCriterionRequest(string MaTieuChi, double DiemCham);
public record SaveAssessmentRequest(List<ScoreCriterionRequest> ChiTiet);
public record SendNotificationRequest(string TieuDe, string NoiDung);
public record ReportApprovalRequest(string TrangThai);
