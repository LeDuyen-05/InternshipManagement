namespace InternshipManagement.BLL.Common;

public static class ReportSchedule
{
    public const int TotalWeeks = 12;
    public const int IntervalDays = 14;

    public static IReadOnlyList<DateTime> Deadlines(DateTime start, DateTime end)
    {
        start = start.Date;
        end = end.Date < start.AddDays(83) ? end.Date : start.AddDays(83);
        if (end < start) throw new ArgumentException("Ngày kết thúc phải sau ngày bắt đầu.");
        var dates = new List<DateTime>();
        for (var period = 1; period <= 6; period++)
        {
            var due = start.AddDays(IntervalDays * period);
            if (due > end) due = end;
            dates.Add(due);
            if (due == end) break;
        }
        return dates;
    }

    public static int Period(DateTime due, DateTime start) => Math.Max(1, (int)Math.Ceiling((due.Date - start.Date).TotalDays / IntervalDays));
}
