/* =====================================================================
   05_seed_data.sql
   Dữ liệu mẫu tối thiểu để nhóm test API — KHÔNG phải dữ liệu thật.
   Dữ liệu "ảo" cho phần AI (hồ sơ SV mẫu, JD công ty) sẽ được nạp riêng
   qua ml-service/data, không trộn vào seed nghiệp vụ này.
   ===================================================================== */
USE InternshipManagementDb;
GO

INSERT INTO SINHVIEN (maSV, hoTen, lop, khoaHoc, gpa, kyNang, chuyenNganh, congNghe, duAnDaThucHien)
VALUES
('SV001', N'Nguyễn Thị Kim Chi', N'14DHTH14', N'2023-2027', 3.2, N'C#, SQL, React', N'Công nghệ phần mềm', N'.NET, ReactJS', N'Website bán hàng'),
('SV002', N'Nguyễn Huỳnh Thành Danh', N'14DHTH02', N'2023-2027', 3.4, N'Python, ML, FastAPI', N'Trí tuệ nhân tạo', N'scikit-learn, pandas', N'Hệ thống gợi ý sản phẩm');
GO

INSERT INTO GIANGVIEN (maGV, hoTen, chuyenMon, soLuongSVHD)
VALUES ('GV001', N'Nguyễn Văn Lễ', N'Công nghệ phần mềm', 0);
GO

INSERT INTO CONGTY (maCongTy, tenCongTy, viTriTuyen, thoiGian, soLuongNhan, yeuCau, trangThai)
VALUES ('CT001', N'Công ty ABC Software', N'Thực tập sinh Backend', GETDATE(), 2, N'Biết C# hoặc Java', N'DaDuyet');
GO

INSERT INTO DOTTHUCTAP (maSo, tenDot, namHoc, thoiGianBD, thoiGianKT, trangThai)
VALUES ('DOT001', N'Đợt thực tập HK1', '2026-01-01', '2026-08-17', '2026-11-08', 1);
GO
