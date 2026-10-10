using InternshipManagement.BLL.Services.Recommendation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers;

[ApiController, Route("api/recommendation"), Authorize]
public class RecommendationController(RecommendationService service) : ControllerBase
{
    [HttpGet("{maSV}")] public async Task<IActionResult> Recommend(string maSV,[FromQuery]int k=5){try{return Ok(await service.RecommendAsync(maSV,k));}catch(Exception e){return NotFound(new{message=e.Message});}}
    [HttpGet("{maSV}/evaluate")] public async Task<IActionResult> Evaluate(string maSV,[FromQuery]int k=5){try{return Ok(await service.EvaluateAsync(maSV,k));}catch(Exception e){return NotFound(new{message=e.Message});}}
}
