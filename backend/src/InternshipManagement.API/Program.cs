using InternshipManagement.BLL.Services.SinhVien;
using InternshipManagement.BLL.Validators.SinhVien;
using InternshipManagement.BLL.Services.GioiThieu;
using InternshipManagement.BLL.Validators.GioiThieu;
using InternshipManagement.BLL.Services.GVHuongDan;
using InternshipManagement.BLL.Services.TienDoThucTap;
using InternshipManagement.BLL.Services.PhieuChamDiem;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Repositories;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<ISinhVienRepository, SinhVienRepository>();
builder.Services.AddScoped<IGioiThieuRepository, GioiThieuRepository>();
builder.Services.AddScoped<IGVHuongDanRepository, GVHuongDanRepository>();
builder.Services.AddScoped<ITienDoThucTapRepository, TienDoThucTapRepository>();
builder.Services.AddScoped<IPhieuChamDiemRepository, PhieuChamDiemRepository>();

builder.Services.AddScoped<ISinhVienService, SinhVienService>();
builder.Services.AddScoped<CreateSinhVienValidator>();

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

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthorization();
app.MapControllers();

app.Run();
