/* =====================================================================
   07_create_stored_procedures.sql
   Chưa cần nhiều stored procedure ở giai đoạn khởi tạo — phần lớn nghiệp vụ
   được xử lý ở tầng Application (C#) để dễ debug/bảo trì hơn so với đặt
   logic trong SQL. Chỉ tạo 1 SP minh họa; bổ sung thêm khi thực sự cần.
   ===================================================================== */
USE InternshipManagementDb;
GO

CREATE PROCEDURE SP_GetSinhVienByMaSV
    @MaSV NVARCHAR(20)
AS
BEGIN
    SELECT * FROM SINHVIEN WHERE maSV = @MaSV;
END
GO
