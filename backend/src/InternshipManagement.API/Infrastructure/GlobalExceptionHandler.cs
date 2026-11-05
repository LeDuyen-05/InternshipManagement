using InternshipManagement.BLL.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;

namespace InternshipManagement.API.Infrastructure;

public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        if (ex is OperationCanceledException || ctx.RequestAborted.IsCancellationRequested)
        {
            logger.LogDebug(ex, "Request cancelled by client");
            if (!ctx.Response.HasStarted) ctx.Response.StatusCode = 499;
            return true;
        }
        var (status, message) = ex switch
        {
            BadHttpRequestException { StatusCode: StatusCodes.Status413PayloadTooLarge } => (StatusCodes.Status413PayloadTooLarge, "Yêu cầu tải tệp vượt dung lượng cho phép."),
            InternshipManagement.BLL.Services.Documents.DocumentStorageUnavailableException => (StatusCodes.Status503ServiceUnavailable, "Kho lưu trữ tệp chưa được bật. Vui lòng liên hệ quản trị viên."),
            InternshipManagement.DAL.RoundLockedException => (StatusCodes.Status409Conflict, ex.Message),
            NotFoundException or KeyNotFoundException or FileNotFoundException => (StatusCodes.Status404NotFound, ex.Message),
            ArgumentException or InvalidOperationException => (StatusCodes.Status400BadRequest, ex.Message),
            UnauthorizedAccessException => (StatusCodes.Status403Forbidden, "Bạn không có quyền thực hiện thao tác này."),
            DbUpdateConcurrencyException => (StatusCodes.Status409Conflict, "Hồ sơ vừa được cập nhật. Vui lòng tải lại dữ liệu trước khi thao tác."),
            DbUpdateException { InnerException: SqlException { Number: 2601 or 2627 or 547 } } => (StatusCodes.Status409Conflict, "Dữ liệu trùng hoặc vi phạm ràng buộc."),
            DbUpdateException { InnerException: SqlException { Number: 1205 } } => (StatusCodes.Status409Conflict, "Có cập nhật đồng thời. Vui lòng tải lại dữ liệu và thử lại thao tác."),
            DbUpdateException => (StatusCodes.Status500InternalServerError, "Không thể lưu thay đổi. Vui lòng thử lại sau hoặc liên hệ quản trị viên."),
            SqlException { Number: 1205 } => (StatusCodes.Status409Conflict, "Có cập nhật đồng thời. Vui lòng tải lại dữ liệu và thử lại thao tác."),
            _ => (StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.")
        };

        if (status >= 500)
            logger.LogError(ex, "Unhandled exception");
        else
            logger.LogWarning(ex, "Business error: {Message}", ex.Message);

        ctx.Response.StatusCode = status;
        await ctx.Response.WriteAsJsonAsync(new { success = false, message }, ct);
        return true;
    }
}
