using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using InternshipManagement.BLL.Services.Auth;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace InternshipManagement.WorkflowTests;

public class RoundLifecycleHttpTests
{
    private sealed class Clock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2029, 1, 1, 0, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }

    // 04/11/2026: HTTP/JWT/SQL thật, đồng hồ nghiệp vụ thay thế chỉ trong host kiểm thử.
    // CSDL tạo mới và xóa trong finally; không lấy connection string của ứng dụng.
    [LocalSqlFact]
    public async Task ExternalPlacementThroughProgressGradesCloseReopenAndReclose()
    {
        var database = "CodexLifecycleAudit_" + Guid.NewGuid().ToString("N");
        var connection = $"Server=(localdb)\\MSSQLLocalDB;Database={database};Integrated Security=True;TrustServerCertificate=True";
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlServer(connection).Options;
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root != null && !Directory.Exists(Path.Combine(root.FullName, "src", "InternshipManagement.API"))) root = root.Parent;
        Assert.NotNull(root);
        var clock = new Clock();
        WebApplication? app = null;
        const string round = "AUDIT_LIFE", student = "AUDIT_LIFE_S", password = "Lifecycle-Only-2026!";
        try
        {
            app = await global::Program.BuildApplicationAsync([
                "--contentRoot", Path.Combine(root!.FullName, "src", "InternshipManagement.API"),
                "--applicationName", typeof(global::Program).Assembly.GetName().Name!,
                "--environment", "Testing", "--urls", "http://127.0.0.1:0",
                "--ConnectionStrings:DefaultConnection", connection,
                "--Jwt:Key", "Synthetic-Lifecycle-Test-Key-At-Least-32-Bytes",
                "--DocumentStorage:Enabled", "false", "--Inference:Enabled", "false",
                "--Logging:LogLevel:Default", "None", "--Logging:Console:LogLevel:Default", "None"
            ], services => { services.RemoveAll<TimeProvider>(); services.AddSingleton<TimeProvider>(clock); });
            await using (var scope = app.Services.CreateAsyncScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                db.RoundClock = clock;
                db.DotThucTaps.Add(new() { MaSo = round, TenDot = "Đợt kiểm tra vòng đời", NamHoc = "2028-2029",
                    TrangThai = "DangDienRa", MaLoaiThucTap = "TTKS", MaRubric = "TTKS_V1",
                    ThoiGianBD = new(2029, 1, 1), ThoiGianKT = new(2029, 1, 20),
                    MoChamGV = new(2029, 1, 15, 0, 0, 0, TimeSpan.FromHours(7)),
                    HanChamGV = new(2029, 1, 30, 23, 59, 59, TimeSpan.FromHours(7)),
                    HanChamDN = new(2029, 1, 25, 23, 59, 59, TimeSpan.FromHours(7)) });
                db.SinhViens.Add(new() { MaSV = student, HoTen = "Sinh viên kiểm tra vòng đời", Lop = "AUDIT", Gpa = 3 });
                var passwords = scope.ServiceProvider.GetRequiredService<IPasswordService>();
                db.TaiKhoans.Add(new() { MaTaiKhoan = "AUDIT_LIFE_TK", TenDangNhap = "audit_life_sv", MaSV = student,
                    MaVaiTro = "VT04", MatKhau = passwords.Hash(password) });
                foreach (var login in new[] { "khoa01", "gv001", "dd001", "admin" })
                {
                    var account = await db.TaiKhoans.SingleAsync(x => x.TenDangNhap == login);
                    account.MatKhau = passwords.Hash(password); account.SecurityStamp = Guid.NewGuid().ToString("N");
                }
                await db.SaveChangesAsync();
                Assert.False(await db.CongTyTheoDots.AnyAsync(x => x.MaDot == round));
            }
            await app.StartAsync();
            using var client = new HttpClient { BaseAddress = new Uri(app.Urls.Single()), Timeout = TimeSpan.FromSeconds(40) };
            var tokens = new Dictionary<string, string>();
            foreach (var login in new[] { "khoa01", "gv001", "dd001", "admin", "audit_life_sv" })
            {
                var loginResult = await Send(client, null, HttpMethod.Post, "api/auth/login", new { tenDangNhap = login, matKhau = password });
                tokens[login] = loginResult.GetProperty("token").GetString()!;
            }
            var khoa = tokens["khoa01"]; var sv = tokens["audit_life_sv"]; var gv = tokens["gv001"]; var dn = tokens["dd001"];
            var add = new { maDot = round, maSinhViens = new[] { student } };
            await Send(client, sv, HttpMethod.Post, "api/khoa/sinh-vien-theo-dot", add, HttpStatusCode.Forbidden);
            Assert.Equal(1, (await Send(client, khoa, HttpMethod.Post, "api/khoa/sinh-vien-theo-dot", add)).GetProperty("soLuongThem").GetInt32());
            var external = new { maDot = round, maCongTy = "CT001", tenCongTy = "Đơn vị tiếp nhận bên ngoài", diaChi = "Địa chỉ kiểm tra",
                viTri = "Thực tập công nghệ thông tin", nguoiLienHe = "Người hướng dẫn tại doanh nghiệp", lienHe = "audit@example.invalid",
                ngayBatDau = "2029-01-01", ngayKetThuc = "2029-01-20", daDuocTiepNhan = true };
            var dossier = await Send(client, sv, HttpMethod.Post, "api/ThucTapTuTim", external);
            var dossierId = dossier.GetProperty("maHoSo").GetString();
            await Send(client, sv, HttpMethod.Post, "api/ThucTapTuTim", external, HttpStatusCode.BadRequest);
            await Send(client, dn, HttpMethod.Put, $"api/ThucTapTuTim/{dossierId}/duyet", new { trangThai = "DaDuyet" }, HttpStatusCode.Forbidden);
            var approved = await Send(client, khoa, HttpMethod.Put, $"api/ThucTapTuTim/{dossierId}/duyet", new { trangThai = "DaDuyet", lyDo = "Đã xác minh tiếp nhận" });
            var placement = approved.GetProperty("maPhanBo").GetString();
            await Send(client, sv, HttpMethod.Post, $"api/PhongVan/phan-bo/{placement}/xac-nhan");
            await Send(client, khoa, HttpMethod.Post, "api/GVHuongDan/khoa/phan-cong", new { maDot = round, maGV = "GV001", maSV = student });
            var roster = await Send(client, khoa, HttpMethod.Get, $"api/khoa/sinh-vien-theo-dot?maDot={round}");
            Assert.Equal(1, roster.GetProperty("daPhanBoChinhThuc").GetInt32());
            Assert.Equal("2029-01-01", roster.GetProperty("sinhViens")[0].GetProperty("ngayBatDauThucTap").GetString()![..10]);

            Assert.Equal(2, (await Send(client, khoa, HttpMethod.Post, "api/khoa/bao-cao/tao-moc", new { maDot = round, soTuan = 2 })).GetProperty("createdCount").GetInt32());
            Assert.Equal(0, (await Send(client, khoa, HttpMethod.Post, "api/khoa/bao-cao/tao-moc", new { maDot = round, soTuan = 2 })).GetProperty("createdCount").GetInt32());
            var reports = await Send(client, sv, HttpMethod.Get, $"api/TienDoThucTap/sinhvien/{student}?maDot={round}");
            var report = reports[0].GetProperty("maTienDo").GetString();
            var pendingReport = reports[1].GetProperty("maTienDo").GetString();
            clock.Now = new(2029, 1, 6, 0, 0, 0, TimeSpan.Zero);
            await Send(client, sv, HttpMethod.Post, "api/TienDoThucTap/nop-bao-cao", new { maTienDo = report, noiDungBaoCao = "" }, HttpStatusCode.BadRequest);
            await Send(client, sv, HttpMethod.Post, "api/TienDoThucTap/nop-bao-cao", new { maTienDo = report, noiDungBaoCao = "Đã hoàn thành công việc tuần đầu." });
            await Send(client, sv, HttpMethod.Post, "api/TienDoThucTap/nop-bao-cao", new { maTienDo = pendingReport, noiDungBaoCao = "Đã hoàn thành công việc, chờ giảng viên duyệt." });
            await Send(client, dn, HttpMethod.Put, $"api/TienDoThucTap/{report}/duyet", new { trangThaiDuyet = "DaDuyet" }, HttpStatusCode.Forbidden);
            await Send(client, gv, HttpMethod.Put, $"api/TienDoThucTap/{report}/duyet", new { trangThaiDuyet = "DaDuyet", nhanXet = "Đạt yêu cầu." });

            var criteria = (await Send(client, gv, HttpMethod.Get, $"api/PhieuChamDiem/tieu-chi?maDot={round}")).GetProperty("data").EnumerateArray().ToArray();
            object[] Scores(string group) => criteria.Where(x => x.GetProperty("nhomDanhGia").GetString() == group)
                .Select((x, i) => (object)new { maTieuChi = x.GetProperty("maTieuChi").GetString(), diemCham = i == 0 ? 0m : x.GetProperty("diemToiDa").GetDecimal() }).ToArray();
            var dnScores = Scores("DN"); var gvScores = Scores("GV");
            Assert.NotEmpty(dnScores); Assert.NotEmpty(gvScores);
            object Grade(object[] scores) => new { maSV = student, maDot = round, chiTiets = scores, nhanXetGV = "Đã đối chiếu báo cáo." };
            object EnterpriseGrade(object[] scores, bool official = false) => new { maPhanBo = placement, chiTiets = scores, khoaChinhThuc = official, nhanXet = "Đã xác minh kết quả thực tập." };
            await Send(client, dn, HttpMethod.Post, "api/DoanhNghiep/danh-gia", EnterpriseGrade(dnScores), HttpStatusCode.BadRequest);
            clock.Now = new(2029, 1, 21, 0, 0, 0, TimeSpan.Zero);
            await Send(client, gv, HttpMethod.Post, "api/PhieuChamDiem/cham-diem", Grade(dnScores), HttpStatusCode.Forbidden);
            await Send(client, dn, HttpMethod.Post, "api/DoanhNghiep/danh-gia", EnterpriseGrade(gvScores), HttpStatusCode.BadRequest);
            await Send(client, dn, HttpMethod.Post, "api/DoanhNghiep/danh-gia", EnterpriseGrade(dnScores.Take(1).ToArray(), true), HttpStatusCode.BadRequest);
            await Send(client, dn, HttpMethod.Post, "api/DoanhNghiep/danh-gia", EnterpriseGrade(dnScores, true));
            await Send(client, dn, HttpMethod.Post, "api/DoanhNghiep/danh-gia", EnterpriseGrade(dnScores), HttpStatusCode.BadRequest);
            var incomplete = await Send(client, khoa, HttpMethod.Get, $"api/khoa/chot-dot/{round}");
            Assert.False(incomplete.GetProperty("coTheChot").GetBoolean());
            Assert.False(incomplete.GetProperty("sinhViens")[0].GetProperty("duDiem").GetBoolean());
            await Send(client, khoa, HttpMethod.Post, $"api/khoa/chot-dot/{round}/chot", new { phienBan = 0, lyDo = "Rà soát cuối đợt" }, HttpStatusCode.BadRequest);
            await Send(client, gv, HttpMethod.Post, "api/PhieuChamDiem/cham-diem", Grade(gvScores));
            var complete = await Send(client, khoa, HttpMethod.Get, $"api/khoa/chot-dot/{round}");
            Assert.True(complete.GetProperty("coTheChot").GetBoolean(), complete.ToString());
            Assert.True(complete.GetProperty("sinhViens")[0].GetProperty("duDiem").GetBoolean());
            await Send(client, khoa, HttpMethod.Post, $"api/khoa/chot-dot/{round}/chot", new { phienBan = 0, lyDo = "Đã rà đủ điểm và hồ sơ" });
            await Send(client, gv, HttpMethod.Post, "api/PhieuChamDiem/cham-diem", Grade(gvScores), HttpStatusCode.Conflict);
            await Send(client, gv, HttpMethod.Put, $"api/TienDoThucTap/{pendingReport}/duyet", new { trangThaiDuyet = "DaDuyet", nhanXet = "Điều chỉnh nhận xét" }, HttpStatusCode.Conflict);
            await Send(client, gv, HttpMethod.Post, $"api/khoa/chot-dot/{round}/mo-lai", new { phienBan = 1, lyDo = "Điều chỉnh", hanMoLai = clock.Now.AddDays(1) }, HttpStatusCode.Forbidden);
            await Send(client, khoa, HttpMethod.Post, $"api/khoa/chot-dot/{round}/mo-lai", new { phienBan = 0, lyDo = "Điều chỉnh", hanMoLai = clock.Now.AddDays(1) }, HttpStatusCode.Conflict);
            await Send(client, khoa, HttpMethod.Post, $"api/khoa/chot-dot/{round}/mo-lai", new { phienBan = 1, lyDo = "", hanMoLai = clock.Now.AddDays(1) }, HttpStatusCode.BadRequest);
            await Send(client, khoa, HttpMethod.Post, $"api/khoa/chot-dot/{round}/mo-lai", new { phienBan = 1, lyDo = "Đính chính điểm và nhận xét theo biên bản", hanMoLai = clock.Now.AddDays(1) });
            var correctedDn = criteria.Where(x => x.GetProperty("nhomDanhGia").GetString() == "DN")
                .Select((x, i) => (object)new { maTieuChi = x.GetProperty("maTieuChi").GetString(), diemCham = i == 0 ? 0m : x.GetProperty("diemToiDa").GetDecimal() / 2 }).ToArray();
            await Send(client, dn, HttpMethod.Post, "api/DoanhNghiep/danh-gia", EnterpriseGrade(correctedDn, true));
            var changedScores = criteria.Where(x => x.GetProperty("nhomDanhGia").GetString() == "GV")
                .Select(x => (object)new { maTieuChi = x.GetProperty("maTieuChi").GetString(), diemCham = x.GetProperty("diemToiDa").GetDecimal() }).ToArray();
            await Send(client, gv, HttpMethod.Post, "api/PhieuChamDiem/cham-diem", Grade(changedScores));
            await Send(client, khoa, HttpMethod.Put, $"api/khoa/phan-cong/{student}", new { maDot = round, maGiangVien = "GV002" }, HttpStatusCode.Conflict);
            await Send(client, gv, HttpMethod.Put, $"api/TienDoThucTap/{pendingReport}/duyet", new { trangThaiDuyet = "DaDuyet", nhanXet = "Đã đối chiếu bổ sung." });
            clock.Now = clock.Now.AddDays(1);
            var state = await Send(client, sv, HttpMethod.Get, $"api/dot-thuc-tap/{round}/khoa");
            Assert.Equal("ChoChotLai", state.GetProperty("trangThai").GetString());
            await Send(client, gv, HttpMethod.Post, "api/PhieuChamDiem/cham-diem", Grade(changedScores), HttpStatusCode.Conflict);
            await Send(client, dn, HttpMethod.Post, "api/DoanhNghiep/danh-gia", EnterpriseGrade(dnScores, true), HttpStatusCode.BadRequest);
            await Send(client, tokens["admin"], HttpMethod.Post, $"api/khoa/chot-dot/{round}/chot", new { phienBan = 2, lyDo = "Kiểm tra phân quyền" }, HttpStatusCode.Forbidden);
            await Send(client, khoa, HttpMethod.Post, $"api/khoa/chot-dot/{round}/chot", new { phienBan = 2, lyDo = "Đã rà soát và chốt lại sau đính chính" });
            var history = await Send(client, khoa, HttpMethod.Get, $"api/khoa/chot-dot/{round}/lich-su");
            Assert.Equal(3, history.EnumerateArray().Count(x => x.GetProperty("loai").GetString() is "Chot" or "MoLai"));
            Assert.Contains(history.EnumerateArray(), x => x.GetProperty("loai").GetString() == "DieuChinh");
            Assert.Equal(2, history.EnumerateArray().Count(x => x.GetProperty("loai").GetString() == "Chot"));
            var snapshots = new List<JsonElement>();
            foreach (var entry in history.EnumerateArray().Where(x => x.GetProperty("loai").GetString() == "Chot"))
                snapshots.Add(await Send(client, khoa, HttpMethod.Get, $"api/khoa/chot-dot/{round}/lich-su/{entry.GetProperty("maNhatKy").GetString()}"));
            Assert.NotEqual(snapshots[0].GetProperty("SinhViens")[0].GetProperty("TongDiem").GetDecimal(), snapshots[1].GetProperty("SinhViens")[0].GetProperty("TongDiem").GetDecimal());
            await using var verify = new AppDbContext(options);
            var form = await verify.PhieuChamDiems.Include(x => x.ChiTietChamDiems).SingleAsync(x => x.MaDot == round);
            Assert.True(form.DaDoiChieuPhieuDN);
            Assert.Equal(criteria.Length, form.ChiTietChamDiems.Count);
            Assert.Contains(form.ChiTietChamDiems, x => x.DiemCham == 0); // Điểm 0 DN giữ nguyên sau cập nhật GV.
            var enterpriseActor = await verify.TaiKhoans.Where(x => x.TenDangNhap == "dd001").Select(x => x.MaTaiKhoan).SingleAsync();
            Assert.True(await verify.NhatKyChotDots.AnyAsync(x => x.MaDot == round && x.Loai == "DieuChinh" && x.NguoiThucHien == enterpriseActor));
            Assert.False(await verify.KhongHoanTatDots.AnyAsync(x => x.MaDot == round));
            Assert.Equal("DaChot", (await verify.ChotDotThucTaps.SingleAsync(x => x.MaDot == round)).TrangThai);
        }
        finally
        {
            if (app != null) { await app.StopAsync(); await app.DisposeAsync(); }
            await using var cleanup = new AppDbContext(options);
            await cleanup.Database.EnsureDeletedAsync();
        }
    }

    private static async Task<JsonElement> Send(HttpClient client, string? token, HttpMethod method, string path,
        object? body = null, HttpStatusCode expected = HttpStatusCode.OK)
    {
        using var request = new HttpRequestMessage(method, path);
        if (token != null) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (body != null) request.Content = JsonContent.Create(body);
        using var response = await client.SendAsync(request);
        var text = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == expected, $"{method} {path}: expected {(int)expected}, got {(int)response.StatusCode}: {text}");
        if (string.IsNullOrWhiteSpace(text)) return default;
        using var json = JsonDocument.Parse(text);
        return json.RootElement.Clone();
    }
}
