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
            e.ToTable("TAIKHOAN");
            e.HasKey(x => x.MaTaiKhoan);
            e.Property(x => x.MaTaiKhoan).HasMaxLength(20);
            e.Property(x => x.TenDangNhap).HasMaxLength(100).IsRequired();
            e.Property(x => x.MatKhau).HasMaxLength(500).IsRequired();
            e.Property(x => x.Email).HasColumnName("email").HasMaxLength(200);
            e.Property(x => x.SoDienThoai).HasColumnName("soDienThoai").HasMaxLength(30);
            e.HasIndex(x => x.TenDangNhap).IsUnique();
            e.HasOne(x => x.VaiTro).WithMany().HasForeignKey(x => x.MaVaiTro);
        });

        modelBuilder.Entity<VaiTro>(e =>
        {
            e.ToTable("VAITRO");
            e.HasKey(x => x.MaVaiTro);
        });

        modelBuilder.Entity<GiangVien>(e =>
        {
            e.ToTable("GIANGVIEN");
            e.HasKey(x => x.MaGV);
        });

        modelBuilder.Entity<CongTy>(e =>
        {
            e.ToTable("CONGTY");
            e.HasKey(x => x.MaCongTy);
            e.Property(x => x.ThoiGian).HasMaxLength(100);
            e.Property(x => x.MaSVDeXuat).HasColumnName("maSVDeXuat").HasMaxLength(20);
        });

        modelBuilder.Entity<DaiDienDoanhNghiep>(e =>
        {
            e.ToTable("DAIDIENDOANHNGHIEP");
            e.HasKey(x => x.MaSo);
            e.Property(x => x.MaSo).HasColumnName("maSo");
            e.Property(x => x.MaCongTy).HasColumnName("maCongTy");
            e.Property(x => x.HoTen).HasColumnName("hoTen");
            e.Property(x => x.ChucVu).HasColumnName("chucVu");
            e.Property(x => x.Email).HasColumnName("email");
            e.HasOne(d => d.CongTy).WithMany(c => c.DaiDienDoanhNghieps).HasForeignKey(d => d.MaCongTy);
        });

        modelBuilder.Entity<DotThucTap>(e =>
        {
            e.ToTable("DOTTHUCTAP");
            e.HasKey(x => x.MaSo);
            e.Property(x => x.NamHoc).HasColumnName("namHoc").HasMaxLength(20);
            e.Property(x => x.TrangThai).HasColumnName("trangThai").HasMaxLength(50);
            e.Property(x => x.MaRubric).HasColumnName("maRubric").HasMaxLength(40);
        });

        modelBuilder.Entity<HoSoNangLuc>(e =>
        {
            e.ToTable("HOSONANGLUC");
            e.HasKey(x => x.MaHoSo);
            e.Property(x => x.MaSV).HasColumnName("maSV");
            e.Property(x => x.MaHoSo).HasColumnName("maHoSo");
            e.Property(x => x.NDHoSo).HasColumnName("NDHoSo");
            e.Property(x => x.NgayCapNhat).HasColumnName("ngayCapNhat");
            e.Property(x => x.FileCV).HasColumnName("FileCV").HasMaxLength(500);
            e.HasOne(h => h.SinhVien)
                .WithOne(s => s.HoSoNangLuc)
                .HasForeignKey<HoSoNangLuc>(h => h.MaSV);
        });

        modelBuilder.Entity<PhongVan>(e =>
        {
            e.ToTable("PHONGVAN");
            e.HasKey(x => x.MaPV);
            e.Property(x => x.MaPV).HasColumnName("maPV");
            e.Property(x => x.MaSinhVien).HasColumnName("maSV");
            e.Property(x => x.MaDaiDien).HasColumnName("maDaiDien");
            e.Property(x => x.HinhThuc).HasColumnName("hinhThuc");
            e.Property(x => x.NgayPV).HasColumnName("ngayPV");
            e.Property(x => x.KetQua).HasColumnName("ketQua");
            e.HasOne(p => p.SinhVien).WithMany(s => s.PhongVans).HasForeignKey(p => p.MaSinhVien);
            e.HasOne(p => p.DaiDienDoanhNghiep).WithMany(d => d.PhongVans).HasForeignKey(p => p.MaDaiDien);
        });

        modelBuilder.Entity<HuongDanDoanhNghiep>(e =>
        {
            e.ToTable("HUONGDANDOANHNGHIEP");
            e.HasKey(x => x.MaSo);
            e.Property(x => x.MaSo).HasColumnName("maSo");
            e.Property(x => x.MaPhanBo).HasColumnName("maPB");
            e.Property(x => x.MaDaiDien).HasColumnName("maDaiDien");
            e.Property(x => x.NgayBD).HasColumnName("ngayBD");
            e.Property(x => x.VaiTro).HasColumnName("vaiTro");
            e.Property(x => x.DanhGia).HasColumnName("danhGia");
            e.HasOne(h => h.DaiDienDoanhNghiep).WithMany(d => d.HuongDanDoanhNghieps).HasForeignKey(h => h.MaDaiDien);
            e.HasOne(h => h.PhanBoThucTap).WithMany(p => p.HuongDanDoanhNghieps).HasForeignKey(h => h.MaPhanBo);
        });

        modelBuilder.Entity<GioiThieu>(e =>
        {
            e.ToTable("GIOITHIEU");
            e.HasKey(x => x.MaSo);
            e.HasOne(g => g.GiangVien).WithMany(gv => gv.GioiThieus).HasForeignKey(g => g.MaGV);
            e.HasOne(g => g.CongTy).WithMany(c => c.GioiThieus).HasForeignKey(g => g.MaCongTy);
        });

        modelBuilder.Entity<ThongBao>(e =>
        {
            e.ToTable("THONGBAO");
            e.HasKey(x => x.MaThongBao);
            e.Property(x => x.MaThongBao).HasColumnName("maThongBao");
            e.Property(x => x.TieuDe).HasColumnName("tieuDe");
            e.Property(x => x.NoiDung).HasColumnName("noiDung");
            e.Property(x => x.NgayTao).HasColumnName("ngayTao");
            e.Property(x => x.MaNguoiGui).HasColumnName("maNguoiGui");
            e.Property(x => x.DoiTuong).HasColumnName("doiTuong");
            e.Property(x => x.LoaiThongBao).HasColumnName("loaiThongBao");
            e.Property(x => x.TepDinhKem).HasColumnName("tepDinhKem");
            e.Property(x => x.Ghim).HasColumnName("ghim");
        });

        modelBuilder.Entity<GoiYCongTy>(e =>
        {
            e.ToTable("GOIYCONGTY");
            e.HasKey(x => x.MaSo);
            e.Property(x => x.MaSo).HasColumnName("maSo");
            e.Property(x => x.MaHoSo).HasColumnName("maHoSo");
            e.Property(x => x.MaCongTy).HasColumnName("maCongTy");
            e.Property(x => x.TyLeTuongThich).HasColumnName("tyLeTuongThich").HasColumnType("decimal(5,2)");
            e.Property(x => x.NgayGoiY).HasColumnName("ngayGoiY");
            e.HasOne(x => x.HoSoNangLuc).WithMany().HasForeignKey(x => x.MaHoSo);
            e.HasOne(x => x.CongTy).WithMany(x => x.GoiYCongTys).HasForeignKey(x => x.MaCongTy);
        });
    }
}

