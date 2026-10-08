using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternshipManagement.DAL.Configurations;

public class PhieuChamDiemConfiguration : IEntityTypeConfiguration<PhieuChamDiem>
{
    public void Configure(EntityTypeBuilder<PhieuChamDiem> builder)
    {
        builder.ToTable("PHIEUCHAMDIEM");
        builder.HasKey(x => x.MaPhieu);

        builder.Property(x => x.MaPhieu).HasColumnName("maPhieu").HasMaxLength(20);
        builder.Property(x => x.TongDiem).HasColumnName("tongDiem").HasColumnType("decimal(5,2)");
        builder.Property(x => x.NgayCham).HasColumnName("ngayCham");
        builder.Property(x => x.MaDot).HasColumnName("maDot").HasMaxLength(20);
        builder.Property(x => x.MaSV).HasColumnName("maSV").HasMaxLength(20);
        builder.Property(x => x.MaDaiDien).HasColumnName("maDaiDien").HasMaxLength(20);
        builder.Property(x => x.MaGVHuongDan).HasColumnName("maGVHuongDan").HasMaxLength(20);

        builder.HasOne(x => x.DotThucTap)
            .WithMany()
            .HasForeignKey(x => x.MaDot)
            .IsRequired();

        builder.HasOne(x => x.SinhVien)
            .WithMany()
            .HasForeignKey(x => x.MaSV)
            .IsRequired();

        builder.HasOne(x => x.DaiDienDoanhNghiep)
            .WithMany()
            .HasForeignKey(x => x.MaDaiDien)
            .IsRequired(false);

        builder.HasOne(x => x.GVHuongDan)
            .WithMany(g => g.PhieuChamDiems)
            .HasForeignKey(x => x.MaGVHuongDan)
            .IsRequired(false);
    }
}
