using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.DTOs.Auth;
using InternshipManagement.BLL.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _service; private readonly JwtTokenService _jwt;
    public AuthController(AuthService service, JwtTokenService jwt) { _service=service; _jwt=jwt; }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        try 
        {
            var account = await _service.AuthenticateAsync(request.TenDangNhap, request.MatKhau);
            if (account is null) return Unauthorized(new { message = "Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản bị khóa." });
            return Ok(new LoginResponse(_jwt.Create(account), account.MaTaiKhoan, account.TenDangNhap, account.MaVaiTro, account.VaiTro?.TenVaiTro ?? "", account.MaSV, account.MaGV, account.MaDaiDien));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Lỗi hệ thống: " + ex.ToString() });
        }
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        try { var x = await _service.RegisterAsync(request); return Ok(new { message="Đăng ký thành công.", maTaiKhoan=x.MaTaiKhoan }); }
        catch (Exception ex) { return BadRequest(new { message=ex.Message }); }
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        try { await _service.ChangePasswordAsync(User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "", request); return Ok(new { message="Đổi mật khẩu thành công." }); }
        catch (Exception ex) { return BadRequest(new { message=ex.Message }); }
    }

    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout() => Ok(new { message = "Đăng xuất thành công. Client xóa JWT." });
}
