using InternshipManagement.DAL.Entities;

namespace InternshipManagement.BLL.Common;

public static class InternshipDeadlinePolicy
{
    public static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);
    public static DateTimeOffset StartOfDay(DateTime date) => new(DateTime.SpecifyKind(date.Date, DateTimeKind.Unspecified), VietnamOffset);
    // Ngày kết thúc là ngày thực tập cuối cùng, được tính hết ngày.
    public static DateTimeOffset EnterpriseOpening(DotThucTap dot) => StartOfDay(dot.ThoiGianKT.AddDays(1));
    public static bool IsLate(DateTime submittedVietnamTime, DateTime dueDate) => submittedVietnamTime.Date > dueDate.Date;
    public static bool SubmissionClosed(TienDoThucTap report, DateTimeOffset now) =>
        now >= StartOfDay(report.MocThoiGian.AddDays(1))
        && (!report.HanNopBoSung.HasValue || now > report.HanNopBoSung.Value)
        && !InRevisionWindow(report, now);

    // Báo cáo bị yêu cầu sửa được nộp lại trong SoNgayNopLai ngày (tính hết ngày, giờ Việt Nam) kể từ lúc yêu cầu,
    // kể cả khi mốc gốc đã qua; không cần Khoa mở hạn bổ sung.
    public const int SoNgayNopLai = 3;
    public const int NhanXetToiDa = 500;
    public static DateTimeOffset RevisionDeadline(DateTimeOffset now) =>
        StartOfDay(now.ToOffset(VietnamOffset).Date.AddDays(SoNgayNopLai + 1)).AddSeconds(-1);
    public static bool InRevisionWindow(TienDoThucTap report, DateTimeOffset now) =>
        report.TrangThaiDuyet == "YeuCauSua" && report.HanNopLai.HasValue && now <= report.HanNopLai.Value;

    // Yêu cầu sửa phải nêu rõ nội dung cần sửa để sinh viên biết phải làm gì.
    public static string? ReviewComment(string trangThai, string? nhanXet)
    {
        var text = nhanXet?.Trim();
        if (text?.Length > NhanXetToiDa) throw new ArgumentException($"Nhận xét tối đa {NhanXetToiDa} ký tự.");
        if (trangThai == "YeuCauSua" && string.IsNullOrEmpty(text))
            throw new ArgumentException("Nhập nhận xét nêu rõ nội dung sinh viên cần sửa/bổ sung trước khi yêu cầu sửa.");
        return text;
    }
    public static string? GradeBlock(DotThucTap dot, bool enterprise, DateTimeOffset now)
    {
        var opening = enterprise ? EnterpriseOpening(dot) : dot.MoChamGV;
        var deadline = enterprise ? dot.HanChamDN : dot.HanChamGV;
        if (!opening.HasValue || !deadline.HasValue) return "Khoa chưa cấu hình đầy đủ thời hạn chấm điểm cho phần này.";
        if (deadline < opening) return "Thời hạn chấm điểm không hợp lệ; liên hệ Khoa để kiểm tra.";
        if (now < opening) return enterprise
            ? "Chưa kết thúc ngày thực tập cuối của đợt, doanh nghiệp chưa được nhập điểm."
            : "Chưa đến thời điểm mở chấm điểm giảng viên.";
        if (now > deadline) return "Đã hết hạn chấm điểm. Liên hệ Khoa gia hạn có lý do; không có quyền tự vượt hạn.";
        return null;
    }
}
