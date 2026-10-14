-- Migration 09: Thêm cột nhanXetGV vào bảng TIENDOTHUCTAP
IF NOT EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[TIENDOTHUCTAP]') 
      AND name = 'nhanXetGV'
)
BEGIN
    ALTER TABLE [dbo].[TIENDOTHUCTAP]
    ADD [nhanXetGV] NVARCHAR(500) NULL;
    PRINT 'Đã thêm cột nhanXetGV vào bảng TIENDOTHUCTAP thành công.';
END
ELSE
BEGIN
    PRINT 'Cột nhanXetGV đã tồn tại trong bảng TIENDOTHUCTAP.';
END
GO
