using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

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
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        modelBuilder.Entity<GiangVien>(e => { e.ToTable("GIANGVIEN"); e.HasKey(x => x.MaGV); });
        modelBuilder.Entity<CongTy>(e => { e.ToTable("CONGTY"); e.HasKey(x => x.MaCongTy); });
        modelBuilder.Entity<DaiDienDoanhNghiep>(e => { e.ToTable("DAIDIENDOANHNGHIEP"); e.HasKey(x => x.MaSo); });
        modelBuilder.Entity<HoSoNangLuc>(e => { e.ToTable("HOSONANGLUC"); e.HasKey(x => x.MaHoSo); });
        modelBuilder.Entity<DotThucTap>(e => { e.ToTable("DOTTHUCTAP"); e.HasKey(x => x.MaSo); });
        modelBuilder.Entity<PhongVan>(e => { e.ToTable("PHONGVAN"); e.HasKey(x => x.MaPV); });
        modelBuilder.Entity<HuongDanDoanhNghiep>(e => { e.ToTable("HUONGDANDOANHNGHIEP"); e.HasKey(x => x.MaSo); });
        modelBuilder.Entity<GioiThieu>(e => { e.ToTable("GIOITHIEU"); e.HasKey(x => x.MaSo); });
        modelBuilder.Entity<DeXuatCongTy>(e => { e.ToTable("DEXUATCONGTY"); e.HasKey(x => x.MaDeXuat); });

        modelBuilder.Entity<GoiYCongTy>(e => { e.ToTable("GOIYCONGTY"); e.HasKey(x => new { x.MaHoSo, x.MaCongTy }); });

        modelBuilder.Entity<HoSoNangLuc>()
            .HasOne(h => h.SinhVien)
            .WithOne(s => s.HoSoNangLuc)
            .HasForeignKey<HoSoNangLuc>(h => h.MaSinhVien);

        modelBuilder.Entity<PhongVan>()
            .HasOne(p => p.SinhVien).WithMany(s => s.PhongVans).HasForeignKey(p => p.MaSinhVien);
        modelBuilder.Entity<PhongVan>()
            .HasOne(p => p.CongTy).WithMany(c => c.PhongVans).HasForeignKey(p => p.MaCongTy);

        modelBuilder.Entity<HuongDanDoanhNghiep>()
            .HasOne(h => h.DaiDienDoanhNghiep).WithMany(d => d.HuongDanDoanhNghieps).HasForeignKey(h => h.MaDaiDien);
        modelBuilder.Entity<HuongDanDoanhNghiep>()
            .HasOne(h => h.DangKyThucTap).WithMany(d => d.HuongDanDoanhNghieps).HasForeignKey(h => h.MaDangKy);

        modelBuilder.Entity<GioiThieu>()
            .HasOne(g => g.GiangVien).WithMany(gv => gv.GioiThieus).HasForeignKey(g => g.MaGV);
        modelBuilder.Entity<GioiThieu>()
            .HasOne(g => g.CongTy).WithMany(c => c.GioiThieus).HasForeignKey(g => g.MaCongTy);

        modelBuilder.Entity<DeXuatCongTy>()
            .HasOne(d => d.CongTy).WithMany(c => c.DeXuatCongTys).HasForeignKey(d => d.MaCongTy);
        modelBuilder.Entity<DeXuatCongTy>()
            .HasOne(d => d.SinhVien).WithMany(s => s.DeXuatCongTys).HasForeignKey(d => d.MaSV);
        modelBuilder.Entity<DeXuatCongTy>()
            .HasOne(d => d.GiangVien).WithMany(g => g.DeXuatCongTys).HasForeignKey(d => d.MaGV);

        modelBuilder.Entity<GoiYCongTy>()
            .HasOne(g => g.HoSoNangLuc).WithMany(h => h.GoiYCongTys).HasForeignKey(g => g.MaHoSo);
        modelBuilder.Entity<GoiYCongTy>()
            .HasOne(g => g.CongTy).WithMany(c => c.GoiYCongTys).HasForeignKey(g => g.MaCongTy);
    }
}
