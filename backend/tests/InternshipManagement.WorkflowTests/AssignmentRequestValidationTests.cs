using InternshipManagement.BLL.DTOs.GVHuongDan;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace InternshipManagement.WorkflowTests;

public class AssignmentRequestValidationTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void EveryAssignmentNeedsRoundEvenWhenEnvelopeHasIt(bool rowHasRound)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddControllers();
        using var provider = services.BuildServiceProvider();
        var context = new ActionContext(new DefaultHttpContext { RequestServices = provider }, new RouteData(), new ActionDescriptor());
        var request = new TuDongPhanCongConfirmRequest { MaDot="DOT02", DanhSachPhanCong = [
            new() { MaSV="SV019", MaGV="G1", MaDot=rowHasRound ? "DOT02" : null! },
            new() { MaSV="SV020", MaGV="G2", MaDot=rowHasRound ? "DOT02" : null! },
            new() { MaSV="SV021", MaGV="G3", MaDot=rowHasRound ? "DOT02" : null! }
        ] };
        provider.GetRequiredService<IObjectModelValidator>().Validate(context, null, "", request);
        Assert.Equal(rowHasRound, context.ModelState.IsValid);
        if (!rowHasRound) Assert.Equal(3, context.ModelState.ErrorCount);
    }
}
