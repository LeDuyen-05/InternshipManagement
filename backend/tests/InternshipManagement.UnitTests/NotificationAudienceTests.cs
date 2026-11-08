using InternshipManagement.BLL.Common;
using Xunit;

namespace InternshipManagement.UnitTests;

// Đối tượng nhận thông báo được lưu bằng mã mà bộ lọc đọc (ALL/SV/GV/DN); giá trị lạ bị từ chối thay vì tạo thông báo không ai đọc được.
public class NotificationAudienceTests
{
    [Theory]
    [InlineData(null, "ALL")]
    [InlineData("ALL", "ALL")]
    [InlineData("SV", "SV")]
    [InlineData("SinhVien", "SV")]
    [InlineData("GiangVien", "GV")]
    [InlineData("DN", "DN")]
    [InlineData("Khoa", null)]
    [InlineData("SinhVienNamCuoi", null)]
    public void AudienceIsNormalised(string? input, string? expected)
    {
        Assert.Equal(expected, NotificationAudience.Target(input));
    }
}
