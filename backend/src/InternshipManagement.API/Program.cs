using System.Text;
using InternshipManagement.API.Infrastructure;
using InternshipManagement.BLL.Services.Admin;
using InternshipManagement.BLL.Services.Auth;
using InternshipManagement.BLL.Services.Recommendation;
using InternshipManagement.BLL.Services.SinhVien;
using InternshipManagement.BLL.Services.HoSoNangLuc;
using InternshipManagement.BLL.Services.DangKyThucTap;
using InternshipManagement.BLL.Services.TienDoThucTap;
using InternshipManagement.BLL.Services.PhongVan;
using InternshipManagement.BLL.Validators.SinhVien;
using InternshipManagement.BLL.Services.GioiThieu;
using InternshipManagement.BLL.Validators.GioiThieu;
using InternshipManagement.BLL.Services.GVHuongDan;
using InternshipManagement.BLL.Services.TienDoThucTap;
using InternshipManagement.BLL.Services.PhieuChamDiem;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Database;
using InternshipManagement.DAL.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")!;
var workingConnectionString = await DatabaseInitializer.ResolveWorkingConnectionStringAsync(connectionString);
var jwtKey = builder.Configuration["Jwt:Key"] ?? "InternshipManagement-Development-Key-2026-Change-Me";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<ISinhVienRepository, SinhVienRepository>();
builder.Services.AddScoped<IGioiThieuRepository, GioiThieuRepository>();
builder.Services.AddScoped<IGVHuongDanRepository, GVHuongDanRepository>();
builder.Services.AddScoped<ITienDoThucTapRepository, TienDoThucTapRepository>();
builder.Services.AddScoped<IPhieuChamDiemRepository, PhieuChamDiemRepository>();
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlServer(workingConnectionString));
builder.Services.AddScoped<ISinhVienRepository, SinhVienRepository>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<AdminService>();
builder.Services.AddScoped<RecommendationService>();
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddScoped<IHoSoNangLucRepository, HoSoNangLucRepository>();
builder.Services.AddScoped<ICongTyRepository, CongTyRepository>();
builder.Services.AddScoped<IDangKyThucTapRepository, DangKyThucTapRepository>();
builder.Services.AddScoped<ITienDoThucTapRepository, TienDoThucTapRepository>();
builder.Services.AddScoped<IPhongVanRepository, PhongVanRepository>();
builder.Services.AddScoped<IPhanBoThucTapRepository, PhanBoThucTapRepository>();

builder.Services.AddScoped<ISinhVienService, SinhVienService>();
builder.Services.AddScoped<CreateSinhVienValidator>();
builder.Services.AddScoped<IHoSoNangLucService, HoSoNangLucService>();
builder.Services.AddScoped<IDangKyThucTapService, DangKyThucTapService>();
builder.Services.AddScoped<ITienDoThucTapService, TienDoThucTapService>();
builder.Services.AddScoped<IPhongVanService, PhongVanService>();

builder.Services.AddScoped<IGioiThieuService, GioiThieuService>();
builder.Services.AddScoped<CreateGioiThieuValidator>();

builder.Services.AddScoped<IGVHuongDanService, GVHuongDanService>();
builder.Services.AddScoped<ITienDoThucTapService, TienDoThucTapService>();
builder.Services.AddScoped<IPhieuChamDiemService, PhieuChamDiemService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod());
});
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true, IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = false, ValidateAudience = false, ValidateLifetime = true, ClockSkew = TimeSpan.FromMinutes(1)
    };
});
builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.SetIsOriginAllowed(_ => true).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();
await DatabaseInitializer.InitializeAsync(workingConnectionString, EmbeddedDatabaseScript.Sql);

if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
