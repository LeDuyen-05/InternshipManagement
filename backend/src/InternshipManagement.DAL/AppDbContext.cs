using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<TaiKhoan> TaiKhoans => Set<TaiKhoan>();
    public DbSet<VaiTro> VaiTros => Set<VaiTro>();
    public DbSet<SinhVien> SinhViens => Set<SinhVien>();
    public DbSet<GiangVien> GiangViens => Set<GiangVien>();
    public DbSet<CongTy> CongTys => Set<CongTy>();
    public DbSet<DaiDienDoanhNghiep> DaiDienDoanhNghieps => Set<DaiDienDoanhNghiep>();
    public DbSet<HoSoNangLuc> HoSoNangLucs => Set<HoSoNangLuc>();
    public DbSet<DotThucTap> DotThucTaps => Set<DotThucTap>();
    public DbSet<GoiYCongTy> GoiYCongTys => Set<GoiYCongTy>();
    public DbSet<TieuChi> TieuChis => Set<TieuChi>();
    public DbSet<DangKyThucTap> DangKyThucTaps => Set<DangKyThucTap>();
    public DbSet<PhanBoThucTap> PhanBoThucTaps => Set<PhanBoThucTap>();
    public DbSet<PhongVan> PhongVans => Set<PhongVan>();
    public DbSet<GVHuongDan> GVHuongDans => Set<GVHuongDan>();
    public DbSet<HuongDanDoanhNghiep> HuongDanDoanhNghieps => Set<HuongDanDoanhNghiep>();
    public DbSet<TienDoThucTap> TienDoThucTaps => Set<TienDoThucTap>();
    public DbSet<PhieuChamDiem> PhieuChamDiems => Set<PhieuChamDiem>();
    public DbSet<ChiTietChamDiem> ChiTietChamDiems => Set<ChiTietChamDiem>();
    public DbSet<GioiThieu> GioiThieus => Set<GioiThieu>();
    public DbSet<ThongBao> ThongBaos => Set<ThongBao>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        modelBuilder.Entity<TaiKhoan>(e =>
        {
            e.ToTable("TAIKHOAN"); e.HasKey(x => x.MaTaiKhoan);
            e.Property(x => x.MaTaiKhoan).HasMaxLength(20);
            e.Property(x => x.TenDangNhap).HasMaxLength(100).IsRequired();
            e.Property(x => x.MatKhau).HasMaxLength(500).IsRequired();
            e.HasIndex(x => x.TenDangNhap).IsUnique();
            e.HasOne(x => x.VaiTro).WithMany().HasForeignKey(x => x.MaVaiTro);
        });
        modelBuilder.Entity<VaiTro>(e => { e.ToTable("VAITRO"); e.HasKey(x => x.MaVaiTro); });
        modelBuilder.Entity<SinhVien>(e => { e.ToTable("SINHVIEN"); e.HasKey(x => x.MaSV); e.Property(x => x.Gpa).HasColumnType("decimal(3,2)"); });
        modelBuilder.Entity<CongTy>(e => { e.ToTable("CONGTY"); e.HasKey(x => x.MaCongTy); e.Property(x => x.ThoiGian).HasMaxLength(100); });
        modelBuilder.Entity<DotThucTap>(e => { e.ToTable("DOTTHUCTAP"); e.HasKey(x => x.MaSo); e.Property(x => x.NamHoc).HasMaxLength(20); e.Property(x => x.TrangThai).HasMaxLength(50); });
        modelBuilder.Entity<GiangVien>(e => { e.ToTable("GIANGVIEN"); e.HasKey(x => x.MaGV); });
        modelBuilder.Entity<DaiDienDoanhNghiep>(e => { e.ToTable("DAIDIENDOANHNGHIEP"); e.HasKey(x => x.MaSo); });
        modelBuilder.Entity<HoSoNangLuc>(e => { e.ToTable("HOSONANGLUC"); e.HasKey(x => x.MaHoSo); e.Property(x => x.MaSinhVien).HasColumnName("maSV"); });
        modelBuilder.Entity<TieuChi>(e => { e.ToTable("TIEUCHI"); e.HasKey(x => x.MaTieuChi); e.Property(x => x.MaTieuChi).HasColumnName("maTieuChi"); e.Property(x => x.TenTieuChi).HasColumnName("tenTieuChi"); e.Property(x => x.DiemToiDa).HasColumnName("diemToiDa"); });
        modelBuilder.Entity<DangKyThucTap>(e => { e.ToTable("DANGKYTHUCTAP"); e.HasKey(x => x.MaDangKy); e.Property(x => x.MaDangKy).HasColumnName("maDK"); e.Property(x => x.MaSinhVien).HasColumnName("maSV"); });
        modelBuilder.Entity<PhanBoThucTap>(e => { e.ToTable("PHANBOTHUCTAP"); e.HasKey(x => x.MaPhanBo); e.Property(x => x.MaPhanBo).HasColumnName("maPB"); e.Property(x => x.MaSinhVien).HasColumnName("maSV"); });
        modelBuilder.Entity<PhongVan>(e => { e.ToTable("PHONGVAN"); e.HasKey(x => x.MaPV); e.Property(x => x.MaSinhVien).HasColumnName("maSV"); });
        modelBuilder.Entity<GVHuongDan>(e => { e.ToTable("GVHUONGDAN"); e.HasKey(x => x.MaSo); e.Property(x => x.MaSinhVien).HasColumnName("maSV"); e.Property(x => x.MaGiangVien).HasColumnName("maGV"); });
        modelBuilder.Entity<HuongDanDoanhNghiep>(e => { e.ToTable("HUONGDANDOANHNGHIEP"); e.HasKey(x => x.MaSo); });
        modelBuilder.Entity<TienDoThucTap>(e => { e.ToTable("TIENDOTHUCTAP"); e.HasKey(x => x.MaTienDo); e.Property(x => x.MaSinhVien).HasColumnName("maSV"); e.Property(x => x.NoiDungBaoCao).HasColumnName("noiDungBaoCao"); });
        modelBuilder.Entity<PhieuChamDiem>(e => {
            e.ToTable("PHIEUCHAMDIEM"); e.HasKey(x => x.MaPhieu);
            e.Property(x => x.MaPhieu).HasColumnName("maPhieu"); e.Property(x => x.MaDot).HasColumnName("maDot");
            e.Property(x => x.TongDiem).HasColumnName("tongDiem"); e.Property(x => x.NgayCham).HasColumnName("ngayCham");
            e.Property(x => x.MaGV).HasColumnName("maGVHuongDan"); e.Property(x => x.MaDoanhNghiep).HasColumnName("maHuongDanDN"); e.Property(x => x.MaSinhVien).HasColumnName("maSV");
            e.HasOne(x => x.DotThucTap).WithMany(x => x.PhieuChamDiems).HasForeignKey(x => x.MaDot);
            e.HasOne(x => x.GVHuongDan).WithMany(x => x.PhieuChamDiems).HasForeignKey(x => x.MaGV);
            e.HasOne(x => x.HuongDanDoanhNghiep).WithMany(x => x.PhieuChamDiems).HasForeignKey(x => x.MaDoanhNghiep);
        });
        modelBuilder.Entity<ChiTietChamDiem>(e => {
            e.ToTable("CHITIETCHAMDIEM"); e.HasKey(x => x.MaSo);
            e.Property(x => x.MaSo).HasColumnName("maSo"); e.Property(x => x.MaPhieuCham).HasColumnName("maPhieu");
            e.Property(x => x.MaTieuChi).HasColumnName("maTieuChi"); e.Property(x => x.DiemCham).HasColumnName("diemCham");
            e.HasOne(x => x.PhieuChamDiem).WithMany(p => p.ChiTietChamDiems).HasForeignKey(x => x.MaPhieuCham);
            e.HasOne(x => x.TieuChi).WithMany(t => t.ChiTietChamDiems).HasForeignKey(x => x.MaTieuChi);
        });
        modelBuilder.Entity<GioiThieu>(e => { e.ToTable("GIOITHIEU"); e.HasKey(x => x.MaSo); });
        modelBuilder.Entity<ThongBao>(e => { e.ToTable("THONGBAO"); e.HasKey(x => x.MaThongBao); e.Property(x => x.MaThongBao).HasColumnName("maThongBao"); e.Property(x => x.TieuDe).HasColumnName("tieuDe"); e.Property(x => x.NoiDung).HasColumnName("noiDung"); e.Property(x => x.NgayTao).HasColumnName("ngayTao"); e.Property(x => x.MaNguoiGui).HasColumnName("maNguoiGui"); });
        modelBuilder.Entity<GoiYCongTy>(e => { e.ToTable("GOIYCONGTY"); e.HasKey(x => x.MaSo); e.Property(x => x.TiLeTuongThich).HasColumnName("tyLeTuongThich"); });

        modelBuilder.Entity<HoSoNangLuc>()
            .HasOne(x => x.SinhVien).WithOne(x => x.HoSoNangLuc).HasForeignKey<HoSoNangLuc>(x => x.MaSinhVien);
        modelBuilder.Entity<DaiDienDoanhNghiep>()
            .HasOne(x => x.CongTy).WithMany(x => x.DaiDienDoanhNghieps).HasForeignKey(x => x.MaCongTy);
        modelBuilder.Entity<GoiYCongTy>()
            .HasOne(x => x.HoSoNangLuc).WithMany().HasForeignKey(x => x.MaHoSo);
        modelBuilder.Entity<GoiYCongTy>()
            .HasOne(x => x.CongTy).WithMany(x => x.GoiYCongTys).HasForeignKey(x => x.MaCongTy);
        modelBuilder.Entity<PhongVan>()
            .HasOne(x => x.SinhVien).WithMany(x => x.PhongVans).HasForeignKey(x => x.MaSinhVien);
        modelBuilder.Entity<PhongVan>()
            .HasOne(x => x.CongTy).WithMany(x => x.PhongVans).HasForeignKey(x => x.MaCongTy);
        modelBuilder.Entity<GVHuongDan>()
            .HasOne(x => x.GiangVien).WithMany(x => x.GVHuongDans).HasForeignKey(x => x.MaGiangVien);
        modelBuilder.Entity<GVHuongDan>()
            .HasOne(x => x.SinhVien).WithMany(x => x.GVHuongDans).HasForeignKey(x => x.MaSinhVien);
    }
}
