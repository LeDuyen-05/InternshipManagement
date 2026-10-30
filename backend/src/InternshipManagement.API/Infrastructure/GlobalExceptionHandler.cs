using InternshipManagement.BLL.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;

namespace InternshipManagement.API.Infrastructure;

public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        var (status, message) = ex switch
        {
            BadHttpRequestException { StatusCode: StatusCodes.Status413PayloadTooLarge } => (StatusCodes.Status413PayloadTooLarge, "Yêu cầu tải tệp vượt dung lượng cho phép."),
            InternshipManagement.BLL.Services.Documents.DocumentStorageUnavailableException => (StatusCodes.Status503ServiceUnavailable, "Kho tệp R2 chưa được cấu hình. Liên hệ người quản trị; các liên kết cũ vẫn dùng được."),
            InternshipManagement.DAL.RoundLockedException => (StatusCodes.Status409Conflict, ex.Message),
            NotFoundException or KeyNotFoundException => (StatusCodes.Status404NotFound, ex.Message),
            ArgumentException or InvalidOperationException => (StatusCodes.Status400BadRequest, ex.Message),
            UnauthorizedAccessException => (StatusCodes.Status403Forbidden, "Bạn không có quyền thực hiện thao tác này."),
            DbUpdateConcurrencyException => (StatusCodes.Status409Conflict, "Hồ sơ vừa được cập nhật. Vui lòng tải lại dữ liệu trước khi thao tác."),
            DbUpdateException => (StatusCodes.Status409Conflict, "Dữ liệu trùng hoặc vi phạm ràng buộc."),
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
