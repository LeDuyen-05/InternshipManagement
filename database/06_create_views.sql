/* =====================================================================
   06_create_views.sql
   View phục vụ thống kê/báo cáo (module BaoCao — không có Entity riêng).
   ===================================================================== */
USE InternshipManagementDb;
GO

CREATE VIEW VW_TinhHinhThucTap AS
SELECT
    d.maSo          AS maDot,
    d.tenDot,
    sv.maSV,
    sv.hoTen,
    pb.maCongTy,
    ct.tenCongTy,
    pb.trangThai    AS trangThaiPhanBo
FROM DOTTHUCTAP d
LEFT JOIN PHANBOTHUCTAP pb ON pb.maDot = d.maSo
LEFT JOIN SINHVIEN sv      ON sv.maSV = pb.maSinhVien
LEFT JOIN CONGTY ct        ON ct.maCongTy = pb.maCongTy;
GO
