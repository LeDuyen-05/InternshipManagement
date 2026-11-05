using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternshipManagement.DAL.Configurations;

public class NhapDanhSachDotConfiguration : IEntityTypeConfiguration<NhapDanhSachDot>
{
    public void Configure(EntityTypeBuilder<NhapDanhSachDot> e)
    {
        e.ToTable("NHAPDANHSACHDOT"); e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasMaxLength(32); e.Property(x => x.MaDot).HasMaxLength(20);
        e.Property(x => x.NguoiNhap).HasMaxLength(20); e.Property(x => x.TenNguon).HasMaxLength(200);
        e.Property(x => x.CheDo).HasMaxLength(20); e.Property(x => x.TrangThai).HasMaxLength(20);
        e.Property(x => x.PhienBan).IsConcurrencyToken();
        e.HasOne<DotThucTap>().WithMany().HasForeignKey(x => x.MaDot).OnDelete(DeleteBehavior.Restrict);
        e.HasIndex(x => new { x.MaDot, x.NgayTao });
    }
}
