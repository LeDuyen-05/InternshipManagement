using InternshipManagement.BLL.Common;
using InternshipManagement.BLL.DTOs.TienDoThucTap;
using InternshipManagement.BLL.Services.TienDoThucTap;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;
using Moq;
using Xunit;

namespace InternshipManagement.UnitTests;

// Yêu cầu sửa báo cáo phải có nhận xét để sinh viên biết cần sửa gì.
public class ReportRevisionTests
{
    private readonly Mock<ITienDoThucTapRepository> _repo = new();

    private TienDoThucTapService Service()
    {
        _repo.Setup(r => r.GetByIdAsync("TD001")).ReturnsAsync(new TienDoThucTap
        {
            MaTienDo = "TD001", MaSV = "SV001", MaDot = "DOT1", MocThoiGian = new DateTime(2026, 11, 5), TrangThaiDuyet = "DaNop"
        });
        _repo.Setup(r => r.IsSupervisorAsync("GV001", "SV001", "DOT1")).ReturnsAsync(true);
        return new(_repo.Object);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task RevisionRequestWithoutCommentIsRejected(string? comment)
    {
        var error = await Assert.ThrowsAsync<ArgumentException>(() => Service().DuyetTienDoAsync("TD001",
            new DuyetTienDoRequest { TrangThaiDuyet = "YeuCauSua", NhanXet = comment }, actorMaGV: "GV001"));

        Assert.Contains("cần sửa", error.Message);
        _repo.Verify(r => r.CapNhatTrangThaiDuyetAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>()), Times.Never);
    }

    [Fact]
    public async Task RevisionRequestKeepsTheTrimmedComment()
    {
        var service = Service();
        _repo.Setup(r => r.CapNhatTrangThaiDuyetAsync("TD001", "YeuCauSua", "Bổ sung minh chứng")).ReturnsAsync(true);

        Assert.True(await service.DuyetTienDoAsync("TD001",
            new DuyetTienDoRequest { TrangThaiDuyet = "YeuCauSua", NhanXet = "  Bổ sung minh chứng  " }, actorMaGV: "GV001"));
        _repo.Verify(r => r.CapNhatTrangThaiDuyetAsync("TD001", "YeuCauSua", "Bổ sung minh chứng"), Times.Once);
    }

    [Fact]
    public async Task ApprovalStillAllowsAnEmptyComment()
    {
        var service = Service();
        _repo.Setup(r => r.CapNhatTrangThaiDuyetAsync("TD001", "DaDuyet", "")).ReturnsAsync(true);

        Assert.True(await service.DuyetTienDoAsync("TD001", new DuyetTienDoRequest { TrangThaiDuyet = "DaDuyet", NhanXet = "" }, actorMaGV: "GV001"));
    }

    [Fact]
    public void CommentLongerThanTheColumnIsRejected()
    {
        Assert.Throws<ArgumentException>(() => InternshipDeadlinePolicy.ReviewComment("DaDuyet", new string('a', InternshipDeadlinePolicy.NhanXetToiDa + 1)));
    }
}
