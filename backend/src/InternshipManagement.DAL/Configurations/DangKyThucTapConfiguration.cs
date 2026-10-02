using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternshipManagement.DAL.Configurations;

/// <summary>
/// DangKyThucTap dùng khóa chính riêng (MaDangKy) theo xác nhận của nhóm,
/// không dùng khóa phức hợp (MaSinhVien, MaCongTy, MaDot).
/// </summary>
public class DangKyThucTapConfiguration : IEntityTypeConfiguration<DangKyThucTap>
{
    public void Configure(EntityTypeBuilder<DangKyThucTap> builder)
    {
        builder.ToTable("DANGKYTHUCTAP");
        builder.HasKey(x => x.MaDangKy);

        builder.HasOne(x => x.SinhVien).WithMany(s => s.DangKyThucTaps).HasForeignKey(x => x.MaSinhVien);
        builder.HasOne(x => x.CongTy).WithMany(c => c.DangKyThucTaps).HasForeignKey(x => x.MaCongTy);
        builder.HasOne(x => x.DotThucTap).WithMany(d => d.DangKyThucTaps).HasForeignKey(x => x.MaDot);
    }
}
