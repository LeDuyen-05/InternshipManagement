using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternshipManagement.DAL.Configurations;

public class SinhVienThamGiaDotConfiguration : IEntityTypeConfiguration<SinhVienThamGiaDot>
{
    public void Configure(EntityTypeBuilder<SinhVienThamGiaDot> builder)
    {
        builder.ToTable("SVTHAMGIADOT");
        builder.HasKey(x => new { x.MaDot, x.MaSV });
        builder.Property(x => x.MaDot).HasMaxLength(20);
        builder.Property(x => x.MaSV).HasMaxLength(20);
        builder.Property(x => x.DangThamGia).HasDefaultValue(true).IsConcurrencyToken();
        builder.Property(x => x.NguoiThem).HasMaxLength(20).IsRequired();
        builder.Property(x => x.NguoiCapNhat).HasMaxLength(20).IsRequired();
        builder.HasOne<SinhVien>().WithMany().HasForeignKey(x => x.MaSV).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<DotThucTap>().WithMany().HasForeignKey(x => x.MaDot).OnDelete(DeleteBehavior.Restrict);
    }
}
