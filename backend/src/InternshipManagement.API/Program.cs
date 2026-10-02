using InternshipManagement.BLL.Services.SinhVien;
using InternshipManagement.BLL.Validators.SinhVien;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Repositories;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ---- Database ----
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ---- Đăng ký Repository ----
// Mỗi khi thêm module mới, đăng ký thêm 1 dòng theo đúng khuôn mẫu này.
builder.Services.AddScoped<ISinhVienRepository, SinhVienRepository>();

// ---- Đăng ký Service (Business Logic) ----
builder.Services.AddScoped<ISinhVienService, SinhVienService>();
builder.Services.AddScoped<CreateSinhVienValidator>();

// ---- API infrastructure ----
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod());
});

// TODO: đăng ký JWT Authentication khi module đăng nhập/phân quyền được triển khai.

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
