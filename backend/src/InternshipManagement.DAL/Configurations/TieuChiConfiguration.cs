using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternshipManagement.DAL.Configurations;

public class TieuChiConfiguration : IEntityTypeConfiguration<TieuChi>
{
    public void Configure(EntityTypeBuilder<TieuChi> builder)
    {
        builder.ToTable("TIEUCHI");
        builder.HasKey(x => x.MaTieuChi);

        builder.Property(x => x.MaTieuChi).HasColumnName("maTieuChi").HasMaxLength(20);
        builder.Property(x => x.TenTieuChi).HasColumnName("tenTieuChi").HasMaxLength(200);
        builder.Property(x => x.DiemToiDa).HasColumnName("diemToiDa").HasColumnType("decimal(5,2)");
    }
}
