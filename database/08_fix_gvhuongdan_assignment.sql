USE InternshipManagementDb;
GO

IF COL_LENGTH('GVHUONGDAN', 'trangThai') IS NOT NULL
   AND EXISTS (
       SELECT 1
       FROM sys.columns
       WHERE object_id = OBJECT_ID('GVHUONGDAN')
         AND name = 'trangThai'
         AND system_type_id = TYPE_ID('bit')
   )
BEGIN
    ALTER TABLE GVHUONGDAN
        ADD trangThaiMoi NVARCHAR(50) NOT NULL
            CONSTRAINT DF_GVHUONGDAN_TrangThaiMoi DEFAULT N'DangHuongDan';

    UPDATE GVHUONGDAN
    SET trangThaiMoi = CASE WHEN trangThai = 1 THEN N'DangHuongDan' ELSE N'HuyBo' END;

    ALTER TABLE GVHUONGDAN DROP COLUMN trangThai;
    EXEC sp_rename 'GVHUONGDAN.trangThaiMoi', 'trangThai', 'COLUMN';
END;
GO

IF EXISTS (
    SELECT 1
    FROM GVHUONGDAN
    WHERE trangThai = N'DangHuongDan'
    GROUP BY maSinhVien
    HAVING COUNT(*) > 1
)
    THROW 50001, 'Không thể tạo ràng buộc: có sinh viên đang có nhiều phân công hoạt động.', 1;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('GVHUONGDAN')
      AND name = 'UX_GVHuongDan_ActiveSinhVien'
)
    CREATE UNIQUE INDEX UX_GVHuongDan_ActiveSinhVien
        ON GVHUONGDAN(maSinhVien)
        WHERE trangThai = N'DangHuongDan';
GO
