using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternshipManagement.DAL.Configurations;

public class ChiTietChamDiemConfiguration : IEntityTypeConfiguration<ChiTietChamDiem>
{
    public void Configure(EntityTypeBuilder<ChiTietChamDiem> builder)
    {
        builder.ToTable("CHITIETCHAMDIEM");
        builder.HasKey(x => x.MaSo);

        builder.Property(x => x.MaSo).HasColumnName("maSo").HasMaxLength(20);
        builder.Property(x => x.DiemCham).HasColumnName("diemCham").HasColumnType("decimal(5,2)");
        builder.Property(x => x.MaPhieu).HasColumnName("maPhieu").HasMaxLength(20);
        builder.Property(x => x.MaTieuChi).HasColumnName("maTieuChi").HasMaxLength(20);

        builder.HasOne(x => x.PhieuChamDiem)
            .WithMany(p => p.ChiTietChamDiems)
            .HasForeignKey(x => x.MaPhieu);

        builder.HasOne(x => x.TieuChi)
            .WithMany(t => t.ChiTietChamDiems)
            .HasForeignKey(x => x.MaTieuChi);
    }
}
