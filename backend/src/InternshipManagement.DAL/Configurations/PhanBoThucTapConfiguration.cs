using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternshipManagement.DAL.Configurations;

public class PhanBoThucTapConfiguration : IEntityTypeConfiguration<PhanBoThucTap>
{
    public void Configure(EntityTypeBuilder<PhanBoThucTap> builder)
    {
        builder.ToTable("PHANBOTHUCTAP");
        builder.HasKey(x => x.MaPhanBo);

        builder.Property(x => x.MaPhanBo).HasColumnName("maPB").HasMaxLength(20);
        builder.Property(x => x.MaSinhVien).HasColumnName("maSV").HasMaxLength(20);
        builder.Property(x => x.MaCongTy).HasColumnName("maCongTy").HasMaxLength(20);
        builder.Property(x => x.MaDot).HasColumnName("maDot").HasMaxLength(20);
        builder.Property(x => x.NgayPhanBo).HasColumnName("ngayPhanBo");
        builder.Property(x => x.TrangThai).HasColumnName("trangThai").HasMaxLength(50).IsRequired().IsConcurrencyToken();
        builder.Property(x => x.DaDuocKhoaDuyet).HasColumnName("daDuocKhoaDuyet").HasDefaultValue(true).IsConcurrencyToken();
        builder.Property(x => x.NgaySVXacNhan).HasColumnName("ngaySVXacNhan");
        builder.Property(x => x.NgayKhoaDuyet).HasColumnName("ngayKhoaDuyet");
        builder.Property(x => x.NguoiKhoaDuyet).HasColumnName("nguoiKhoaDuyet").HasMaxLength(20);
        builder.Property(x => x.LyDoHuy).HasMaxLength(1000);
        builder.Property(x => x.CanCuHuy).HasMaxLength(1000);
        builder.Property(x => x.NguoiHuy).HasMaxLength(20);
        builder.Property(x => x.TrangThaiXuLyLai).HasMaxLength(30).IsConcurrencyToken();
        builder.Property(x => x.MaPhanBoTruoc).HasMaxLength(20);
        builder.Property(x => x.NguonPhanBo).HasMaxLength(30);
        builder.Property(x => x.NgayBatDauThucTap).HasColumnType("date");
        builder.Property(x => x.NgayKetThucThucTap).HasColumnType("date");
        builder.Property(x => x.PhienBanThoiGian).IsConcurrencyToken();
        builder.HasOne<PhanBoThucTap>().WithMany().HasForeignKey(x => x.MaPhanBoTruoc).OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.SinhVien).WithMany(s => s.PhanBoThucTaps).HasForeignKey(x => x.MaSinhVien);
        builder.HasOne(x => x.CongTy).WithMany(c => c.PhanBoThucTaps).HasForeignKey(x => x.MaCongTy);
        builder.HasOne(x => x.DotThucTap).WithMany(d => d.PhanBoThucTaps).HasForeignKey(x => x.MaDot);
    }
}
