/* =====================================================================
   02_create_tables.sql
   Tạo 18 bảng theo đúng sơ đồ lớp mức phân tích đã xác nhận.
   PK khai báo tại đây; FK (constraint) tách riêng ở 03_create_constraints.sql.
   ===================================================================== */
USE InternshipManagementDb;
GO

-- 1. SINHVIEN
CREATE TABLE SINHVIEN (
    maSV                NVARCHAR(20)    NOT NULL PRIMARY KEY,
    hoTen               NVARCHAR(100)   NOT NULL,
    lop                 NVARCHAR(20)    NULL,
    khoaHoc             NVARCHAR(20)    NULL,
    gpa                 FLOAT           NULL,
    kyNang              NVARCHAR(500)   NULL,
    chuyenNganh         NVARCHAR(100)   NULL,
    congNghe            NVARCHAR(255)   NULL,
    duAnDaThucHien      NVARCHAR(1000)  NULL
);
GO

-- 2. GIANGVIEN
CREATE TABLE GIANGVIEN (
    maGV                NVARCHAR(20)    NOT NULL PRIMARY KEY,
    hoTen               NVARCHAR(100)   NOT NULL,
    chuyenMon           NVARCHAR(100)   NULL,
    soLuongSVHD         INT             NOT NULL DEFAULT 0
);
GO

-- 3. CONGTY
CREATE TABLE CONGTY (
    maCongTy            NVARCHAR(20)    NOT NULL PRIMARY KEY,
    tenCongTy           NVARCHAR(150)   NOT NULL,
    viTriTuyen          NVARCHAR(150)   NULL,
    thoiGian            DATETIME        NULL,
    soLuongNhan         INT             NULL,
    yeuCau              NVARCHAR(MAX)   NULL,
    trangThai           NVARCHAR(30)    NULL
);
GO

-- 4. DAIDIENDOANHNGHIEP
CREATE TABLE DAIDIENDOANHNGHIEP (
    maSo                NVARCHAR(20)    NOT NULL PRIMARY KEY,
    maCongTy            NVARCHAR(20)    NOT NULL,
    hoTen               NVARCHAR(100)   NOT NULL,
    chucVu              NVARCHAR(100)   NULL,
    email               NVARCHAR(100)   NULL
);
GO

-- 5. HOSONANGLUC (quan hệ 1-1 với SinhVien)
CREATE TABLE HOSONANGLUC (
    maHoSo              NVARCHAR(20)    NOT NULL PRIMARY KEY,
    maSinhVien          NVARCHAR(20)    NOT NULL UNIQUE,
    NDHoSo              NVARCHAR(MAX)   NULL,
    ngayCapNhat         DATETIME        NULL
);
GO

-- 6. DOTTHUCTAP
CREATE TABLE DOTTHUCTAP (
    maSo                NVARCHAR(20)    NOT NULL PRIMARY KEY,
    tenDot              NVARCHAR(100)   NOT NULL,
    namHoc              DATETIME        NULL,
    thoiGianBD          DATETIME        NULL,
    thoiGianKT          DATETIME        NULL,
    trangThai           BIT             NOT NULL DEFAULT 0
);
GO

-- 7. DANGKYTHUCTAP (lớp kết hợp SinhVien - CongTy, có khóa riêng theo xác nhận)
CREATE TABLE DANGKYTHUCTAP (
    maDangKy            NVARCHAR(20)    NOT NULL PRIMARY KEY,
    maSinhVien          NVARCHAR(20)    NOT NULL,
    maCongTy            NVARCHAR(20)    NOT NULL,
    maDot               NVARCHAR(20)    NOT NULL,
    ngayDangKy          DATETIME        NOT NULL DEFAULT GETDATE(),
    thuTuUuTien         INT             NULL,
    trangThai           BIT             NOT NULL DEFAULT 0
);
GO

-- 8. PHONGVAN
CREATE TABLE PHONGVAN (
    maPV                NVARCHAR(20)    NOT NULL PRIMARY KEY,
    maSinhVien          NVARCHAR(20)    NOT NULL,
    maCongTy            NVARCHAR(20)    NOT NULL,
    hinhThuc            NVARCHAR(50)    NULL,
    ngayPV              DATETIME        NULL,
    ketQua              BIT             NULL
);
GO

-- 9. PHANBOTHUCTAP (bổ sung maSinhVien theo xác nhận của nhóm)
CREATE TABLE PHANBOTHUCTAP (
    maPhanBo            NVARCHAR(20)    NOT NULL PRIMARY KEY,
    maSinhVien          NVARCHAR(20)    NOT NULL,
    maCongTy            NVARCHAR(20)    NOT NULL,
    maDot               NVARCHAR(20)    NOT NULL,
    ngayPhanBo          DATETIME        NOT NULL DEFAULT GETDATE(),
    trangThai           BIT             NOT NULL DEFAULT 0
);
GO

-- 10. GVHUONGDAN (lớp kết hợp GiangVien - SinhVien)
CREATE TABLE GVHUONGDAN (
    maSo                NVARCHAR(20)    NOT NULL PRIMARY KEY,
    maGiangVien         NVARCHAR(20)    NOT NULL,
    maSinhVien          NVARCHAR(20)    NOT NULL,
    ngayPC              DATETIME        NOT NULL DEFAULT GETDATE(),
    trangThai           BIT             NOT NULL DEFAULT 1
);
GO

-- 11. HUONGDANDOANHNGHIEP (lớp kết hợp DaiDienDoanhNghiep - DangKyThucTap)
CREATE TABLE HUONGDANDOANHNGHIEP (
    maSo                NVARCHAR(20)    NOT NULL PRIMARY KEY,
    maDaiDien           NVARCHAR(20)    NOT NULL,
    maDangKy            NVARCHAR(20)    NOT NULL,
    ngayBD              DATETIME        NULL,
    vaiTro              NVARCHAR(100)   NULL,
    danhGia             NVARCHAR(MAX)   NULL
);
GO

-- 12. TIENDOTHUCTAP
CREATE TABLE TIENDOTHUCTAP (
    maTienDo            NVARCHAR(20)    NOT NULL PRIMARY KEY,
    maDot               NVARCHAR(20)    NOT NULL,
    mocThoiGian         DATETIME        NULL,
    NDBaoCao            NVARCHAR(MAX)   NULL,
    trangThaiDuyet      BIT             NOT NULL DEFAULT 0
);
GO

-- 13. PHIEUCHAMDIEM
CREATE TABLE PHIEUCHAMDIEM (
    maPhieu             NVARCHAR(20)    NOT NULL PRIMARY KEY,
    maGV                NVARCHAR(20)    NOT NULL,   -- FK -> GVHUONGDAN
    maDoanhNghiep       NVARCHAR(20)    NOT NULL,   -- FK -> HUONGDANDOANHNGHIEP
    maDot               NVARCHAR(20)    NOT NULL,
    tongDiem            FLOAT           NULL,
    ngayCham            DATETIME        NULL
);
GO

-- 14. TIEUCHI
CREATE TABLE TIEUCHI (
    maTieuChi           NVARCHAR(20)    NOT NULL PRIMARY KEY,
    tenTieuChi          NVARCHAR(150)   NOT NULL,
    diemToiDa           FLOAT           NOT NULL
);
GO

-- 15. CHITIETCHAMDIEM (lớp kết hợp PhieuChamDiem - TieuChi, khóa phức hợp theo xác nhận)
CREATE TABLE CHITIETCHAMDIEM (
    maPhieuCham         NVARCHAR(20)    NOT NULL,
    maTieuChi           NVARCHAR(20)    NOT NULL,
    diemCham            FLOAT           NULL,
    nhanXet             NVARCHAR(500)   NULL,
    CONSTRAINT PK_CHITIETCHAMDIEM PRIMARY KEY (maPhieuCham, maTieuChi)
);
GO

-- 16. GOIYCONGTY (ĐỀ XUẤT: khóa phức hợp — xem ghi chú trong README.md của thư mục này)
CREATE TABLE GOIYCONGTY (
    maHoSo              NVARCHAR(20)    NOT NULL,
    maCongTy            NVARCHAR(20)    NOT NULL,
    tiLeTuongThich      FLOAT           NULL,
    ngayGoiY            DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_GOIYCONGTY PRIMARY KEY (maHoSo, maCongTy)
);
GO

-- 17. GIOITHIEU (lớp kết hợp GiangVien - CongTy)
-- GHI CHÚ: thuộc tính ngayGioiThieu, trangThaiKetNoi dùng theo bộ thuộc tính
-- đã xác nhận trước đó (dựa trên file .mdl gốc) — xem README.md.
CREATE TABLE GIOITHIEU (
    maSo                NVARCHAR(20)    NOT NULL PRIMARY KEY,
    maGV                NVARCHAR(20)    NOT NULL,
    maCongTy            NVARCHAR(20)    NOT NULL,
    ngayGioiThieu       DATETIME        NULL,
    trangThaiKetNoi     NVARCHAR(30)    NULL
);
GO

-- 18. DEXUATCONGTY
CREATE TABLE DEXUATCONGTY (
    maDeXuat            NVARCHAR(20)    NOT NULL PRIMARY KEY,
    ngayDeXuat          DATETIME        NOT NULL DEFAULT GETDATE(),
    maCongTy            NVARCHAR(20)    NOT NULL,
    maSV                NVARCHAR(20)    NOT NULL,
    maGV                NVARCHAR(20)    NOT NULL
);
GO
