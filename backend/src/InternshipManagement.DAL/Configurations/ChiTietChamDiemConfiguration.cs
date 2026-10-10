using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternshipManagement.DAL.Configurations;

/// <summary>
/// ChiTietChamDiem dùng khóa chính phức hợp (MaPhieuCham, MaTieuChi)
/// theo xác nhận của nhóm — không tạo mã riêng.
/// </summary>
public class ChiTietChamDiemConfiguration : IEntityTypeConfiguration<ChiTietChamDiem>
{
    public void Configure(EntityTypeBuilder<ChiTietChamDiem> builder)
    {
        builder.ToTable("CHITIETCHAMDIEM");
        builder.HasKey(x => x.MaSo);
        builder.Property(x => x.MaSo).HasColumnName("maSo");
        builder.Property(x => x.MaPhieuCham).HasColumnName("maPhieu");
        builder.Property(x => x.MaTieuChi).HasColumnName("maTieuChi");

        builder.HasOne(x => x.PhieuChamDiem).WithMany(p => p.ChiTietChamDiems).HasForeignKey(x => x.MaPhieuCham);
        builder.HasOne(x => x.TieuChi).WithMany(t => t.ChiTietChamDiems).HasForeignKey(x => x.MaTieuChi);
    }
}
