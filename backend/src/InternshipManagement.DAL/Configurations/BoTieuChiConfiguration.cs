using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternshipManagement.DAL.Configurations;

public class LoaiThucTapConfiguration : IEntityTypeConfiguration<LoaiThucTap>
{
    public void Configure(EntityTypeBuilder<LoaiThucTap> e)
    {
        e.ToTable("LOAITHUCTAP"); e.HasKey(x => x.MaLoai);
        e.Property(x => x.MaLoai).HasMaxLength(20);
        e.Property(x => x.TenLoai).HasMaxLength(100);
    }
}

public class BoTieuChiConfiguration : IEntityTypeConfiguration<BoTieuChi>
{
    public void Configure(EntityTypeBuilder<BoTieuChi> e)
    {
        e.ToTable("BOTIEUCHI"); e.HasKey(x => x.MaRubric);
        e.Property(x => x.MaRubric).HasMaxLength(40);
        e.Property(x => x.TenBo).HasMaxLength(200);
        e.Property(x => x.MaLoaiThucTap).HasMaxLength(20);
        e.Property(x => x.TrangThai).HasMaxLength(20);
        e.Property(x => x.NguoiTao).HasMaxLength(20);
        e.Property(x => x.NguoiPhatHanh).HasMaxLength(20);
        e.Property(x => x.PhienBanCapNhat).IsConcurrencyToken();
        e.HasOne<LoaiThucTap>().WithMany().HasForeignKey(x => x.MaLoaiThucTap).OnDelete(DeleteBehavior.Restrict);
    }
}
