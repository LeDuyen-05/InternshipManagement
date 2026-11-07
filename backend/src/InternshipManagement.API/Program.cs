using System.Text;
using System.Diagnostics;
using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.Auth;
using InternshipManagement.BLL.Services.DangKyThucTap;
using InternshipManagement.BLL.Services.DoanhNghiep;
using InternshipManagement.BLL.Services.GioiThieu;
using InternshipManagement.BLL.Services.GoiYCongTy;
using InternshipManagement.BLL.Services.GVHuongDan;
using InternshipManagement.BLL.Services.HoSoNangLuc;
using InternshipManagement.BLL.Services.PhieuChamDiem;
using InternshipManagement.BLL.Services.PhongVan;
using InternshipManagement.BLL.Services.Recommendation;
using InternshipManagement.BLL.Services.SinhVien;
using InternshipManagement.BLL.Services.ThongKe;
using InternshipManagement.BLL.Services.TienDoThucTap;
using InternshipManagement.BLL.Validators.GioiThieu;
using InternshipManagement.BLL.Validators.SinhVien;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Database;
using InternshipManagement.DAL.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

public partial class Program
{
    public static async Task Main(string[] args)
    {
        var app = await BuildApplicationAsync(args);
        await app.RunAsync();
    }

    // Allows integration checks to replace dependencies without changing production configuration.
    public static async Task<WebApplication> BuildApplicationAsync(
        string[] args, Action<IServiceCollection>? configureServices = null)
    {
        var startupTimer = Stopwatch.StartNew();
        var builder = WebApplication.CreateBuilder(args);
        // Optional machine-private R2 settings. Environment/CLI remain authoritative (including test-copy overrides).
        builder.Configuration
            .AddJsonFile(Path.Combine(builder.Environment.ContentRootPath, "appsettings.R2.private.json"), optional: true, reloadOnChange: false)
            .AddJsonFile(Path.Combine(AppContext.BaseDirectory, "appsettings.R2.private.json"), optional: true, reloadOnChange: false)
            .AddJsonFile(Path.Combine(builder.Environment.ContentRootPath, "appsettings.Inference.private.json"), optional: true, reloadOnChange: false)
            .AddJsonFile(Path.Combine(AppContext.BaseDirectory, "appsettings.Inference.private.json"), optional: true, reloadOnChange: false)
            // Bí mật theo môi trường (chuỗi kết nối, JWT key) không commit: appsettings.{Env}.private.json – xem file .example.
            .AddJsonFile(Path.Combine(builder.Environment.ContentRootPath, $"appsettings.{builder.Environment.EnvironmentName}.private.json"), optional: true, reloadOnChange: false)
            .AddEnvironmentVariables().AddCommandLine(args);

        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException($"Thiếu ConnectionStrings:DefaultConnection. Tạo appsettings.{builder.Environment.EnvironmentName}.private.json (xem file .example) hoặc đặt biến môi trường ConnectionStrings__DefaultConnection.");
        var jwtKey = builder.Configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("Thiếu Jwt:Key (>= 32 byte).");
        if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32)
            throw new InvalidOperationException("Thiếu Jwt:Key (>= 32 byte). Xem README mục 'Cấu hình bí mật'.");
        var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "InternshipManagement";
        var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "InternshipManagement.Web";
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? new[] { "http://localhost:5173" };

        // Bộ lọc theo khoa dựa vào các bảng cha; cảnh báo EF về điều hướng bắt buộc bị lọc là chủ đích.
        builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(connectionString).ConfigureWarnings(w =>
            w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.CoreEventId.PossibleIncorrectRequiredNavigationWithQueryFilterInteractionWarning)));
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddScoped<IKhoaScope, HttpKhoaScope>();
        builder.Services.AddScoped<KhoaService>();
        builder.Services.AddScoped<LoaiThucTapService>();

        // ---- Repositories (mỗi interface đăng ký ĐÚNG MỘT LẦN) ----
        builder.Services.AddScoped<ISinhVienRepository, SinhVienRepository>();
        builder.Services.AddScoped<IGioiThieuRepository, GioiThieuRepository>();
        builder.Services.AddScoped<IGVHuongDanRepository, GVHuongDanRepository>();
        builder.Services.AddScoped<ITienDoThucTapRepository, TienDoThucTapRepository>();
        builder.Services.AddScoped<IPhieuChamDiemRepository, PhieuChamDiemRepository>();
        builder.Services.AddScoped<IHoSoNangLucRepository, HoSoNangLucRepository>();
        builder.Services.AddScoped<ICongTyRepository, CongTyRepository>();
        builder.Services.AddScoped<IDangKyThucTapRepository, DangKyThucTapRepository>();
        builder.Services.AddScoped<IPhongVanRepository, PhongVanRepository>();
        builder.Services.AddScoped<IPhanBoThucTapRepository, PhanBoThucTapRepository>();
        builder.Services.AddScoped<IThongKeRepository, ThongKeRepository>();
        builder.Services.AddScoped<IGoiYCongTyRepository, GoiYCongTyRepository>();

        // ---- Services ----
        builder.Services.AddScoped<AuthService>();
        builder.Services.AddScoped<AdminService>();
        builder.Services.AddScoped<AdminListService>();
        builder.Services.AddScoped<AssignmentListService>();
        builder.Services.AddScoped<RubricService>();
        builder.Services.AddScoped<CatalogImportService>();
        builder.Services.AddScoped<RoundStudentImportService>();
        builder.Services.AddSingleton<IDatabaseBackupExecutor>(_ => new SqlDatabaseBackupExecutor(connectionString));
        builder.Services.AddSingleton(sp => new DatabaseBackupService(
            builder.Configuration.GetSection("Backup").Get<BackupOptions>() ?? new BackupOptions(),
            sp.GetRequiredService<IDatabaseBackupExecutor>(), TimeProvider.System,
            sp.GetRequiredService<ILogger<DatabaseBackupService>>(), builder.Environment.EnvironmentName,
            builder.Environment.WebRootPath ?? Path.Combine(builder.Environment.ContentRootPath, "wwwroot")));
        builder.Services.AddScoped<ChotDotService>();
        builder.Services.AddScoped<EnterpriseRepresentativeService>();
        builder.Services.AddScoped<InternshipManagement.BLL.Services.SinhVienTheoDot.SinhVienTheoDotService>();
        builder.Services.AddScoped<InternshipManagement.BLL.Services.SinhVienTheoDot.UngTuyenHoTroService>();
        builder.Services.AddScoped<InternshipManagement.BLL.Services.SinhVienTheoDot.SupportResponseService>();
        builder.Services.AddScoped<InternshipManagement.BLL.Services.SinhVienTheoDot.LanHoTroService>();
        builder.Services.AddScoped<InternshipManagement.BLL.Services.SinhVienTheoDot.CongBoDanhSachService>();
        builder.Services.AddScoped<InternshipManagement.BLL.Services.SinhVienTheoDot.RaSoatNoiService>();
        builder.Services.AddScoped<InternshipManagement.BLL.Services.PhanBo.DieuChinhNoiThucTapService>();
        builder.Services.AddScoped<InternshipManagement.BLL.Services.PhanBo.KhoaChotPhanBoService>();
        builder.Services.AddScoped<InternshipManagement.BLL.Services.PhanBo.ConfirmationDeadlineService>();
        builder.Services.AddScoped<RecommendationService>();
        var inference = builder.Configuration.GetSection("Inference").Get<LtrOptions>() ?? new LtrOptions();
        inference.Validate();
        builder.Services.AddSingleton(inference);
        builder.Services.AddHttpClient<ILtrScorer, HttpLtrScorer>(client => client.Timeout = Timeout.InfiniteTimeSpan)
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false, UseProxy = false });
        builder.Services.AddScoped<DoanhNghiepService>(sp => new(sp.GetRequiredService<AppDbContext>(), sp.GetRequiredService<IPhieuChamDiemService>(),
            sp.GetRequiredService<TimeProvider>(), builder.Configuration.GetValue<bool>("Interview:AllowAbsenceRecording", true)));
        builder.Services.AddSingleton(TimeProvider.System);
        var documentStorage = builder.Configuration.GetSection("DocumentStorage").Get<InternshipManagement.BLL.Services.Documents.DocumentStorageOptions>() ?? new();
        documentStorage.Validate();
        builder.Services.AddSingleton(documentStorage);
        builder.Services.AddScoped<InternshipManagement.BLL.Services.Documents.IDocumentObjectStore, InternshipManagement.BLL.Services.Documents.R2ObjectStore>();
        builder.Services.AddScoped<InternshipManagement.BLL.Services.Documents.DocumentAccessService>();
        builder.Services.AddScoped<InternshipManagement.BLL.Services.Documents.DocumentService>();
        builder.Services.AddScoped<InternshipManagement.BLL.Services.ThucTapTuTim.ThucTapTuTimService>();
        builder.Services.AddSingleton<JwtTokenService>();
        builder.Services.AddSingleton<LoginAttemptLimiter>();
        builder.Services.AddScoped<ISinhVienService, SinhVienService>();
        builder.Services.AddScoped<SinhVienValidator>();
        builder.Services.AddScoped<CreateSinhVienValidator>();
        builder.Services.AddScoped<IHoSoNangLucService, HoSoNangLucService>();
        builder.Services.AddScoped<IDangKyThucTapService, DangKyThucTapService>();
        builder.Services.AddScoped<ITienDoThucTapService, TienDoThucTapService>();
        builder.Services.AddScoped<InternshipManagement.BLL.Services.Admin.ThoiHanService>();
        builder.Services.AddScoped<InternshipManagement.BLL.Services.Admin.CompanyRoundService>();
        builder.Services.AddScoped<InternshipManagement.BLL.Services.PhanBo.PlacementPeriodService>();
        builder.Services.AddScoped<IPhongVanService, PhongVanService>();
        builder.Services.AddScoped<IGioiThieuService, GioiThieuService>();
        builder.Services.AddScoped<CreateGioiThieuValidator>();
        builder.Services.AddScoped<IGVHuongDanService, GVHuongDanService>();
        builder.Services.AddScoped<IPhieuChamDiemService, PhieuChamDiemService>();
        builder.Services.AddScoped<IThongKeService, ThongKeService>();
        builder.Services.AddScoped<InternshipManagement.BLL.Services.ThongKe.FailedInternshipService>();
        builder.Services.AddScoped<IGoiYCongTyService, GoiYCongTyService>();
        builder.Services.AddScoped<IResourceAccess, ResourceAccess>();
        builder.Services.AddSingleton<IPasswordService, PasswordService>();

        builder.Services.AddControllers();
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();
        builder.Services.AddProblemDetails();
        builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

        builder.Services.AddCors(o => o.AddPolicy("Frontend", p =>
        {
            if (allowedOrigins.Contains("*") || allowedOrigins.Length == 0)
            {
                p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
            }
            else
            {
                p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
            }
        }));

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
        {
            o.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                ValidateIssuer = true, ValidIssuer = jwtIssuer,
                ValidateAudience = true, ValidAudience = jwtAudience,
                ValidateLifetime = true, ClockSkew = TimeSpan.FromMinutes(1),
                ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 }
            };
            o.Events = new JwtBearerEvents
            {
                OnTokenValidated = async context =>
                {
                    var id = context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                        ?? context.Principal?.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
                    var stamp = context.Principal?.FindFirst("security_stamp")?.Value;
                    var roleId = context.Principal?.FindFirst("maVaiTro")?.Value;
                    if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(stamp) || string.IsNullOrWhiteSpace(roleId))
                    {
                        context.Fail("Token thiếu thông tin phiên bảo mật.");
                        return;
                    }

                    var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                    var account = await db.TaiKhoans.AsNoTracking().FirstOrDefaultAsync(x => x.MaTaiKhoan == id);
                    var roles = context.Principal?.FindAll(System.Security.Claims.ClaimTypes.Role).Select(x => x.Value).Distinct().ToArray() ?? [];
                    var expectedRole = account?.MaVaiTro switch { "VT01" => "QuanTriVien", "VT02" => "Khoa", "VT03" => "GiangVien", "VT04" => "SinhVien", "VT05" => "DaiDienDN", _ => null };
                    if (account is null || account.TrangThai != "HoatDong" || account.SecurityStamp != stamp ||
                        account.MaVaiTro != roleId || expectedRole is null || roles.Length != 1 || roles[0] != expectedRole)
                    {
                        context.Fail("Tài khoản hoặc phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại.");
                        return;
                    }
                    if (account.MaVaiTro == "VT05" && await InternshipManagement.DAL.Common.EnterpriseAccountPolicy
                        .HasOtherActiveAccountAsync(db, account.MaDaiDien, account.MaTaiKhoan))
                    {
                        context.Fail("Doanh nghiệp chưa có tài khoản đại diện duy nhất được xác minh. Liên hệ QTV.");
                        return;
                    }
                    // Khoa đọc lại từ CSDL ở mỗi request: đổi khoa của SV/GV/cán bộ có hiệu lực ngay, không tin giá trị trong token.
                    if (context.Principal?.Identity is System.Security.Claims.ClaimsIdentity identity)
                    {
                        foreach (var claim in identity.FindAll(HttpKhoaScope.ClaimType).ToList()) identity.RemoveClaim(claim);
                        var phamVi = await InternshipManagement.DAL.Common.KhoaCuaTaiKhoan.PhamViAsync(db, account);
                        if (phamVi != null) identity.AddClaim(new System.Security.Claims.Claim(HttpKhoaScope.ClaimType, phamVi));
                    }
                }
            };
        });
        builder.Services.AddAuthorization();

        configureServices?.Invoke(builder.Services);
        var app = builder.Build();

        app.Logger.LogInformation("Startup: host construction {ElapsedMs} ms", startupTimer.ElapsedMilliseconds);
        await MeasureStartupAsync("database initialization", () => DatabaseInitializer.InitializeAsync(connectionString, app.Logger));
        await MeasureStartupAsync("legacy password check", () => LegacyPasswordMigrator.RunAsync(app.Services));
        await MeasureStartupAsync("CLO schema check", async () =>
        {
            using var scope = app.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await DatabaseSchemaMigrator.ApplyAsync(db);
            await using var catalogTransaction = await db.Database.BeginTransactionAsync();
            foreach (var statement in InternshipCatalogMigration.Statements.Concat(WorkflowExtensionsMigration.Statements))
                await db.Database.ExecuteSqlRawAsync(statement);
            await catalogTransaction.CommitAsync();
            await InternshipManagement.DAL.Common.TenLoaiThucTap.NapAsync(db);
        });
        app.Lifetime.ApplicationStarted.Register(() =>
            app.Logger.LogInformation("Startup: ready in {ElapsedMs} ms", startupTimer.ElapsedMilliseconds));

        app.UseExceptionHandler();
        // Swagger liệt kê toàn bộ API: chỉ bật khi phát triển, hoặc bật có chủ đích bằng Swagger:Enabled=true.
        if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled"))
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseCors("Frontend");

        app.UseDefaultFiles();
        app.UseStaticFiles();

        app.UseAuthentication();
        app.UseAuthorization();

        app.Use(async (context, next) =>
        {
            if (context.User.Identity?.IsAuthenticated == true)
            {
                var db = context.RequestServices.GetRequiredService<AppDbContext>();
                db.NguoiThucHien = context.User.MaTaiKhoan();
                db.RoundClock = context.RequestServices.GetRequiredService<TimeProvider>();
            }
            await next();
        });

        app.MapControllers();
        app.MapFallbackToFile("index.html").AllowAnonymous();

        return app;

        async Task MeasureStartupAsync(string step, Func<Task> action)
        {
            var timer = Stopwatch.StartNew();
            try { await action(); }
            finally { app.Logger.LogInformation("Startup: {Step} {ElapsedMs} ms", step, timer.ElapsedMilliseconds); }
        }

    }
}
