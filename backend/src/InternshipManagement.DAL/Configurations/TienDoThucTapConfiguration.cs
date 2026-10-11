using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternshipManagement.DAL.Configurations;

public class TienDoThucTapConfiguration : IEntityTypeConfiguration<TienDoThucTap>
{
    public void Configure(EntityTypeBuilder<TienDoThucTap> builder)
    {
        builder.ToTable("TIENDOTHUCTAP");
        builder.HasKey(x => x.MaTienDo);

        builder.Property(x => x.MaTienDo).HasColumnName("maTienDo").HasMaxLength(20).IsRequired();
        builder.Property(x => x.MocThoiGian).HasColumnName("mocThoiGian").IsRequired();
        builder.Property(x => x.NoiDungBaoCao).HasColumnName("noiDungBaoCao");
        builder.Property(x => x.NgayNop).HasColumnName("ngayNop");
        builder.Property(x => x.TrangThaiDuyet).HasColumnName("trangThaiDuyet").HasMaxLength(50).IsRequired();
        builder.Property(x => x.MaDot).HasColumnName("maDot").HasMaxLength(20).IsRequired();
        builder.Property(x => x.MaSV).HasColumnName("maSV").HasMaxLength(20).IsRequired();

        builder.HasOne(x => x.SinhVien)
            .WithMany(s => s.TienDoThucTaps)
            .HasForeignKey(x => x.MaSV);

        builder.HasOne(x => x.DotThucTap)
            .WithMany(d => d.TienDoThucTaps)
            .HasForeignKey(x => x.MaDot);
    }
}
