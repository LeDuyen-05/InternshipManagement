using InternshipManagement.BLL.Common;
using InternshipManagement.BLL.DTOs.TienDoThucTap;
using InternshipManagement.BLL.Services.TienDoThucTap;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Moq;
using Xunit;

namespace InternshipManagement.UnitTests;

// Yêu cầu sửa báo cáo phải có nhận xét, và sinh viên được nộp lại trong hạn riêng kể cả khi mốc gốc đã qua.
public class ReportRevisionTests
{
    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now.ToUniversalTime();
    }

    private static readonly DateTimeOffset Now = new(2026, 11, 8, 10, 0, 0, TimeSpan.FromHours(7));
    private static readonly DateTimeOffset RevisionEnd = new(2026, 11, 11, 23, 59, 59, TimeSpan.FromHours(7));
    private readonly Mock<ITienDoThucTapRepository> _repo = new();

    private TienDoThucTapService Service(DateTimeOffset? now = null) => new(_repo.Object, new FixedClock(now ?? Now));

    private TienDoThucTap Report(string status, DateTime milestone, DateTimeOffset? revisionEnd = null, bool? late = false, DateTime? submitted = null)
    {
        var report = new TienDoThucTap
        {
            MaTienDo = "TD001", MaSV = "SV001", MaDot = "DOT1", MocThoiGian = milestone,
            TrangThaiDuyet = status, HanNopLai = revisionEnd, NopTre = late, NgayNop = submitted ?? milestone, DotThucTap = null!
        };
        _repo.Setup(r => r.GetByIdAsync("TD001")).ReturnsAsync(report);
        _repo.Setup(r => r.IsSupervisorAsync("GV001", "SV001", "DOT1")).ReturnsAsync(true);
        _repo.Setup(r => r.GetTrangThaiPhanBoAsync("SV001", "DOT1")).ReturnsAsync("DangThucTap");
        _repo.Setup(r => r.UpdateAsync(It.IsAny<TienDoThucTap>())).ReturnsAsync((TienDoThucTap t) => t);
        return report;
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task RevisionRequestWithoutCommentIsRejected(string? comment)
    {
        Report("DaNop", new DateTime(2026, 11, 5));

        var error = await Assert.ThrowsAsync<ArgumentException>(() => Service().DuyetTienDoAsync("TD001",
            new DuyetTienDoRequest { TrangThaiDuyet = "YeuCauSua", NhanXet = comment }, actorMaGV: "GV001"));

        Assert.Contains("cần sửa", error.Message);
        _repo.Verify(r => r.CapNhatTrangThaiDuyetAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<DateTimeOffset?>()), Times.Never);
    }

    [Fact]
    public async Task RevisionRequestGivesStudentThreeDaysToResubmit()
    {
        Report("DaNop", new DateTime(2026, 11, 5));
        _repo.Setup(r => r.CapNhatTrangThaiDuyetAsync("TD001", "YeuCauSua", "Bổ sung minh chứng", RevisionEnd)).ReturnsAsync(true);

        var ok = await Service().DuyetTienDoAsync("TD001",
            new DuyetTienDoRequest { TrangThaiDuyet = "YeuCauSua", NhanXet = "  Bổ sung minh chứng  " }, actorMaGV: "GV001");

        Assert.True(ok);
        _repo.Verify(r => r.CapNhatTrangThaiDuyetAsync("TD001", "YeuCauSua", "Bổ sung minh chứng", RevisionEnd), Times.Once);
    }

    [Fact]
    public async Task ApprovalStillAllowsAnEmptyComment()
    {
        Report("DaNop", new DateTime(2026, 11, 5));
        _repo.Setup(r => r.CapNhatTrangThaiDuyetAsync("TD001", "DaDuyet", "", null)).ReturnsAsync(true);

        Assert.True(await Service().DuyetTienDoAsync("TD001", new DuyetTienDoRequest { TrangThaiDuyet = "DaDuyet", NhanXet = "" }, actorMaGV: "GV001"));
    }

    [Fact]
    public async Task StudentResubmitsAfterTheMilestoneWithinTheRevisionWindowAndKeepsOnTimeStatus()
    {
        var report = Report("YeuCauSua", new DateTime(2026, 11, 5), RevisionEnd, late: false);

        var dto = await Service(RevisionEnd.AddMinutes(-1)).NopBaoCaoTienDoAsync(
            new NopBaoCaoRequest { MaTienDo = "TD001", MaSV = "SV001", NoiDungBaoCao = "Đã bổ sung minh chứng" }, "SV001");

        Assert.Equal("DaNop", dto.TrangThaiDuyet);
        Assert.False(report.NopTre);
    }

    [Theory]
    [InlineData("2026-11-05", false)]
    [InlineData("2026-11-06", true)]
    public async Task LegacyReportWithoutLateFlagIsJudgedByItsFirstSubmission(string firstSubmission, bool late)
    {
        var report = Report("YeuCauSua", new DateTime(2026, 11, 5), RevisionEnd, late: null, submitted: DateTime.Parse(firstSubmission));

        await Service().NopBaoCaoTienDoAsync(new NopBaoCaoRequest { MaTienDo = "TD001", MaSV = "SV001", NoiDungBaoCao = "Bản sửa" }, "SV001");

        Assert.Equal(late, report.NopTre);
    }

    [Fact]
    public async Task ResubmissionAfterTheRevisionWindowIsClosed()
    {
        Report("YeuCauSua", new DateTime(2026, 11, 5), RevisionEnd);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => Service(RevisionEnd.AddSeconds(1)).NopBaoCaoTienDoAsync(
            new NopBaoCaoRequest { MaTienDo = "TD001", MaSV = "SV001", NoiDungBaoCao = "Nộp muộn" }, "SV001"));

        Assert.Contains("hết hạn nộp lại", error.Message);
    }

    [Fact]
    public void RevisionWindowOnlyAppliesWhileRevisionIsRequested()
    {
        var report = new TienDoThucTap { MocThoiGian = new DateTime(2026, 11, 5), TrangThaiDuyet = "ChuaNop", HanNopLai = RevisionEnd };

        Assert.Equal(RevisionEnd, InternshipDeadlinePolicy.RevisionDeadline(Now));
        Assert.True(InternshipDeadlinePolicy.SubmissionClosed(report, Now));
        report.TrangThaiDuyet = "YeuCauSua";
        Assert.False(InternshipDeadlinePolicy.SubmissionClosed(report, Now));
    }

    [Fact]
    public void CommentLongerThanTheColumnIsRejected()
    {
        Assert.Throws<ArgumentException>(() => InternshipDeadlinePolicy.ReviewComment("DaDuyet", new string('a', InternshipDeadlinePolicy.NhanXetToiDa + 1)));
    }
}
