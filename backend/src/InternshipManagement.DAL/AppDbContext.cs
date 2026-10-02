using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // 18 lớp nghiệp vụ theo đúng sơ đồ lớp mức phân tích đã xác nhận.
    public DbSet<SinhVien> SinhViens => Set<SinhVien>();
    public DbSet<GiangVien> GiangViens => Set<GiangVien>();
    public DbSet<CongTy> CongTys => Set<CongTy>();
    public DbSet<DaiDienDoanhNghiep> DaiDienDoanhNghieps => Set<DaiDienDoanhNghiep>();
    public DbSet<HoSoNangLuc> HoSoNangLucs => Set<HoSoNangLuc>();
    public DbSet<DotThucTap> DotThucTaps => Set<DotThucTap>();
    public DbSet<DangKyThucTap> DangKyThucTaps => Set<DangKyThucTap>();
    public DbSet<PhongVan> PhongVans => Set<PhongVan>();
    public DbSet<PhanBoThucTap> PhanBoThucTaps => Set<PhanBoThucTap>();
    public DbSet<GVHuongDan> GVHuongDans => Set<GVHuongDan>();
    public DbSet<HuongDanDoanhNghiep> HuongDanDoanhNghieps => Set<HuongDanDoanhNghiep>();
    public DbSet<TienDoThucTap> TienDoThucTaps => Set<TienDoThucTap>();
    public DbSet<PhieuChamDiem> PhieuChamDiems => Set<PhieuChamDiem>();
    public DbSet<ChiTietChamDiem> ChiTietChamDiems => Set<ChiTietChamDiem>();
    public DbSet<TieuChi> TieuChis => Set<TieuChi>();
    public DbSet<GoiYCongTy> GoiYCongTys => Set<GoiYCongTy>();
    public DbSet<GioiThieu> GioiThieus => Set<GioiThieu>();
    public DbSet<DeXuatCongTy> DeXuatCongTys => Set<DeXuatCongTy>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Áp dụng các file Configuration riêng cho các bảng có khóa đặc biệt / là pattern mẫu.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // --- Các entity còn lại: khai báo khóa chính trực tiếp tại đây để tránh
        // tạo quá nhiều file Configuration nhỏ lẻ (giữ đồ án gọn, dễ bảo trì) ---
        modelBuilder.Entity<GiangVien>().HasKey(x => x.MaGV);
        modelBuilder.Entity<CongTy>().HasKey(x => x.MaCongTy);
        modelBuilder.Entity<DaiDienDoanhNghiep>().HasKey(x => x.MaSo);
        modelBuilder.Entity<HoSoNangLuc>().HasKey(x => x.MaHoSo);
        modelBuilder.Entity<DotThucTap>().HasKey(x => x.MaSo);
        modelBuilder.Entity<PhongVan>().HasKey(x => x.MaPV);
        modelBuilder.Entity<GVHuongDan>().HasKey(x => x.MaSo);
        modelBuilder.Entity<HuongDanDoanhNghiep>().HasKey(x => x.MaSo);
        modelBuilder.Entity<TienDoThucTap>().HasKey(x => x.MaTienDo);
        modelBuilder.Entity<PhieuChamDiem>().HasKey(x => x.MaPhieu);
        modelBuilder.Entity<TieuChi>().HasKey(x => x.MaTieuChi);
        modelBuilder.Entity<GioiThieu>().HasKey(x => x.MaSo);
        modelBuilder.Entity<DeXuatCongTy>().HasKey(x => x.MaDeXuat);

        // GoiYCongTy: ĐỀ XUẤT khóa phức hợp (xem ghi chú trong Domain/Entities/GoiYCongTy.cs)
        modelBuilder.Entity<GoiYCongTy>().HasKey(x => new { x.MaHoSo, x.MaCongTy });

        // Quan hệ 1-1 SinhVien - HoSoNangLuc
        modelBuilder.Entity<HoSoNangLuc>()
            .HasOne(h => h.SinhVien)
            .WithOne(s => s.HoSoNangLuc)
            .HasForeignKey<HoSoNangLuc>(h => h.MaSinhVien);

        // PhongVan: 2 FK tới SinhVien và CongTy
        modelBuilder.Entity<PhongVan>()
            .HasOne(p => p.SinhVien).WithMany(s => s.PhongVans).HasForeignKey(p => p.MaSinhVien);
        modelBuilder.Entity<PhongVan>()
            .HasOne(p => p.CongTy).WithMany(c => c.PhongVans).HasForeignKey(p => p.MaCongTy);

        // GVHuongDan: lớp kết hợp GiangVien - SinhVien
        modelBuilder.Entity<GVHuongDan>()
            .HasOne(g => g.GiangVien).WithMany(gv => gv.GVHuongDans).HasForeignKey(g => g.MaGiangVien);
        modelBuilder.Entity<GVHuongDan>()
            .HasOne(g => g.SinhVien).WithMany(s => s.GVHuongDans).HasForeignKey(g => g.MaSinhVien);

        // HuongDanDoanhNghiep: lớp kết hợp DaiDienDoanhNghiep - DangKyThucTap
        modelBuilder.Entity<HuongDanDoanhNghiep>()
            .HasOne(h => h.DaiDienDoanhNghiep).WithMany(d => d.HuongDanDoanhNghieps).HasForeignKey(h => h.MaDaiDien);
        modelBuilder.Entity<HuongDanDoanhNghiep>()
            .HasOne(h => h.DangKyThucTap).WithMany(d => d.HuongDanDoanhNghieps).HasForeignKey(h => h.MaDangKy);

        // PhieuChamDiem: 3 FK
        modelBuilder.Entity<PhieuChamDiem>()
            .HasOne(p => p.GVHuongDan).WithMany(g => g.PhieuChamDiems).HasForeignKey(p => p.MaGV);
        modelBuilder.Entity<PhieuChamDiem>()
            .HasOne(p => p.HuongDanDoanhNghiep).WithMany(h => h.PhieuChamDiems).HasForeignKey(p => p.MaDoanhNghiep);
        modelBuilder.Entity<PhieuChamDiem>()
            .HasOne(p => p.DotThucTap).WithMany(d => d.PhieuChamDiems).HasForeignKey(p => p.MaDot);

        // GioiThieu: lớp kết hợp GiangVien - CongTy
        modelBuilder.Entity<GioiThieu>()
            .HasOne(g => g.GiangVien).WithMany(gv => gv.GioiThieus).HasForeignKey(g => g.MaGV);
        modelBuilder.Entity<GioiThieu>()
            .HasOne(g => g.CongTy).WithMany(c => c.GioiThieus).HasForeignKey(g => g.MaCongTy);

        // DeXuatCongTy: 3 FK
        modelBuilder.Entity<DeXuatCongTy>()
            .HasOne(d => d.CongTy).WithMany(c => c.DeXuatCongTys).HasForeignKey(d => d.MaCongTy);
        modelBuilder.Entity<DeXuatCongTy>()
            .HasOne(d => d.SinhVien).WithMany(s => s.DeXuatCongTys).HasForeignKey(d => d.MaSV);
        modelBuilder.Entity<DeXuatCongTy>()
            .HasOne(d => d.GiangVien).WithMany(g => g.DeXuatCongTys).HasForeignKey(d => d.MaGV);

        // GoiYCongTy: 2 FK
        modelBuilder.Entity<GoiYCongTy>()
            .HasOne(g => g.HoSoNangLuc).WithMany(h => h.GoiYCongTys).HasForeignKey(g => g.MaHoSo);
        modelBuilder.Entity<GoiYCongTy>()
            .HasOne(g => g.CongTy).WithMany(c => c.GoiYCongTys).HasForeignKey(g => g.MaCongTy);
    }
}
