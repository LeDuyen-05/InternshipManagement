using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternshipManagement.DAL.Configurations;

public class DangKyThucTapConfiguration : IEntityTypeConfiguration<DangKyThucTap>
{
    public void Configure(EntityTypeBuilder<DangKyThucTap> builder)
    {
        builder.ToTable("DANGKYTHUCTAP");
        builder.HasKey(x => x.MaDK);

        builder.Property(x => x.MaDK).HasColumnName("maDK").HasMaxLength(20);
        builder.Property(x => x.MaSV).HasColumnName("maSV").HasMaxLength(20);
        builder.Property(x => x.MaCongTy).HasColumnName("maCongTy").HasMaxLength(20);
        builder.Property(x => x.MaDot).HasColumnName("maDot").HasMaxLength(20);
        builder.Property(x => x.NgayDangKy).HasColumnName("ngayDangKy").HasColumnType("date");
        builder.Property(x => x.ThuTuUuTien).HasColumnName("thuTuUuTien");
        builder.Property(x => x.TrangThai).HasColumnName("trangThai").HasMaxLength(50);

        builder.HasOne(x => x.SinhVien).WithMany(s => s.DangKyThucTaps).HasForeignKey(x => x.MaSV);
        builder.HasOne(x => x.CongTy).WithMany(c => c.DangKyThucTaps).HasForeignKey(x => x.MaCongTy);
        builder.HasOne(x => x.DotThucTap).WithMany(d => d.DangKyThucTaps).HasForeignKey(x => x.MaDot);
    }
}
