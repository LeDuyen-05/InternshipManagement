namespace InternshipManagement.DAL.Database;

public static class WorkflowExtensionsMigration
{
    public static IReadOnlyList<string> Statements { get; } = new[]
    {
        """
        IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('DANGKYTHUCTAP') AND name='CK_DKTT_UUTIEN')
        BEGIN
            ALTER TABLE DANGKYTHUCTAP DROP CONSTRAINT CK_DKTT_UUTIEN;
            ALTER TABLE DANGKYTHUCTAP WITH CHECK ADD CONSTRAINT CK_DKTT_UUTIEN CHECK (thuTuUuTien>=1);
        END;
        """,
        """
        IF COL_LENGTH('THONGBAO','danhMuc') IS NOT NULL
           AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('THONGBAO') AND name='danhMuc' AND default_object_id=0)
            ALTER TABLE THONGBAO ADD CONSTRAINT DF_THONGBAO_DANHMUC DEFAULT (N'Chung') FOR danhMuc;
        """,
        """
        IF OBJECT_ID('NHAPDANHSACHDOT','U') IS NULL
        BEGIN
            CREATE TABLE NHAPDANHSACHDOT (
                Id nvarchar(32) NOT NULL PRIMARY KEY,
                MaDot nvarchar(20) NOT NULL REFERENCES DOTTHUCTAP(maSo),
                NguoiNhap nvarchar(20) NOT NULL, TenNguon nvarchar(200) NOT NULL,
                CheDo nvarchar(20) NOT NULL, TrangThai nvarchar(20) NOT NULL,
                DuLieuJson nvarchar(max) NOT NULL, KetQuaJson nvarchar(max) NULL,
                NgayTao datetimeoffset NOT NULL, HetHan datetimeoffset NOT NULL,
                NgayNhap datetimeoffset NULL, PhienBan int NOT NULL);
            CREATE INDEX IX_NHAPDOT_DOT_NGAY ON NHAPDANHSACHDOT(MaDot,NgayTao);
        END;
        IF COL_LENGTH('KHONGHOANTATDOT','MaLyDo') IS NULL ALTER TABLE KHONGHOANTATDOT ADD MaLyDo nvarchar(30) NULL;
        IF COL_LENGTH('KHONGHOANTATDOT','MaLanHoTro') IS NULL ALTER TABLE KHONGHOANTATDOT ADD MaLanHoTro nvarchar(32) NULL;
        """,
        """
        IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_KHONGHOANTAT_LANHOTRO')
            ALTER TABLE KHONGHOANTATDOT ADD CONSTRAINT FK_KHONGHOANTAT_LANHOTRO
                FOREIGN KEY(MaLanHoTro) REFERENCES LANHOTROTHUCTAP(MaLan);
        """,
        """
        IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('PHANBOTHUCTAP') AND name='IX_PB_DOT_SV_READ')
            CREATE INDEX IX_PB_DOT_SV_READ ON PHANBOTHUCTAP(maDot,maSV)
                INCLUDE(maCongTy,trangThai,daDuocKhoaDuyet,ngayPhanBo,NgayBatDauThucTap,NgayKetThucThucTap,TenCongTyXacNhan);
        """
    };
}
