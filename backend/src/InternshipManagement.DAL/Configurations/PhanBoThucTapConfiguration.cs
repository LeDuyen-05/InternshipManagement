using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternshipManagement.DAL.Configurations;

/// <summary>
/// PhanBoThucTap bổ sung MaSinhVien theo xác nhận của nhóm để xác định trực tiếp
/// sinh viên được phân bổ. Khóa chính riêng: MaPhanBo.
/// </summary>
public class PhanBoThucTapConfiguration : IEntityTypeConfiguration<PhanBoThucTap>
{
    public void Configure(EntityTypeBuilder<PhanBoThucTap> builder)
    {
        builder.ToTable("PHANBOTHUCTAP");
        builder.HasKey(x => x.MaPhanBo);

        builder.HasOne(x => x.SinhVien).WithMany(s => s.PhanBoThucTaps).HasForeignKey(x => x.MaSinhVien);
        builder.HasOne(x => x.CongTy).WithMany(c => c.PhanBoThucTaps).HasForeignKey(x => x.MaCongTy);
        builder.HasOne(x => x.DotThucTap).WithMany(d => d.PhanBoThucTaps).HasForeignKey(x => x.MaDot);
    }
}
