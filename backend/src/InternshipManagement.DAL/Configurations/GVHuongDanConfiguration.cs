using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternshipManagement.DAL.Configurations;

public class GVHuongDanConfiguration : IEntityTypeConfiguration<GVHuongDan>
{
    public void Configure(EntityTypeBuilder<GVHuongDan> builder)
    {
        builder.ToTable("GVHUONGDAN");
        builder.HasKey(x => x.MaSo);

        builder.Property(x => x.MaSo).HasColumnName("maSo").HasMaxLength(20);
        builder.Property(x => x.MaGiangVien).HasColumnName("maGV").HasMaxLength(20);
        builder.Property(x => x.MaSinhVien).HasColumnName("maSV").HasMaxLength(20);
        builder.Property(x => x.MaDot).HasColumnName("maDot").HasMaxLength(20);
        builder.Property(x => x.NgayPC).HasColumnName("ngayPC");
        builder.Property(x => x.TrangThai).HasColumnName("trangThai").HasMaxLength(50);
        builder.HasIndex(x => new { x.MaSinhVien, x.MaDot })
            .HasDatabaseName("UQ_GVHD_SV_DOT_ACTIVE")
            .IsUnique()
            .HasFilter("[trangThai] = N'DangHuongDan' AND [maDot] IS NOT NULL");

        builder.HasOne(x => x.DotThucTap)
            .WithMany()
            .HasForeignKey(x => x.MaDot)
            .HasConstraintName("FK_GVHD_DOTTHUCTAP")
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.GiangVien)
            .WithMany(g => g.GVHuongDans)
            .HasForeignKey(x => x.MaGiangVien);

        builder.HasOne(x => x.SinhVien)
            .WithMany(s => s.GVHuongDans)
            .HasForeignKey(x => x.MaSinhVien);
    }
}
