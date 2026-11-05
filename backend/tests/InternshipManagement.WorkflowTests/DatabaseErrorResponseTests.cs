using System.Text.Json;
using InternshipManagement.API.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace InternshipManagement.WorkflowTests;

public class DatabaseErrorResponseTests
{
    // 04/11/2026: đổi trang/hủy request không ghi JSON lên kết nối đã đóng.
    [Fact]
    public async Task CancelledClientDoesNotTriggerAnotherErrorWhileWritingTheErrorResponse()
    {
        var context = new DefaultHttpContext { RequestAborted = new CancellationToken(true) };
        context.Response.Body = new MemoryStream();
        var handled = await new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance)
            .TryHandleAsync(context, new OperationCanceledException(), context.RequestAborted);
        Assert.True(handled);
        Assert.Equal(499, context.Response.StatusCode);
        Assert.Equal(0, context.Response.Body.Length);
    }
    // 04/11/2026: lỗi cập nhật do cấu hình SQL không được báo nhầm thành dữ liệu trùng.
    [Theory]
    [InlineData("database", 500)]
    [InlineData("concurrency", 409)]
    [InlineData("business", 400)]
    public async Task DatabaseFaultIsNotReportedAsDuplicateDataOrExposedToUser(string kind, int expected)
    {
        using var provider = new ServiceCollection().AddOptions().BuildServiceProvider();
        var context = new DefaultHttpContext { RequestServices = provider };
        context.Response.Body = new MemoryStream();
        Exception error = kind switch {
            "database" => new DbUpdateException("Private SQL configuration details"),
            "concurrency" => new DbUpdateConcurrencyException("Private SQL concurrency details"),
            _ => new InvalidOperationException("Hồ sơ đã kết thúc.")
        };
        await new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance).TryHandleAsync(context, error, default);
        Assert.Equal(expected, context.Response.StatusCode);
        context.Response.Body.Position = 0;
        using var json = await JsonDocument.ParseAsync(context.Response.Body);
        var message = json.RootElement.GetProperty("message").GetString()!;
        Assert.DoesNotContain("Private SQL", message);
        if (kind == "database") Assert.DoesNotContain("trùng", message);
    }
}
