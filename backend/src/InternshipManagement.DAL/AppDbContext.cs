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
        modelBuilder.Entity<CongTy>(e => { e.ToTable("CONGTY"); e.HasKey(x => x.MaCongTy); e.Property(x => x.ThoiGian).HasMaxLength(100); });
        modelBuilder.Entity<DotThucTap>(e => { e.ToTable("DOTTHUCTAP"); e.HasKey(x => x.MaSo); e.Property(x => x.NamHoc).HasMaxLength(20); e.Property(x => x.TrangThai).HasMaxLength(50); });
        modelBuilder.Entity<GiangVien>(e => { e.ToTable("GIANGVIEN"); e.HasKey(x => x.MaGV); });
        modelBuilder.Entity<DaiDienDoanhNghiep>(e => { e.ToTable("DAIDIENDOANHNGHIEP"); e.HasKey(x => x.MaSo); });
        modelBuilder.Entity<DaiDienDoanhNghiep>().Property(x => x.MaSo).HasColumnName("maSo");
        modelBuilder.Entity<DaiDienDoanhNghiep>().Property(x => x.MaCongTy).HasColumnName("maCongTy");
        modelBuilder.Entity<DaiDienDoanhNghiep>().Property(x => x.HoTen).HasColumnName("hoTen");
        modelBuilder.Entity<DaiDienDoanhNghiep>().Property(x => x.ChucVu).HasColumnName("chucVu");
        modelBuilder.Entity<DaiDienDoanhNghiep>().Property(x => x.Email).HasColumnName("email");
        modelBuilder.Entity<DaiDienDoanhNghiep>()
            .HasOne(d => d.CongTy).WithMany(c => c.DaiDienDoanhNghieps).HasForeignKey(d => d.MaCongTy);

        modelBuilder.Entity<HoSoNangLuc>().ToTable("HOSONANGLUC").HasKey(x => x.MaHoSo);
        modelBuilder.Entity<HoSoNangLuc>()
            .HasOne(h => h.SinhVien)
            .WithOne(s => s.HoSoNangLuc)
            .HasForeignKey<HoSoNangLuc>(h => h.MaSV);

        modelBuilder.Entity<TieuChi>(e => { e.ToTable("TIEUCHI"); e.HasKey(x => x.MaTieuChi); e.Property(x => x.MaTieuChi).HasColumnName("maTieuChi"); e.Property(x => x.TenTieuChi).HasColumnName("tenTieuChi"); e.Property(x => x.DiemToiDa).HasColumnName("diemToiDa"); });

        modelBuilder.Entity<PhongVan>().ToTable("PHONGVAN").HasKey(x => x.MaPV);
        modelBuilder.Entity<PhongVan>().Property(x => x.MaPV).HasColumnName("maPV");
        modelBuilder.Entity<PhongVan>().Property(x => x.MaSinhVien).HasColumnName("maSV");
        modelBuilder.Entity<PhongVan>().Property(x => x.MaDaiDien).HasColumnName("maDaiDien");
        modelBuilder.Entity<PhongVan>().Property(x => x.HinhThuc).HasColumnName("hinhThuc");
        modelBuilder.Entity<PhongVan>().Property(x => x.NgayPV).HasColumnName("ngayPV");
        modelBuilder.Entity<PhongVan>().Property(x => x.KetQua).HasColumnName("ketQua");
        modelBuilder.Entity<PhongVan>()
            .HasOne(p => p.SinhVien).WithMany(s => s.PhongVans).HasForeignKey(p => p.MaSinhVien);
        modelBuilder.Entity<PhongVan>()
            .HasOne(p => p.DaiDienDoanhNghiep).WithMany(d => d.PhongVans).HasForeignKey(p => p.MaDaiDien);

        modelBuilder.Entity<GVHuongDan>().ToTable("GVHUONGDAN").HasKey(x => x.MaSo);
        modelBuilder.Entity<GVHuongDan>().Property(x => x.MaSo).HasColumnName("maSo");
        modelBuilder.Entity<GVHuongDan>().Property(x => x.MaGiangVien).HasColumnName("maGV");
        modelBuilder.Entity<GVHuongDan>().Property(x => x.MaSinhVien).HasColumnName("maSV");
        modelBuilder.Entity<GVHuongDan>().Property(x => x.NgayPC).HasColumnName("ngayPC");
        modelBuilder.Entity<GVHuongDan>().Property(x => x.TrangThai).HasColumnName("trangThai");
        modelBuilder.Entity<GVHuongDan>()
            .HasOne(g => g.GiangVien).WithMany(gv => gv.GVHuongDans).HasForeignKey(g => g.MaGiangVien);
        modelBuilder.Entity<GVHuongDan>()
            .HasOne(g => g.SinhVien).WithMany(s => s.GVHuongDans).HasForeignKey(g => g.MaSinhVien);

        modelBuilder.Entity<HuongDanDoanhNghiep>().ToTable("HUONGDANDOANHNGHIEP").HasKey(x => x.MaSo);
        modelBuilder.Entity<HuongDanDoanhNghiep>().Property(x => x.MaSo).HasColumnName("maSo");
        modelBuilder.Entity<HuongDanDoanhNghiep>().Property(x => x.MaPhanBo).HasColumnName("maPB");
        modelBuilder.Entity<HuongDanDoanhNghiep>().Property(x => x.MaDaiDien).HasColumnName("maDaiDien");
        modelBuilder.Entity<HuongDanDoanhNghiep>().Property(x => x.NgayBD).HasColumnName("ngayBD");
        modelBuilder.Entity<HuongDanDoanhNghiep>().Property(x => x.VaiTro).HasColumnName("vaiTro");
        modelBuilder.Entity<HuongDanDoanhNghiep>().Property(x => x.DanhGia).HasColumnName("danhGia");
        modelBuilder.Entity<HuongDanDoanhNghiep>()
            .HasOne(h => h.DaiDienDoanhNghiep).WithMany(d => d.HuongDanDoanhNghieps).HasForeignKey(h => h.MaDaiDien);
        modelBuilder.Entity<HuongDanDoanhNghiep>()
            .HasOne(h => h.PhanBoThucTap).WithMany(p => p.HuongDanDoanhNghieps).HasForeignKey(h => h.MaPhanBo);

        modelBuilder.Entity<PhieuChamDiem>(e => {
            e.ToTable("PHIEUCHAMDIEM"); e.HasKey(x => x.MaPhieu);
            e.Property(x => x.MaPhieu).HasColumnName("maPhieu"); e.Property(x => x.MaDot).HasColumnName("maDot");
            e.Property(x => x.TongDiem).HasColumnName("tongDiem"); e.Property(x => x.NgayCham).HasColumnName("ngayCham");
            e.Property(x => x.MaGV).HasColumnName("maGVHuongDan"); e.Property(x => x.MaDoanhNghiep).HasColumnName("maHuongDanDN"); e.Property(x => x.MaSinhVien).HasColumnName("maSV");
            e.HasOne(x => x.DotThucTap).WithMany(x => x.PhieuChamDiems).HasForeignKey(x => x.MaDot);
            e.HasOne(x => x.GVHuongDan).WithMany(x => x.PhieuChamDiems).HasForeignKey(x => x.MaGV);
            e.HasOne(x => x.HuongDanDoanhNghiep).WithMany(x => x.PhieuChamDiems).HasForeignKey(x => x.MaDoanhNghiep);
        });

        modelBuilder.Entity<GioiThieu>().ToTable("GIOITHIEU").HasKey(x => x.MaSo);
        modelBuilder.Entity<GioiThieu>()
            .HasOne(g => g.GiangVien).WithMany(gv => gv.GioiThieus).HasForeignKey(g => g.MaGV);
        modelBuilder.Entity<GioiThieu>()
            .HasOne(g => g.CongTy).WithMany(c => c.GioiThieus).HasForeignKey(g => g.MaCongTy);

        modelBuilder.Entity<ThongBao>(e => { e.ToTable("THONGBAO"); e.HasKey(x => x.MaThongBao); e.Property(x => x.MaThongBao).HasColumnName("maThongBao"); e.Property(x => x.TieuDe).HasColumnName("tieuDe"); e.Property(x => x.NoiDung).HasColumnName("noiDung"); e.Property(x => x.NgayTao).HasColumnName("ngayTao"); e.Property(x => x.MaNguoiGui).HasColumnName("maNguoiGui"); });

        modelBuilder.Entity<GoiYCongTy>(e => { e.ToTable("GOIYCONGTY"); e.HasKey(x => x.MaSo); e.Property(x => x.TiLeTuongThich).HasColumnName("tyLeTuongThich"); });
        modelBuilder.Entity<GoiYCongTy>()
            .HasOne(x => x.HoSoNangLuc).WithMany().HasForeignKey(x => x.MaHoSo);
        modelBuilder.Entity<GoiYCongTy>()
            .HasOne(x => x.CongTy).WithMany(x => x.GoiYCongTys).HasForeignKey(x => x.MaCongTy);

        modelBuilder.Entity<DeXuatCongTy>().ToTable("DEXUATCONGTY").HasKey(x => x.MaDeXuat);
        modelBuilder.Entity<DeXuatCongTy>()
            .HasOne(d => d.CongTy).WithMany().HasForeignKey(d => d.MaCongTy);
        modelBuilder.Entity<DeXuatCongTy>()
            .HasOne(d => d.SinhVien).WithMany(s => s.DeXuatCongTys).HasForeignKey(d => d.MaSV);
        modelBuilder.Entity<DeXuatCongTy>()
            .HasOne(d => d.GiangVien).WithMany().HasForeignKey(d => d.MaGV);
    }
}
