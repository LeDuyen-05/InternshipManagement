namespace InternshipManagement.DAL.Database;

public static class InterviewCorrectionMigration
{
    public static IReadOnlyList<string> Statements { get; } = new[] {
        """
        IF COL_LENGTH('PHONGVAN','PhienBan') IS NULL ALTER TABLE PHONGVAN ADD PhienBan INT NOT NULL DEFAULT 0;
        IF COL_LENGTH('PHONGVAN','MaPVTruoc') IS NULL ALTER TABLE PHONGVAN ADD MaPVTruoc NVARCHAR(20) NULL;
        IF COL_LENGTH('DANGKYTHUCTAP','MaPVKetThuc') IS NULL ALTER TABLE DANGKYTHUCTAP ADD MaPVKetThuc NVARCHAR(20) NULL;
        IF COL_LENGTH('NHATKYPHONGVAN','Loai') IS NULL ALTER TABLE NHATKYPHONGVAN ADD Loai NVARCHAR(20) NOT NULL DEFAULT 'KetQua';
        IF COL_LENGTH('NHATKYPHONGVAN','MaPVMoi') IS NULL ALTER TABLE NHATKYPHONGVAN ADD MaPVMoi NVARCHAR(20) NULL;
        IF COL_LENGTH('NHATKYPHONGVAN','NoiDungCu') IS NULL ALTER TABLE NHATKYPHONGVAN ADD NoiDungCu NVARCHAR(MAX) NULL;
        IF COL_LENGTH('NHATKYPHONGVAN','NoiDungMoi') IS NULL ALTER TABLE NHATKYPHONGVAN ADD NoiDungMoi NVARCHAR(MAX) NULL;
        """,
        """
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_PV_TRUOC')
            ALTER TABLE PHONGVAN ADD CONSTRAINT FK_PV_TRUOC FOREIGN KEY (MaPVTruoc) REFERENCES PHONGVAN(maPV);
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_DK_PV_KETTHUC')
            ALTER TABLE DANGKYTHUCTAP ADD CONSTRAINT FK_DK_PV_KETTHUC FOREIGN KEY (MaPVKetThuc) REFERENCES PHONGVAN(maPV);
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('PHONGVAN') AND name='UQ_PV_THAYTHE')
            CREATE UNIQUE INDEX UQ_PV_THAYTHE ON PHONGVAN(MaPVTruoc) WHERE MaPVTruoc IS NOT NULL;
        -- Backfill only a uniquely linked, audited negative result with its exact generated closing reason.
        UPDATE d SET MaPVKetThuc=p.maPV FROM DANGKYTHUCTAP d JOIN PHONGVAN p ON p.MaDK=d.maDK
        WHERE d.MaPVKetThuc IS NULL AND d.trangThai=N'TuChoi' AND p.ketQua IN (N'KhongDat',N'Vang')
          AND d.LyDoKetThuc=LEFT(CASE WHEN p.ketQua=N'Vang' THEN N'Vắng/bỏ phỏng vấn: ' ELSE N'Phỏng vấn không đạt: ' END+ISNULL(p.LyDoKetQua,N''),1000)
          AND (SELECT COUNT(*) FROM PHONGVAN p2 WHERE p2.MaDK=d.maDK)=1
          AND EXISTS (SELECT 1 FROM NHATKYPHONGVAN n WHERE n.MaPV=p.maPV AND n.MaDK=d.maDK AND n.KetQuaMoi=p.ketQua);
        """
    };
}
