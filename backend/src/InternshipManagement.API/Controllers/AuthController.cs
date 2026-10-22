using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.DTOs.Auth;
using InternshipManagement.BLL.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _service;
    private readonly JwtTokenService _jwt;

    public AuthController(AuthService service, JwtTokenService jwt)
    {
        _service = service;
        _jwt = jwt;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var account = await _service.AuthenticateAsync(request.TenDangNhap, request.MatKhau);
        if (account is null)
            return Unauthorized(new { message = "Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản chưa được kích hoạt/bị khóa." });

        return Ok(new LoginResponse(
            _jwt.Create(account),
            account.MaTaiKhoan,
            account.TenDangNhap,
            account.MaVaiTro,
            account.VaiTro?.TenVaiTro ?? "",
            account.MaSV,
            account.MaGV,
            account.MaDaiDien,
            account.Email,
            account.SoDienThoai));
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var x = await _service.RegisterAsync(request);
        return Ok(new { message = "Đăng ký thành công.", maTaiKhoan = x.MaTaiKhoan });
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        try
        {
            await _service.ChangePasswordAsync(User.MaTaiKhoan() ?? "", request);
            return Ok(new { message = "Đổi mật khẩu thành công." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("profile")]
    public async Task<IActionResult> Profile() => Ok(await _service.GetProfileAsync(User.MaTaiKhoan() ?? ""));

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile(UpdateOwnProfileRequest request) =>
        Ok(await _service.UpdateProfileAsync(User.MaTaiKhoan() ?? "", request));

    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout() => Ok(new { message = "Đăng xuất thành công. Client xóa JWT." });
}
