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
        builder.Property(x => x.TrangThai).HasColumnName("trangThai").HasMaxLength(50);

        builder.HasOne(x => x.SinhVien).WithMany(s => s.PhanBoThucTaps).HasForeignKey(x => x.MaSinhVien);
        builder.HasOne(x => x.CongTy).WithMany(c => c.PhanBoThucTaps).HasForeignKey(x => x.MaCongTy);
        builder.HasOne(x => x.DotThucTap).WithMany(d => d.PhanBoThucTaps).HasForeignKey(x => x.MaDot);
    }
}
