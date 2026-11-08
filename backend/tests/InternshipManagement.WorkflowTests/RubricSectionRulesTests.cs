using InternshipManagement.BLL.DTOs.Admin;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.Auth;
using InternshipManagement.BLL.Services.GVHuongDan;
using InternshipManagement.BLL.Validators.SinhVien;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InternshipManagement.WorkflowTests;

// Thang 10 điểm: phần GV và phần DN mỗi phần tối đa 5.00, báo ngay khi soạn; ban hành báo đủ lý do kèm số liệu.
public class RubricSectionRulesTests
{
    private static async Task<(AppDbContext Db, AdminService Service)> DraftAsync()
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.BoTieuChis.Add(new BoTieuChi { MaRubric = "R", TenBo = "Nháp", MaLoaiThucTap = "TTNN", TrangThai = "Nhap" });
        await db.SaveChangesAsync();
        return (db, new AdminService(db, Mock.Of<IGVHuongDanService>(), new PasswordService(), new SinhVienValidator()));
    }

    private static SaveCriteriaRequest Req(string ma, string clo, double diem, string nhom, int thuTu) =>
        new(ma, "Tiêu chí " + clo, diem, nhom, thuTu, clo, "R");

    [Fact]
    public async Task EachSectionIsCappedAtFivePointsWhileEditing()
    {
        var (db, service) = await DraftAsync();
        await using var _ = db;
        await service.CreateCriteriaAsync(Req("R1", "CLO1.1", 3, "GV", 1));
        await service.CreateCriteriaAsync(Req("R2", "CLO1.2", 1.5, "GV", 2));
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateCriteriaAsync(Req("R3", "CLO1.3", 1, "GV", 3)));
        Assert.Contains("còn lại tối đa 0.50", ex.Message, StringComparison.OrdinalIgnoreCase);
        await service.CreateCriteriaAsync(Req("R3", "CLO1.3", 0.5, "GV", 3)); // vừa đủ 5.00

        // Phần DN độc lập với phần GV; sửa tăng điểm vượt 5.00 cũng bị chặn.
        await service.CreateCriteriaAsync(Req("R4", "CLO4.1", 2, "DN", 4));
        await service.CreateCriteriaAsync(Req("R5", "CLO4.2", 3, "DN", 5));
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateCriteriaAsync("R5", Req("R5", "CLO4.2", 3.5, "DN", 5)));
        // Chuyển một tiêu chí từ GV sang DN làm phần DN vượt 5.00.
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateCriteriaAsync("R3", Req("R3", "CLO1.3", 0.5, "DN", 3)));
        // Sửa mô tả không đổi điểm vẫn được.
        await service.UpdateCriteriaAsync("R1", Req("R1", "CLO1.1", 3, "GV", 1) with { TenTieuChi = "Mô tả mới" });

        RubricService.Validate(await db.TieuChis.ToListAsync());
    }

    [Fact]
    public void PublishErrorListsEveryProblemWithCurrentTotals()
    {
        var criteria = new List<TieuChi>
        {
            new() { MaTieuChi = "A", MaCLO = "CLO1.1", DiemToiDa = 4, NhomDanhGia = "GV", ThuTu = 1 },
            new() { MaTieuChi = "B", MaCLO = "CLO1.2", DiemToiDa = 2, NhomDanhGia = "GV", ThuTu = 1 },
            new() { MaTieuChi = "C", MaCLO = "CLO4.1", DiemToiDa = 2, NhomDanhGia = "DN", ThuTu = 3 },
        };
        var ex = Assert.Throws<ArgumentException>(() => RubricService.Validate(criteria));
        Assert.Contains("tổng hiện tại 8.00/10.00", ex.Message);
        Assert.Contains("phần giảng viên đang 6.00 điểm, cần đúng 5.00", ex.Message);
        Assert.Contains("phần doanh nghiệp đang 2.00 điểm, cần đúng 5.00", ex.Message);
        Assert.Contains("thứ tự bị trùng: 1", ex.Message);
        Assert.Contains("CLO4.1 = 2.00 và CLO4.2 = 3.00", ex.Message);
    }
}
