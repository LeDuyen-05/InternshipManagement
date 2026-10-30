using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternshipManagement.DAL.Configurations;

public class NhatKyDieuChinhThucTapConfiguration : IEntityTypeConfiguration<NhatKyDieuChinhThucTap>
{
    public void Configure(EntityTypeBuilder<NhatKyDieuChinhThucTap> b)
    {
        b.ToTable("NHATKYDIEUCHINHTHUCTAP");
        b.HasKey(x => x.MaNhatKy);
        b.Property(x => x.MaNhatKy).HasMaxLength(20);
        b.Property(x => x.MaDot).HasMaxLength(20);
        b.Property(x => x.MaSV).HasMaxLength(20);
        b.Property(x => x.MaPhanBo).HasMaxLength(20);
        b.Property(x => x.Loai).HasMaxLength(30);
        b.Property(x => x.LyDo).HasMaxLength(1000);
        b.Property(x => x.CanCu).HasMaxLength(1000);
        b.Property(x => x.NoiDung).HasMaxLength(2000);
        b.Property(x => x.NguoiThucHien).HasMaxLength(20);
        b.HasOne<DotThucTap>().WithMany().HasForeignKey(x => x.MaDot).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<SinhVien>().WithMany().HasForeignKey(x => x.MaSV).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<PhanBoThucTap>().WithMany().HasForeignKey(x => x.MaPhanBo).OnDelete(DeleteBehavior.Restrict);
        b.HasIndex(x => new { x.MaDot, x.MaSV, x.ThoiDiem });
    }
}
