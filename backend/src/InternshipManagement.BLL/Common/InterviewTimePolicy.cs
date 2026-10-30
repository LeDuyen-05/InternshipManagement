namespace InternshipManagement.BLL.Common;

/// <summary>
/// PHONGVAN.ngayPV hiện lưu giờ Việt Nam trong DATETIME2 không có offset.
/// Giữ tương thích dữ liệu đó; chuẩn hóa đầu vào và trả API kèm +07:00.
/// </summary>
public sealed class InterviewTimePolicy(TimeProvider clock)
{
    public static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);
    public DateTime VietnamNow => clock.GetUtcNow().ToOffset(VietnamOffset).DateTime;

    public static DateTime VietnamLocal(DateTime value) => value.Kind == DateTimeKind.Unspecified
        ? value
        : new DateTimeOffset(value).ToOffset(VietnamOffset).DateTime;

    public static DateTimeOffset WithOffset(DateTime value)
    {
        var local = VietnamLocal(value);
        return local < DateTime.MinValue.Add(VietnamOffset) ? DateTimeOffset.MinValue : new(local, VietnamOffset);
    }

    public bool HasStarted(DateTime scheduled)
    {
        var local = VietnamLocal(scheduled);
        return local >= DateTime.MinValue.Add(VietnamOffset) && local <= VietnamNow;
    }

    public DateTime RequireFuture(DateTime scheduled)
    {
        var local = VietnamLocal(scheduled);
        if (local <= VietnamNow)
            throw new ArgumentException("Ngày giờ phỏng vấn mới phải sau thời điểm hiện tại (giờ Việt Nam, UTC+7).");
        return local;
    }

    public void RequireNotStartedForReschedule(DateTime scheduled)
    {
        if (HasStarted(scheduled))
            throw new InvalidOperationException("Lịch phỏng vấn đã đến giờ hoặc đã diễn ra, không thể dời lịch cũ. Liên hệ Khoa để xử lý/xếp lại và giữ lịch sử.");
    }
}
