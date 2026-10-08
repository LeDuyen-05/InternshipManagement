using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternshipManagement.DAL.Configurations;

public class SinhVienConfiguration : IEntityTypeConfiguration<SinhVien>
{
    public void Configure(EntityTypeBuilder<SinhVien> builder)
    {
        builder.ToTable("SINHVIEN");
        builder.HasKey(x => x.MaSV);

        builder.Property(x => x.MaSV).HasMaxLength(20);
        builder.Property(x => x.HoTen).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Lop).HasMaxLength(20);
        builder.Property(x => x.ChuyenNganh).HasMaxLength(100);
        builder.Property(x => x.CongNghe).HasMaxLength(255);
        builder.Property(x => x.KyNang).HasMaxLength(500);
        builder.Property(x => x.DuAnDaThucHien).HasMaxLength(1000);
    }
}
