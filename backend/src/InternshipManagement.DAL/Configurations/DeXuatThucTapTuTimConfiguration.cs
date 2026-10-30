using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternshipManagement.DAL.Configurations;

public class DeXuatThucTapTuTimConfiguration : IEntityTypeConfiguration<DeXuatThucTapTuTim>
{
    public void Configure(EntityTypeBuilder<DeXuatThucTapTuTim> builder)
    {
        builder.ToTable("DEXUATTHUCTAPTUTIM");
        builder.HasKey(x => x.MaHoSo);
        foreach (var property in new[] { "MaHoSo", "MaSV", "MaDot", "MaCongTy", "MaPhanBo", "NguoiDuyet" })
            builder.Property<string>(property).HasMaxLength(20);
        builder.Property(x => x.TenCongTy).HasMaxLength(200).IsRequired();
        builder.Property(x => x.DiaChi).HasMaxLength(500).IsRequired();
        builder.Property(x => x.ViTri).HasMaxLength(200).IsRequired();
        builder.Property(x => x.NguoiLienHe).HasMaxLength(200).IsRequired();
        builder.Property(x => x.LienHe).HasMaxLength(200).IsRequired();
        builder.Property(x => x.TrangThai).HasMaxLength(20).IsRequired();
        builder.Property(x => x.LyDo).HasMaxLength(1000);
        builder.HasOne<SinhVien>().WithMany().HasForeignKey(x => x.MaSV).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<DotThucTap>().WithMany().HasForeignKey(x => x.MaDot).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<CongTy>().WithMany().HasForeignKey(x => x.MaCongTy).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<PhanBoThucTap>().WithOne(x => x.HoSoTuTim).HasForeignKey<DeXuatThucTapTuTim>(x => x.MaPhanBo).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(x => x.MaPhanBo).IsUnique().HasDatabaseName("UQ_TUTIM_PHANBO").HasFilter("[MaPhanBo] IS NOT NULL");
        builder.HasIndex(x => new { x.MaSV, x.MaDot }).IsUnique().HasDatabaseName("UQ_TUTIM_CHO_DUYET")
            .HasFilter("[TrangThai] = N'ChoDuyet'");
    }
}
