/* =====================================================================
   04_create_indexes.sql
   Index cho các cột FK hay được truy vấn/join nhiều.
   ===================================================================== */
USE InternshipManagementDb;
GO

CREATE INDEX IX_DangKy_SinhVien ON DANGKYTHUCTAP(maSinhVien);
CREATE INDEX IX_DangKy_CongTy   ON DANGKYTHUCTAP(maCongTy);
CREATE INDEX IX_DangKy_Dot      ON DANGKYTHUCTAP(maDot);

CREATE INDEX IX_PhanBo_SinhVien ON PHANBOTHUCTAP(maSinhVien);
CREATE INDEX IX_PhanBo_CongTy   ON PHANBOTHUCTAP(maCongTy);

CREATE INDEX IX_PhongVan_SinhVien ON PHONGVAN(maSinhVien);
CREATE INDEX IX_PhongVan_CongTy   ON PHONGVAN(maCongTy);

CREATE INDEX IX_ChamDiem_Dot ON PHIEUCHAMDIEM(maDot);

CREATE INDEX IX_GoiY_CongTy ON GOIYCONGTY(maCongTy);
GO
