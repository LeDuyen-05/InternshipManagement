using InternshipManagement.BLL.DTOs.DangKyThucTap;
using InternshipManagement.BLL.Services.DangKyThucTap;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CongTyController : ControllerBase
{
    private readonly IDangKyThucTapService _service;

    public CongTyController(IDangKyThucTapService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetDanhSachTuyenDung()
    {
        var list = await _service.GetDanhSachCongTyTuyenDungAsync();
        return Ok(list);
    }

    [HttpPost("de-xuat")]
    public async Task<IActionResult> DeXuatCongTy([FromBody] DeXuatCongTyRequest request)
    {
        try
        {
            var result = await _service.DeXuatCongTyMoiAsync(request);
            return Ok(new { success = true, data = result, message = "Đề xuất doanh nghiệp thành công, đang chờ Khoa thẩm định." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "Lỗi khi gửi đề xuất: " + ex.Message });
        }
    }
}
