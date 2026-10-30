using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL;

public partial class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<TaiKhoan> TaiKhoans => Set<TaiKhoan>();
    public DbSet<VaiTro> VaiTros => Set<VaiTro>();
    public DbSet<SinhVien> SinhViens => Set<SinhVien>();
    public DbSet<SinhVienThamGiaDot> SinhVienThamGiaDots => Set<SinhVienThamGiaDot>();
    public DbSet<LanHoTroThucTap> LanHoTroThucTaps => Set<LanHoTroThucTap>();
    public DbSet<CongBoDanhSachThucTap> CongBoDanhSachThucTaps => Set<CongBoDanhSachThucTap>();
    public DbSet<PhanHoiDanhSachThucTap> PhanHoiDanhSachThucTaps => Set<PhanHoiDanhSachThucTap>();
    public DbSet<XuLyPhanHoiDanhSach> XuLyPhanHoiDanhSachs => Set<XuLyPhanHoiDanhSach>();
    public DbSet<DanhSachThucTapChinhThuc> DanhSachThucTapChinhThucs => Set<DanhSachThucTapChinhThuc>();
    public DbSet<GiangVien> GiangViens => Set<GiangVien>();
    public DbSet<CongTy> CongTys => Set<CongTy>();
    public DbSet<DeXuatThucTapTuTim> DeXuatThucTapTuTims => Set<DeXuatThucTapTuTim>();
    public DbSet<DaiDienDoanhNghiep> DaiDienDoanhNghieps => Set<DaiDienDoanhNghiep>();
    public DbSet<HoSoNangLuc> HoSoNangLucs => Set<HoSoNangLuc>();
    public DbSet<DotThucTap> DotThucTaps => Set<DotThucTap>();
    public DbSet<ChotDotThucTap> ChotDotThucTaps => Set<ChotDotThucTap>();
    public DbSet<KhongHoanTatDot> KhongHoanTatDots => Set<KhongHoanTatDot>();
    public DbSet<NhatKyChotDot> NhatKyChotDots => Set<NhatKyChotDot>();
    public DbSet<ViTriTheoDot> ViTriTheoDots => Set<ViTriTheoDot>();
    public DbSet<CongTyTheoDot> CongTyTheoDots => Set<CongTyTheoDot>();
    public DbSet<NhatKyThoiHan> NhatKyThoiHans => Set<NhatKyThoiHan>();
    public DbSet<StoredDocument> StoredDocuments => Set<StoredDocument>();
    public DbSet<GoiYCongTy> GoiYCongTys => Set<GoiYCongTy>();
    public DbSet<TieuChi> TieuChis => Set<TieuChi>();
    public DbSet<DangKyThucTap> DangKyThucTaps => Set<DangKyThucTap>();
    public DbSet<PhanBoThucTap> PhanBoThucTaps => Set<PhanBoThucTap>();
    public DbSet<NhatKyDieuChinhThucTap> NhatKyDieuChinhThucTaps => Set<NhatKyDieuChinhThucTap>();
    public DbSet<PhongVan> PhongVans => Set<PhongVan>();
    public DbSet<NhatKyPhongVan> NhatKyPhongVans => Set<NhatKyPhongVan>();
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
        modelBuilder.Entity<XuLyPhanHoiDanhSach>(e =>
        {
            e.ToTable("XULYPHANHOIDANHSACH"); e.HasKey(x => x.MaXuLy);
            e.Property(x => x.MaXuLy).HasMaxLength(32); e.Property(x => x.MaPhanHoi).HasMaxLength(32);
            e.Property(x => x.MaDot).HasMaxLength(20); e.Property(x => x.LyDo).HasMaxLength(2000); e.Property(x => x.NguoiXuLy).HasMaxLength(20);
            e.HasIndex(x => x.MaPhanHoi).IsUnique();
            e.HasOne<PhanHoiDanhSachThucTap>().WithMany().HasForeignKey(x => x.MaPhanHoi).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<DotThucTap>().WithMany().HasForeignKey(x => x.MaDot).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<DanhSachThucTapChinhThuc>(e =>
        {
            e.ToTable("DANHSACHTHUCTAPCHINHTHUC"); e.HasKey(x => x.MaDot);
            e.Property(x => x.MaDot).HasMaxLength(20); e.Property(x => x.MaCongBo).HasMaxLength(32);
            e.Property(x => x.LyDo).HasMaxLength(2000); e.Property(x => x.NguoiChot).HasMaxLength(20);
            e.HasOne<DotThucTap>().WithOne().HasForeignKey<DanhSachThucTapChinhThuc>(x => x.MaDot).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<CongBoDanhSachThucTap>().WithMany().HasForeignKey(x => x.MaCongBo).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<PhanBoThucTap>().Property(x => x.TenCongTyXacNhan).HasMaxLength(500).IsConcurrencyToken();
        modelBuilder.Entity<PhanBoThucTap>().Property(x => x.DiaChiCongTyXacNhan).HasMaxLength(1000).IsConcurrencyToken();
        modelBuilder.Entity<PhanBoThucTap>().Property(x => x.MaSoThueCongTyXacNhan).HasMaxLength(30).IsConcurrencyToken();
        modelBuilder.Entity<CongBoDanhSachThucTap>(e =>
        {
            e.ToTable("CONGBODANHSACHTHUCTAP"); e.HasKey(x => x.MaCongBo);
            e.Property(x => x.MaCongBo).HasMaxLength(32); e.Property(x => x.MaDot).HasMaxLength(20);
            e.Property(x => x.TieuDe).HasMaxLength(200); e.Property(x => x.NoiDung).HasMaxLength(2000);
            e.Property(x => x.NguoiCongBo).HasMaxLength(20);
            e.HasIndex(x => new { x.MaDot, x.PhienBan }).IsUnique();
            e.HasOne<DotThucTap>().WithMany().HasForeignKey(x => x.MaDot).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<PhanHoiDanhSachThucTap>(e =>
        {
            e.ToTable("PHANHOIDANHSACHTHUCTAP"); e.HasKey(x => x.MaPhanHoi);
            e.Property(x => x.MaPhanHoi).HasMaxLength(32); e.Property(x => x.MaCongBo).HasMaxLength(32);
            e.Property(x => x.MaDot).HasMaxLength(20); e.Property(x => x.MaSV).HasMaxLength(20);
            e.Property(x => x.NoiDung).HasMaxLength(2000); e.Property(x => x.NguoiGui).HasMaxLength(20);
            e.HasIndex(x => new { x.MaCongBo, x.MaSV, x.LanPhanHoi }).IsUnique();
            e.HasOne<CongBoDanhSachThucTap>().WithMany().HasForeignKey(x => x.MaCongBo).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<SinhVien>().WithMany().HasForeignKey(x => x.MaSV).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<LanHoTroThucTap>(e =>
        {
            e.ToTable("LANHOTROTHUCTAP"); e.HasKey(x => x.MaLan);
            e.Property(x => x.MaLan).HasMaxLength(32); e.Property(x => x.MaDot).HasMaxLength(20);
            e.Property(x => x.TenLan).HasMaxLength(200); e.Property(x => x.TrangThai).HasMaxLength(20);
            e.Property(x => x.MaLanTruoc).HasMaxLength(32); e.Property(x => x.PhienBan).IsConcurrencyToken();
            e.HasOne<DotThucTap>().WithMany().HasForeignKey(x => x.MaDot).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.MaDot, x.NgayHoTro });
        });
        modelBuilder.Entity<DotThucTap>().Property(x => x.TrangThaiDanhSachNoi).HasMaxLength(20).IsConcurrencyToken();
        modelBuilder.Entity<ChotDotThucTap>(e =>
        {
            e.ToTable("CHOTDOTTHUCTAP"); e.HasKey(x => x.MaDot);
            e.Property(x => x.MaDot).HasMaxLength(20); e.Property(x => x.TrangThai).HasMaxLength(20);
            e.Property(x => x.PhienBan).IsConcurrencyToken(); e.Property(x => x.NguoiCapNhat).HasMaxLength(20);
            e.Property(x => x.LyDo).HasMaxLength(1000);
            e.HasOne<DotThucTap>().WithOne().HasForeignKey<ChotDotThucTap>(x => x.MaDot).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<KhongHoanTatDot>(e =>
        {
            e.ToTable("KHONGHOANTATDOT"); e.HasKey(x => new { x.MaDot, x.MaSV });
            e.Property(x => x.MaDot).HasMaxLength(20); e.Property(x => x.MaSV).HasMaxLength(20);
            e.Property(x => x.LyDo).HasMaxLength(1000); e.Property(x => x.CanCu).HasMaxLength(1000);
            e.Property(x => x.NguoiXacNhan).HasMaxLength(20);
            e.HasOne<DotThucTap>().WithMany().HasForeignKey(x => x.MaDot).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<SinhVien>().WithMany().HasForeignKey(x => x.MaSV).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<NhatKyChotDot>(e =>
        {
            e.ToTable("NHATKYCHOTDOT"); e.HasKey(x => x.MaNhatKy);
            e.Property(x => x.MaNhatKy).HasMaxLength(32); e.Property(x => x.MaDot).HasMaxLength(20);
            e.Property(x => x.Loai).HasMaxLength(30); e.Property(x => x.NguoiThucHien).HasMaxLength(20);
            e.Property(x => x.LyDo).HasMaxLength(1000);
            e.HasOne<DotThucTap>().WithMany().HasForeignKey(x => x.MaDot).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<TienDoThucTap>().Property(x => x.MaPhanBoLuuTru).HasMaxLength(20).IsConcurrencyToken();
        modelBuilder.Entity<TienDoThucTap>().Property(x => x.HanNopBoSung).IsConcurrencyToken();
        modelBuilder.Entity<TienDoThucTap>().HasOne<PhanBoThucTap>().WithMany()
            .HasForeignKey(x => x.MaPhanBoLuuTru).OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TaiKhoan>(e =>
        {
            e.ToTable("TAIKHOAN");
            e.HasKey(x => x.MaTaiKhoan);
            e.Property(x => x.MaTaiKhoan).HasMaxLength(20);
            e.Property(x => x.TenDangNhap).HasMaxLength(100).IsRequired();
            e.Property(x => x.MatKhau).HasMaxLength(500).IsRequired();
            e.Property(x => x.SecurityStamp).HasColumnName("securityStamp").HasMaxLength(32).IsRequired();
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
            e.Property(x => x.ChiTiepNhanTuTim).HasColumnName("chiTiepNhanTuTim");
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
            e.Property(x => x.HanDieuChinhNoiThucTap).IsConcurrencyToken();
            e.Property(x => x.PhienBanThoiHan).IsConcurrencyToken();
            e.Property(x => x.PhienBanXacNhan).IsConcurrencyToken();
        });

        modelBuilder.Entity<StoredDocument>(e => {
            e.ToTable("STORED_DOCUMENT"); e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(32); e.Property(x => x.Kind).HasMaxLength(30);
            e.Property(x => x.ResourceId).HasMaxLength(40); e.Property(x => x.RoundId).HasMaxLength(20);
            e.Property(x => x.ActorId).HasMaxLength(20); e.Property(x => x.RequestId).HasMaxLength(32);
            e.Property(x => x.ObjectKey).HasMaxLength(120); e.Property(x => x.FileName).HasMaxLength(200);
            e.Property(x => x.ContentType).HasMaxLength(100); e.Property(x => x.Sha256).HasMaxLength(64);
            e.Property(x => x.State).HasMaxLength(20).IsConcurrencyToken();
            e.Property(x => x.StorageId).HasMaxLength(64); e.Property(x => x.CleanedBy).HasMaxLength(20);
            e.HasIndex(x => new { x.ActorId, x.RequestId }).IsUnique(); e.HasIndex(x => x.ObjectKey).IsUnique();
        });

        modelBuilder.Entity<ViTriTheoDot>(e =>
        {
            e.ToTable("VITRITHEODOT"); e.HasKey(x => x.MaViTri);
            e.Property(x => x.MaViTri).HasMaxLength(40); e.Property(x => x.MaCongTy).HasMaxLength(20); e.Property(x => x.MaDot).HasMaxLength(20);
            e.Property(x => x.TenViTri).HasMaxLength(500);
            e.HasAlternateKey(x => new { x.MaViTri, x.MaCongTy, x.MaDot });
            e.HasOne(x => x.KeHoach).WithMany(x => x.ViTris).HasForeignKey(x => new { x.MaCongTy, x.MaDot }).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<DangKyThucTap>().Property(x => x.MaViTri).HasMaxLength(40);
        modelBuilder.Entity<PhanBoThucTap>().Property(x => x.MaViTri).HasMaxLength(40);
        modelBuilder.Entity<DangKyThucTap>().HasOne<ViTriTheoDot>().WithMany().HasForeignKey(x => new { x.MaViTri, x.MaCongTy, x.MaDot })
            .HasPrincipalKey(x => new { x.MaViTri, x.MaCongTy, x.MaDot }).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PhanBoThucTap>().HasOne(x => x.ViTri).WithMany().HasForeignKey(x => new { x.MaViTri, x.MaCongTy, x.MaDot })
            .HasPrincipalKey(x => new { x.MaViTri, x.MaCongTy, x.MaDot }).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CongTyTheoDot>(e =>
        {
            e.ToTable("CONGTYTHEODOT"); e.HasKey(x => new { x.MaCongTy, x.MaDot });
            e.Property(x => x.MaCongTy).HasMaxLength(20); e.Property(x => x.MaDot).HasMaxLength(20);
            e.Property(x => x.ViTriTuyen).HasMaxLength(500); e.Property(x => x.PhienBan).IsConcurrencyToken();
            e.Property(x => x.MaGVGioiThieu).HasMaxLength(20);
            e.HasOne(x => x.GiangVienGioiThieu).WithMany().HasForeignKey(x => x.MaGVGioiThieu).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.CongTy).WithMany().HasForeignKey(x => x.MaCongTy).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.DotThucTap).WithMany().HasForeignKey(x => x.MaDot).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<NhatKyThoiHan>(e =>
        {
            e.ToTable("NHATKYTHOIHAN");
            e.HasKey(x => x.MaNhatKy);
            e.Property(x => x.MaNhatKy).HasMaxLength(20);
            e.Property(x => x.MaDot).HasMaxLength(20);
            e.Property(x => x.Loai).HasMaxLength(30);
            e.Property(x => x.NguoiThucHien).HasMaxLength(20);
            e.Property(x => x.LyDo).HasMaxLength(1000);
            e.HasOne<DotThucTap>().WithMany().HasForeignKey(x => x.MaDot).OnDelete(DeleteBehavior.Restrict);
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
            e.Property(x => x.PhienBan).IsConcurrencyToken(); e.Property(x => x.MaPVTruoc).HasMaxLength(20);
            e.HasOne<PhongVan>().WithMany(x => x.CacBuoiThayThe).HasForeignKey(x => x.MaPVTruoc).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.MaPVTruoc).IsUnique().HasDatabaseName("UQ_PV_THAYTHE").HasFilter("[MaPVTruoc] IS NOT NULL");
            e.HasKey(x => x.MaPV);
            e.Property(x => x.MaPV).HasColumnName("maPV");
            e.Property(x => x.MaSinhVien).HasColumnName("maSV");
            e.Property(x => x.MaDaiDien).HasColumnName("maDaiDien");
            e.Property(x => x.HinhThuc).HasColumnName("hinhThuc");
            e.Property(x => x.NgayPV).HasColumnName("ngayPV").IsConcurrencyToken();
            e.Property(x => x.KetQua).HasColumnName("ketQua").IsConcurrencyToken();
            e.HasOne(p => p.SinhVien).WithMany(s => s.PhongVans).HasForeignKey(p => p.MaSinhVien);
            e.Property(p => p.MaDK).HasMaxLength(20).IsConcurrencyToken();
            e.HasIndex(p => p.MaDK).IsUnique().HasDatabaseName("UQ_PV_DANGKY_CHO").HasFilter("[MaDK] IS NOT NULL AND [ketQua] = N'ChuaCoKetQua'");
            e.Property(p => p.LyDoKetQua).HasMaxLength(1000);
            e.Property(p => p.NguonKetQua).HasMaxLength(20);
            e.Property(p => p.NguoiGhiKetQua).HasMaxLength(20);
            e.HasOne(p => p.DangKyThucTap).WithMany().HasForeignKey(p => p.MaDK).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(p => p.DaiDienDoanhNghiep).WithMany(d => d.PhongVans).HasForeignKey(p => p.MaDaiDien);
        });

        modelBuilder.Entity<DangKyThucTap>().Property(x => x.MaPVKetThuc).HasMaxLength(20).IsConcurrencyToken();
        modelBuilder.Entity<DangKyThucTap>().HasOne<PhongVan>().WithMany().HasForeignKey(x => x.MaPVKetThuc).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<NhatKyPhongVan>(e =>
        {
            e.ToTable("NHATKYPHONGVAN"); e.HasKey(x => x.MaNhatKy);
            e.Property(x => x.Loai).HasMaxLength(20); e.Property(x => x.MaPVMoi).HasMaxLength(20);
            e.Property(x => x.MaNhatKy).HasMaxLength(20);
            e.Property(x => x.MaPV).HasMaxLength(20); e.Property(x => x.MaDK).HasMaxLength(20);
            e.Property(x => x.KetQuaCu).HasMaxLength(50); e.Property(x => x.KetQuaMoi).HasMaxLength(50);
            e.Property(x => x.LyDo).HasMaxLength(1000); e.Property(x => x.Nguon).HasMaxLength(20);
            e.Property(x => x.NguoiThucHien).HasMaxLength(20);
            e.HasOne<PhongVan>().WithMany(x => x.NhatKy).HasForeignKey(x => x.MaPV).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<DangKyThucTap>().WithMany().HasForeignKey(x => x.MaDK).OnDelete(DeleteBehavior.Restrict);
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

