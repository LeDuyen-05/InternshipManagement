using System.Text;
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

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Thiếu ConnectionStrings:DefaultConnection.");
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? "InternshipManagement-Development-Key-2026-Super-Secret-At-Least-32-Bytes!";
if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("Thiếu Jwt:Key (>= 32 byte). Xem README mục 'Cấu hình bí mật'.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "InternshipManagement";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "InternshipManagement.Web";
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173" };

builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(connectionString));

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
builder.Services.AddScoped<RecommendationService>();
builder.Services.AddScoped<DoanhNghiepService>();
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddScoped<ISinhVienService, SinhVienService>();
builder.Services.AddScoped<SinhVienValidator>();
builder.Services.AddScoped<CreateSinhVienValidator>();
builder.Services.AddScoped<IHoSoNangLucService, HoSoNangLucService>();
builder.Services.AddScoped<IDangKyThucTapService, DangKyThucTapService>();
builder.Services.AddScoped<ITienDoThucTapService, TienDoThucTapService>();
builder.Services.AddScoped<IPhongVanService, PhongVanService>();
builder.Services.AddScoped<IGioiThieuService, GioiThieuService>();
builder.Services.AddScoped<CreateGioiThieuValidator>();
builder.Services.AddScoped<IGVHuongDanService, GVHuongDanService>();
builder.Services.AddScoped<IPhieuChamDiemService, PhieuChamDiemService>();
builder.Services.AddScoped<IThongKeService, ThongKeService>();
builder.Services.AddScoped<IGoiYCongTyService, GoiYCongTyService>();
builder.Services.AddScoped<IResourceAccess, ResourceAccess>();
builder.Services.AddSingleton<IPasswordService, PasswordService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

builder.Services.AddCors(o => o.AddPolicy("Frontend", p =>
    p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));   // JWT ở header → KHÔNG cần AllowCredentials

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = true, ValidIssuer = jwtIssuer,
        ValidateAudience = true, ValidAudience = jwtAudience,
        ValidateLifetime = true, ClockSkew = TimeSpan.FromMinutes(1)
    };
});
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build()); // mặc định: phải đăng nhập

var app = builder.Build();

await DatabaseInitializer.InitializeAsync(connectionString, app.Logger);
await LegacyPasswordMigrator.RunAsync(app.Services);
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DatabaseSchemaMigrator.ApplyAsync(db);
}

app.UseExceptionHandler();
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
