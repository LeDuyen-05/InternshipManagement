using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.Recommendation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/recommendation"), Authorize]
public class RecommendationController(RecommendationService service, IResourceAccess access) : ControllerBase
{
    [HttpGet("{maSV}")]
    public async Task<IActionResult> Recommend(string maSV, [FromQuery] string maDot, [FromQuery] int k = 5)
    {
        if (!await access.CanAccessStudentAsync(User, maSV, maDot)) return Forbid();
        var result = await service.RecommendAsync(maSV, k, maDot: maDot, cancellationToken: HttpContext.RequestAborted);
        if (!await access.CanAccessStudentAsync(User, maSV, maDot)) return Forbid();
        return Ok(result);
    }

    [HttpGet("{maSV}/evaluate")]
    public async Task<IActionResult> Evaluate(string maSV, [FromQuery] string maDot, [FromQuery] int k = 5)
    {
        if (!await access.CanAccessStudentAsync(User, maSV, maDot)) return Forbid();
        return Ok(await service.EvaluateAsync(maSV, k, maDot));
    }

    [HttpPost("{maSV}/luu")]
    [Authorize(Roles = Roles.Khoa)]
    public async Task<IActionResult> SaveRecommendations(string maSV, [FromQuery] string maDot, [FromQuery] int k = 5)
    {
        return Ok(await service.RecommendAsync(maSV, k, persist: true, maDot: maDot));
    }
}
