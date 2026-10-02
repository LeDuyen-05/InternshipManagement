/* =====================================================================
   01_create_database.sql
   Tạo database cho hệ thống Quản lý công tác thực tập tốt nghiệp
   ===================================================================== */
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'InternshipManagementDb')
BEGIN
    CREATE DATABASE InternshipManagementDb;
END
GO

USE InternshipManagementDb;
GO
