using InternshipManagement.BLL.Services.Recommendation;
using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;
using Xunit;
using Xunit.Abstractions;

namespace InternshipManagement.WorkflowTests;

// Gợi ý TF-IDF (chế độ mặc định khi chưa bật mô hình) cho sinh viên các ngành ngoài CNTT.
public class RecommendationMajorsTests(ITestOutputHelper output)
{
    private sealed class Clock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(2029, 1, 10, 0, 0, 0, TimeSpan.Zero);
    }
    private static readonly TimeProvider Time = new Clock();

    // JD viết theo văn phong tin tuyển dụng thật, không chép lại từ ngữ trong hồ sơ sinh viên.
    private static readonly (string Ma, string ViTri, string YeuCau)[] Jobs =
    {
        ("KETOAN", "Thực tập sinh Kế toán tổng hợp", "Hỗ trợ lập, kiểm tra chứng từ và hạch toán các nghiệp vụ phát sinh. Hỗ trợ lập tờ khai thuế GTGT, thuế TNDN và báo cáo tài chính cuối kỳ. Sử dụng tốt Excel, ưu tiên biết phần mềm MISA hoặc FAST."),
        ("MARKETING", "Thực tập sinh Digital Marketing", "Lên ý tưởng và sản xuất nội dung cho fanpage, website. Hỗ trợ chạy và tối ưu quảng cáo Facebook Ads, Google Ads, theo dõi số liệu chiến dịch. Biết thiết kế cơ bản bằng Canva, hiểu SEO là lợi thế."),
        ("NHANSU", "Thực tập sinh Nhân sự", "Đăng tin tuyển dụng, sàng lọc CV và sắp xếp lịch phỏng vấn ứng viên. Cập nhật hồ sơ nhân viên, hỗ trợ tổng hợp chấm công và tính lương. Hiểu biết cơ bản về Bộ luật Lao động."),
        ("THUCPHAM", "Thực tập sinh QA/QC thực phẩm", "Lấy mẫu và kiểm tra chất lượng nguyên liệu, thành phẩm. Kiểm nghiệm chỉ tiêu vi sinh, hóa lý. Giám sát vệ sinh an toàn thực phẩm theo HACCP, ISO 22000, GMP tại nhà máy."),
        ("KHACHSAN", "Thực tập sinh Lễ tân khách sạn", "Đón tiếp khách, làm thủ tục nhận và trả phòng, xử lý yêu cầu đặt phòng. Phối hợp bộ phận buồng phòng và nhà hàng. Giao tiếp tiếng Anh tốt, sẵn sàng làm việc theo ca."),
        ("BACKEND", "Thực tập sinh Lập trình Backend .NET", "Tham gia xây dựng Web API bằng ASP.NET Core và C#. Làm việc với SQL Server, Entity Framework, viết truy vấn tối ưu. Hiểu lập trình hướng đối tượng và Git."),
        ("FRONTEND", "Thực tập sinh Frontend ReactJS", "Phát triển giao diện web bằng ReactJS, JavaScript, HTML/CSS. Gọi RESTful API, làm việc nhóm theo Scrum."),
    };

    private static async Task<AppDbContext> SeedAsync()
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options) { RoundClock = Time };
        db.DotThucTaps.Add(new() { MaSo = "A", TenDot = "Đợt A", NamHoc = "2028-2029", TrangThai = "DangDienRa", ThoiGianBD = new(2029, 2, 1), ThoiGianKT = new(2029, 5, 1) });
        foreach (var (ma, viTri, yeuCau) in Jobs)
        {
            db.CongTys.Add(new() { MaCongTy = ma, TenCongTy = "Công ty " + ma, TrangThai = "DaDuyet" });
            db.CongTyTheoDots.Add(new() { MaCongTy = ma, MaDot = "A", ViTriTuyen = viTri, YeuCau = yeuCau, SoLuongNhan = 3,
                MoDangKy = Time.GetUtcNow().AddDays(-1), HanDangKy = Time.GetUtcNow().AddDays(5) });
        }
        await db.SaveChangesAsync();
        return db;
    }

    [Theory]
    [InlineData("Kế toán doanh nghiệp", "Hạch toán kế toán, kê khai thuế, lập báo cáo tài chính, Excel, phần mềm MISA", "KETOAN")]
    [InlineData("Marketing", "Viết content mạng xã hội, chạy quảng cáo Facebook Ads và Google Ads, SEO website, thiết kế Canva", "MARKETING")]
    [InlineData("Quản trị nhân lực", "Tuyển dụng và phỏng vấn ứng viên, quản lý hồ sơ nhân viên, chấm công, tính lương, luật lao động", "NHANSU")]
    [InlineData("Công nghệ thực phẩm", "Kiểm nghiệm vi sinh, phân tích hóa lý, HACCP, ISO 22000, kiểm soát chất lượng sản phẩm", "THUCPHAM")]
    [InlineData("Quản trị khách sạn", "Nghiệp vụ lễ tân, đặt phòng, chăm sóc khách lưu trú, giao tiếp tiếng Anh", "KHACHSAN")]
    [InlineData("Công nghệ phần mềm", "C#, ASP.NET Core Web API, SQL Server, Entity Framework, Git", "BACKEND")]
    public async Task BaselineRanksTheMatchingFieldFirstForEachMajor(string nganh, string kyNang, string expected)
    {
        await using var db = await SeedAsync();
        db.SinhViens.Add(new() { MaSV = "SV", HoTen = "Sinh viên", ChuyenNganh = nganh, KyNang = kyNang });
        await db.SaveChangesAsync();

        var result = await new RecommendationService(db, Time).RecommendAsync("SV", k: 3, maDot: "A");

        output.WriteLine($"{nganh}: " + string.Join(" | ", result.Items.Select(x => $"{x.MaCongTy} {x.CosineScore:0.000}")));
        Assert.Equal("BaselineOnly", result.ModelStatus);
        Assert.Equal(expected, result.Items[0].MaCongTy);
    }
}
