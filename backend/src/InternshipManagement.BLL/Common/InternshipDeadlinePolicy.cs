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
        && (!report.HanNopBoSung.HasValue || now > report.HanNopBoSung.Value);
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
