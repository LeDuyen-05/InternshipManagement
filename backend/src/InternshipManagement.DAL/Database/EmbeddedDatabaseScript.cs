namespace InternshipManagement.DAL.Database;

public static class EmbeddedDatabaseScript
{
    public const string Sql = """
-- ============================================================
-- HỆ THỐNG QUẢN LÝ THỰC TẬP TỐT NGHIỆP
-- T-SQL Script - Tạo Cơ Sở Dữ Liệu
-- ============================================================

USE master;
GO

-- Tạo database nếu chưa tồn tại
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'QuanLyThucTap')
BEGIN
    CREATE DATABASE QuanLyThucTap
    COLLATE Vietnamese_CI_AS;
END
GO

USE QuanLyThucTap;
GO

SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================
-- XÓA CÁC BẢNG NẾU ĐÃ TỒN TẠI (theo thứ tự phụ thuộc FK)
-- ============================================================
IF OBJECT_ID('TAIKHOAN',           'U') IS NOT NULL DROP TABLE TAIKHOAN;
IF OBJECT_ID('CHITIETCHAMDIEM',    'U') IS NOT NULL DROP TABLE CHITIETCHAMDIEM;
IF OBJECT_ID('PHIEUCHAMDIEM',      'U') IS NOT NULL DROP TABLE PHIEUCHAMDIEM;
IF OBJECT_ID('TIEUCHI',            'U') IS NOT NULL DROP TABLE TIEUCHI;
IF OBJECT_ID('TIENDOTHUCTAP',      'U') IS NOT NULL DROP TABLE TIENDOTHUCTAP;
IF OBJECT_ID('HUONGDANDOANHNGHIEP','U') IS NOT NULL DROP TABLE HUONGDANDOANHNGHIEP;
IF OBJECT_ID('PHONGVAN',           'U') IS NOT NULL DROP TABLE PHONGVAN;
IF OBJECT_ID('PHANBOTHUCTAP',      'U') IS NOT NULL DROP TABLE PHANBOTHUCTAP;
IF OBJECT_ID('DANGKYTHUCTAP',      'U') IS NOT NULL DROP TABLE DANGKYTHUCTAP;
IF OBJECT_ID('GOIYCONGTY',         'U') IS NOT NULL DROP TABLE GOIYCONGTY;
IF OBJECT_ID('HOSONANGLUC',        'U') IS NOT NULL DROP TABLE HOSONANGLUC;
IF OBJECT_ID('GVHUONGDAN',         'U') IS NOT NULL DROP TABLE GVHUONGDAN;
IF OBJECT_ID('GIOITHIEU',          'U') IS NOT NULL DROP TABLE GIOITHIEU;
IF OBJECT_ID('DAIDIENDOANHNGHIEP', 'U') IS NOT NULL DROP TABLE DAIDIENDOANHNGHIEP;
IF OBJECT_ID('DOTTHUCTAP',         'U') IS NOT NULL DROP TABLE DOTTHUCTAP;
IF OBJECT_ID('CONGTY',             'U') IS NOT NULL DROP TABLE CONGTY;
IF OBJECT_ID('VAITRO',             'U') IS NOT NULL DROP TABLE VAITRO;
IF OBJECT_ID('SINHVIEN',           'U') IS NOT NULL DROP TABLE SINHVIEN;
IF OBJECT_ID('GIANGVIEN',          'U') IS NOT NULL DROP TABLE GIANGVIEN;
GO

-- ============================================================
-- BẢNG 1: GIANGVIEN
-- Lưu thông tin giảng viên hướng dẫn thực tập
-- ============================================================
CREATE TABLE GIANGVIEN (
    maGV            NVARCHAR(20)    NOT NULL,
    hoTen           NVARCHAR(100)   NOT NULL,
    chuyenMon       NVARCHAR(200)   NULL,
    soLuongSVHD     INT             NOT NULL DEFAULT 0,
    CONSTRAINT PK_GIANGVIEN PRIMARY KEY (maGV)
);
GO

-- ============================================================
-- BẢNG 2: SINHVIEN
-- Lưu thông tin sinh viên tham gia thực tập
-- ============================================================
CREATE TABLE SINHVIEN (
    maSV                NVARCHAR(20)    NOT NULL,
    hoTen               NVARCHAR(100)   NOT NULL,
    lop                 NVARCHAR(50)    NULL,
    khoaHoc             NVARCHAR(20)    NULL,
    gpa                 DECIMAL(3,2)    NULL,
    kyNang              NVARCHAR(500)   NULL,
    chuyenNganh         NVARCHAR(100)   NULL,
    congNghe            NVARCHAR(500)   NULL,
    duAnDaThucHien      NVARCHAR(1000)  NULL,
    CONSTRAINT PK_SINHVIEN PRIMARY KEY (maSV)
);
GO

-- ============================================================
-- BẢNG 4: CONGTY
-- Lưu thông tin công ty tuyển sinh viên thực tập
-- ============================================================
CREATE TABLE CONGTY (
    maCongTy            NVARCHAR(20)    NOT NULL,
    tenCongTy           NVARCHAR(200)   NOT NULL,
    viTriTuyen          NVARCHAR(200)   NULL,
    thoiGian            NVARCHAR(100)   NULL,
    soLuongNhan         INT             NULL DEFAULT 0,
    yeuCau              NVARCHAR(2000)  NULL,
    trangThai           NVARCHAR(50)    NOT NULL DEFAULT N'ChoDuyet',
    embeddingYeuCau     NVARCHAR(MAX)   NULL,   -- Vector embedding (JSON array) cho ML gợi ý
    CONSTRAINT PK_CONGTY PRIMARY KEY (maCongTy),
    CONSTRAINT CK_CONGTY_TRANGTHAI CHECK (trangThai IN (N'ChoDuyet', N'DaDuyet', N'TuChoi', N'DongBang'))
);
GO

-- ============================================================
-- BẢNG 18: VAITRO
-- Lưu vai trò người dùng trong hệ thống
-- ============================================================
CREATE TABLE VAITRO (
    maVaiTro    NVARCHAR(20)    NOT NULL,
    tenVaiTro   NVARCHAR(100)   NOT NULL,
    moTa        NVARCHAR(500)   NULL,
    CONSTRAINT PK_VAITRO PRIMARY KEY (maVaiTro)
);
GO

-- ============================================================
-- BẢNG 10: DOTTHUCTAP
-- Lưu thông tin từng đợt thực tập được tổ chức
-- ============================================================
CREATE TABLE DOTTHUCTAP (
    maSo            NVARCHAR(20)    NOT NULL,
    tenDot          NVARCHAR(200)   NOT NULL,
    namHoc          NVARCHAR(20)    NOT NULL,
    thoiGianBD      DATE            NOT NULL,
    thoiGianKT      DATE            NOT NULL,
    trangThai       NVARCHAR(50)    NOT NULL DEFAULT N'ChuaBatDau',
    CONSTRAINT PK_DOTTHUCTAP PRIMARY KEY (maSo),
    CONSTRAINT CK_DOTTHUCTAP_THOIGIAN  CHECK (thoiGianKT >= thoiGianBD),
    CONSTRAINT CK_DOTTHUCTAP_TRANGTHAI CHECK (trangThai IN (N'ChuaBatDau', N'DangDienRa', N'DaKetThuc'))
);
GO

-- ============================================================
-- BẢNG 5: DAIDIENDOANHNGHIEP
-- Lưu thông tin đại diện công ty tham gia hướng dẫn
-- ============================================================
CREATE TABLE DAIDIENDOANHNGHIEP (
    maSo            NVARCHAR(20)    NOT NULL,
    hoTen           NVARCHAR(100)   NOT NULL,
    chucVu          NVARCHAR(100)   NULL,
    email           NVARCHAR(200)   NULL,
    thongTinLienHe  NVARCHAR(500)   NULL,
    maCongTy        NVARCHAR(20)    NOT NULL,
    CONSTRAINT PK_DAIDIENDOANHNGHIEP PRIMARY KEY (maSo),
    CONSTRAINT FK_DDDN_CONGTY FOREIGN KEY (maCongTy) REFERENCES CONGTY(maCongTy)
);
GO

-- ============================================================
-- BẢNG 3: GVHUONGDAN
-- Ghi nhận việc phân công giảng viên hướng dẫn sinh viên
-- ============================================================
CREATE TABLE GVHUONGDAN (
    maSo        NVARCHAR(20)    NOT NULL,
    ngayPC      DATE            NOT NULL,
    trangThai   NVARCHAR(50)    NOT NULL DEFAULT N'DangHuongDan',
    maGV        NVARCHAR(20)    NOT NULL,
    maSV        NVARCHAR(20)    NOT NULL,
    CONSTRAINT PK_GVHUONGDAN PRIMARY KEY (maSo),
    CONSTRAINT FK_GVHD_GIANGVIEN FOREIGN KEY (maGV) REFERENCES GIANGVIEN(maGV),
    CONSTRAINT FK_GVHD_SINHVIEN  FOREIGN KEY (maSV) REFERENCES SINHVIEN(maSV),
    CONSTRAINT CK_GVHD_TRANGTHAI CHECK (trangThai IN (N'DangHuongDan', N'HoanThanh', N'HuyBo'))
);
GO

-- ============================================================
-- BẢNG 7: HOSONANGLUC
-- Lưu hồ sơ năng lực của sinh viên (dùng cho ML gợi ý)
-- ============================================================
CREATE TABLE HOSONANGLUC (
    maHoSo          NVARCHAR(20)    NOT NULL,
    NDHoSo          NVARCHAR(MAX)   NOT NULL,
    ngayCapNhat     DATE            NOT NULL,
    embeddingHoSo   NVARCHAR(MAX)   NULL,   -- Vector embedding (JSON array) cho ML
    maSV            NVARCHAR(20)    NOT NULL,
    CONSTRAINT PK_HOSONANGLUC PRIMARY KEY (maHoSo),
    CONSTRAINT FK_HSNL_SINHVIEN FOREIGN KEY (maSV) REFERENCES SINHVIEN(maSV)
);
GO

-- ============================================================
-- BẢNG 6: GOIYCONGTY
-- Kết quả gợi ý công ty phù hợp từ mô hình ML
-- ============================================================
CREATE TABLE GOIYCONGTY (
    maSo            NVARCHAR(20)    NOT NULL,
    tyLeTuongThich  DECIMAL(5,2)    NOT NULL,   -- 0.00 - 100.00 (%)
    ngayGoiY        DATE            NOT NULL,
    maHoSo          NVARCHAR(20)    NOT NULL,
    maCongTy        NVARCHAR(20)    NOT NULL,
    CONSTRAINT PK_GOIYCONGTY PRIMARY KEY (maSo),
    CONSTRAINT FK_GOYCT_HOSONANGLUC FOREIGN KEY (maHoSo)   REFERENCES HOSONANGLUC(maHoSo),
    CONSTRAINT FK_GOYCT_CONGTY      FOREIGN KEY (maCongTy) REFERENCES CONGTY(maCongTy),
    CONSTRAINT CK_GOYCT_TYLE        CHECK (tyLeTuongThich BETWEEN 0 AND 100)
);
GO

-- ============================================================
-- BẢNG 9: PHONGVAN
-- Lưu thông tin buổi phỏng vấn tuyển sinh viên thực tập
-- ============================================================
CREATE TABLE PHONGVAN (
    maPV        NVARCHAR(20)    NOT NULL,
    hinhThuc    NVARCHAR(100)   NULL,
    ngayPV      DATE            NOT NULL,
    ketQua      NVARCHAR(50)    NULL,
    maDaiDien   NVARCHAR(20)    NOT NULL,
    maSV        NVARCHAR(20)    NOT NULL,
    CONSTRAINT PK_PHONGVAN PRIMARY KEY (maPV),
    CONSTRAINT FK_PV_DAIDIENDOANHNGHIEP FOREIGN KEY (maDaiDien) REFERENCES DAIDIENDOANHNGHIEP(maSo),
    CONSTRAINT FK_PV_SINHVIEN           FOREIGN KEY (maSV)      REFERENCES SINHVIEN(maSV),
    CONSTRAINT CK_PV_KETQUA             CHECK (ketQua IN (N'Dat', N'KhongDat', N'ChuaCoKetQua', NULL))
);
GO

-- ============================================================
-- BẢNG 11: DANGKYTHUCTAP
-- Lưu nguyện vọng đăng ký thực tập của sinh viên
-- ============================================================
CREATE TABLE DANGKYTHUCTAP (
    maDK            NVARCHAR(20)    NOT NULL,
    ngayDangKy      DATE            NOT NULL,
    thuTuUuTien     INT             NOT NULL DEFAULT 1,
    trangThai       NVARCHAR(50)    NOT NULL DEFAULT N'ChoDuyet',
    maSV            NVARCHAR(20)    NOT NULL,
    maCongTy        NVARCHAR(20)    NOT NULL,
    maDot           NVARCHAR(20)    NOT NULL,
    CONSTRAINT PK_DANGKYTHUCTAP PRIMARY KEY (maDK),
    CONSTRAINT FK_DKTT_SINHVIEN   FOREIGN KEY (maSV)     REFERENCES SINHVIEN(maSV),
    CONSTRAINT FK_DKTT_CONGTY     FOREIGN KEY (maCongTy) REFERENCES CONGTY(maCongTy),
    CONSTRAINT FK_DKTT_DOTTHUCTAP FOREIGN KEY (maDot)    REFERENCES DOTTHUCTAP(maSo),
    CONSTRAINT CK_DKTT_TRANGTHAI  CHECK (trangThai IN (N'ChoDuyet', N'DaDuyet', N'TuChoi')),
    CONSTRAINT CK_DKTT_UUTIEN     CHECK (thuTuUuTien >= 1),
    CONSTRAINT UQ_DKTT_SV_CT_DOT  UNIQUE (maSV, maCongTy, maDot)
);
GO

-- ============================================================
-- BẢNG 12: PHANBOTHUCTAP
-- Lưu kết quả phân bổ chính thức sinh viên vào công ty
-- ============================================================
CREATE TABLE PHANBOTHUCTAP (
    maPB        NVARCHAR(20)    NOT NULL,
    ngayPhanBo  DATE            NOT NULL,
    trangThai   NVARCHAR(50)    NOT NULL DEFAULT N'ChuaNhanViec',
    maDot       NVARCHAR(20)    NOT NULL,
    maCongTy    NVARCHAR(20)    NOT NULL,
    maSV        NVARCHAR(20)    NOT NULL,
    CONSTRAINT PK_PHANBOTHUCTAP PRIMARY KEY (maPB),
    CONSTRAINT FK_PBTT_DOTTHUCTAP FOREIGN KEY (maDot)    REFERENCES DOTTHUCTAP(maSo),
    CONSTRAINT FK_PBTT_CONGTY     FOREIGN KEY (maCongTy) REFERENCES CONGTY(maCongTy),
    CONSTRAINT FK_PBTT_SINHVIEN   FOREIGN KEY (maSV)     REFERENCES SINHVIEN(maSV),
    CONSTRAINT CK_PBTT_TRANGTHAI  CHECK (trangThai IN (N'ChuaNhanViec', N'DangThucTap', N'HoanThanh', N'Huy'))
);
GO

-- ============================================================
-- BẢNG 8: HUONGDANDOANHNGHIEP
-- Ghi nhận đại diện doanh nghiệp hướng dẫn sinh viên
-- (liên kết qua phân bổ thực tập)
-- ============================================================
CREATE TABLE HUONGDANDOANHNGHIEP (
    maSo        NVARCHAR(20)    NOT NULL,
    ngayBD      DATE            NOT NULL,
    vaiTro      NVARCHAR(100)   NULL,
    danhGia     NVARCHAR(MAX)   NULL,
    maPB        NVARCHAR(20)    NOT NULL,
    maDaiDien   NVARCHAR(20)    NOT NULL,
    CONSTRAINT PK_HUONGDANDOANHNGHIEP PRIMARY KEY (maSo),
    CONSTRAINT FK_HDDN_PHANBOTHUCTAP    FOREIGN KEY (maPB)      REFERENCES PHANBOTHUCTAP(maPB),
    CONSTRAINT FK_HDDN_DAIDIENDOANHNGHIEP FOREIGN KEY (maDaiDien) REFERENCES DAIDIENDOANHNGHIEP(maSo)
);
GO

-- ============================================================
-- BẢNG 13: TIENDOTHUCTAP
-- Theo dõi các mốc tiến độ/báo cáo của sinh viên trong đợt TT
-- ============================================================
CREATE TABLE TIENDOTHUCTAP (
    maTienDo        NVARCHAR(20)    NOT NULL,
    mocThoiGian     DATE            NOT NULL,
    noiDungBaoCao   NVARCHAR(MAX)   NULL,
    ngayNop         DATE            NULL,
    trangThaiDuyet  NVARCHAR(50)    NOT NULL DEFAULT N'ChuaNop',
    maDot           NVARCHAR(20)    NOT NULL,
    maSV            NVARCHAR(20)    NOT NULL,
    CONSTRAINT PK_TIENDOTHUCTAP PRIMARY KEY (maTienDo),
    CONSTRAINT FK_TDTT_DOTTHUCTAP FOREIGN KEY (maDot) REFERENCES DOTTHUCTAP(maSo),
    CONSTRAINT FK_TDTT_SINHVIEN   FOREIGN KEY (maSV)  REFERENCES SINHVIEN(maSV),
    CONSTRAINT CK_TDTT_TRANGTHAI  CHECK (trangThaiDuyet IN (N'ChuaNop', N'DaNop', N'DaDuyet', N'YeuCauSua'))
);
GO

-- ============================================================
-- BẢNG 15: TIEUCHI
-- Danh sách tiêu chí chấm điểm (CLO) thực tập
-- ============================================================
CREATE TABLE TIEUCHI (
    maTieuChi   NVARCHAR(20)    NOT NULL,
    tenTieuChi  NVARCHAR(200)   NOT NULL,
    diemToiDa   DECIMAL(5,2)    NOT NULL DEFAULT 10,
    CONSTRAINT PK_TIEUCHI PRIMARY KEY (maTieuChi),
    CONSTRAINT CK_TIEUCHI_DIEM CHECK (diemToiDa > 0)
);
GO

-- ============================================================
-- BẢNG 14: PHIEUCHAMDIEM
-- Phiếu chấm điểm tổng hợp của một sinh viên trong đợt TT
-- ============================================================
CREATE TABLE PHIEUCHAMDIEM (
    maPhieu         NVARCHAR(20)    NOT NULL,
    tongDiem        DECIMAL(5,2)    NULL,
    ngayCham        DATE            NULL,
    maDot           NVARCHAR(20)    NOT NULL,
    maSV            NVARCHAR(20)    NOT NULL,
    maHuongDanDN    NVARCHAR(20)    NULL,   -- Đại diện DN chấm điểm
    maGVHuongDan    NVARCHAR(20)    NULL,   -- GV hướng dẫn chấm điểm
    CONSTRAINT PK_PHIEUCHAMDIEM PRIMARY KEY (maPhieu),
    CONSTRAINT UQ_PCD_SV_DOT    UNIQUE (maSV, maDot),
    CONSTRAINT FK_PCD_DOTTHUCTAP        FOREIGN KEY (maDot)          REFERENCES DOTTHUCTAP(maSo),
    CONSTRAINT FK_PCD_SINHVIEN          FOREIGN KEY (maSV)           REFERENCES SINHVIEN(maSV),
    CONSTRAINT FK_PCD_DAIDIENDOANHNGHIEP FOREIGN KEY (maHuongDanDN)  REFERENCES DAIDIENDOANHNGHIEP(maSo),
    CONSTRAINT FK_PCD_GVHUONGDAN        FOREIGN KEY (maGVHuongDan)   REFERENCES GVHUONGDAN(maSo)
);
GO

-- ============================================================
-- BẢNG 16: CHITIETCHAMDIEM
-- Chi tiết điểm theo từng tiêu chí của một phiếu chấm
-- ============================================================
CREATE TABLE CHITIETCHAMDIEM (
    maSo        NVARCHAR(20)    NOT NULL,
    diemCham    DECIMAL(5,2)    NOT NULL,
    maPhieu     NVARCHAR(20)    NOT NULL,
    maTieuChi   NVARCHAR(20)    NOT NULL,
    CONSTRAINT PK_CHITIETCHAMDIEM PRIMARY KEY (maSo),
    CONSTRAINT FK_CTCD_PHIEUCHAMDIEM FOREIGN KEY (maPhieu)   REFERENCES PHIEUCHAMDIEM(maPhieu),
    CONSTRAINT FK_CTCD_TIEUCHI      FOREIGN KEY (maTieuChi) REFERENCES TIEUCHI(maTieuChi),
    CONSTRAINT CK_CTCD_DIEM         CHECK (diemCham >= 0),
    CONSTRAINT UQ_CTCD_PHIEU_TC     UNIQUE (maPhieu, maTieuChi)
);
GO

-- ============================================================
-- BẢNG 17: GIOITHIEU
-- Ghi nhận quan hệ giảng viên giới thiệu công ty thực tập
-- ============================================================
CREATE TABLE GIOITHIEU (
    maSo                NVARCHAR(20)    NOT NULL,
    ngayGioiThieu       DATE            NOT NULL,
    trangThaiKetNoi     NVARCHAR(50)    NOT NULL DEFAULT N'DangXem',
    maCongTy            NVARCHAR(20)    NOT NULL,
    maGV                NVARCHAR(20)    NOT NULL,
    CONSTRAINT PK_GIOITHIEU PRIMARY KEY (maSo),
    CONSTRAINT FK_GT_CONGTY    FOREIGN KEY (maCongTy) REFERENCES CONGTY(maCongTy),
    CONSTRAINT FK_GT_GIANGVIEN FOREIGN KEY (maGV)     REFERENCES GIANGVIEN(maGV),
    CONSTRAINT CK_GT_TRANGTHAI CHECK (trangThaiKetNoi IN (N'DangXem', N'DaDuyet', N'TuChoi'))
);
GO

-- ============================================================
-- BẢNG 19: TAIKHOAN
-- Quản lý tài khoản đăng nhập và phân quyền người dùng
-- ============================================================
CREATE TABLE TAIKHOAN (
    maTaiKhoan  NVARCHAR(20)    NOT NULL,
    tenDangNhap NVARCHAR(100)   NOT NULL,
    matKhau     NVARCHAR(500)   NOT NULL,   -- Lưu hash (bcrypt/SHA-256)
    trangThai   NVARCHAR(50)    NOT NULL DEFAULT N'HoatDong',
    maVaiTro    NVARCHAR(20)    NOT NULL,
    maSV        NVARCHAR(20)    NULL,
    maGV        NVARCHAR(20)    NULL,
    maDaiDien   NVARCHAR(20)    NULL,
    CONSTRAINT PK_TAIKHOAN         PRIMARY KEY (maTaiKhoan),
    CONSTRAINT UQ_TAIKHOAN_LOGIN    UNIQUE (tenDangNhap),
    CONSTRAINT FK_TK_VAITRO         FOREIGN KEY (maVaiTro)   REFERENCES VAITRO(maVaiTro),
    CONSTRAINT FK_TK_SINHVIEN       FOREIGN KEY (maSV)       REFERENCES SINHVIEN(maSV),
    CONSTRAINT FK_TK_GIANGVIEN      FOREIGN KEY (maGV)       REFERENCES GIANGVIEN(maGV),
    CONSTRAINT FK_TK_DAIDIENDOANHNGHIEP FOREIGN KEY (maDaiDien) REFERENCES DAIDIENDOANHNGHIEP(maSo),
    CONSTRAINT CK_TK_TRANGTHAI      CHECK (trangThai IN (N'HoatDong', N'BiKhoa', N'ChuaKichHoat')),
    -- Mỗi tài khoản gắn tối đa 1 chủ sở hữu (tài khoản Quản trị/Khoa không gắn ai)
    CONSTRAINT CK_TK_CHUSOHUU       CHECK ((CASE WHEN maSV IS NULL THEN 0 ELSE 1 END
                                          + CASE WHEN maGV IS NULL THEN 0 ELSE 1 END
                                          + CASE WHEN maDaiDien IS NULL THEN 0 ELSE 1 END) <= 1)
);
GO

CREATE TABLE THONGBAO (
    maThongBao NVARCHAR(20) NOT NULL PRIMARY KEY,
    tieuDe NVARCHAR(200) NOT NULL,
    noiDung NVARCHAR(MAX) NOT NULL,
    ngayTao DATETIME2 NOT NULL,
    maNguoiGui NVARCHAR(20) NULL
);
GO

-- ============================================================
-- TẠO INDEX HỖ TRỢ TRUY VẤN PHỔ BIẾN
-- ============================================================

-- Tìm kiếm sinh viên theo lớp, chuyên ngành
CREATE INDEX IDX_SINHVIEN_LOP        ON SINHVIEN(lop);
CREATE INDEX IDX_SINHVIEN_CHUYENNGANH ON SINHVIEN(chuyenNganh);

-- Tìm kiếm công ty theo trạng thái
CREATE INDEX IDX_CONGTY_TRANGTHAI    ON CONGTY(trangThai);

-- Đăng ký thực tập theo đợt và sinh viên
CREATE INDEX IDX_DKTT_MADOT          ON DANGKYTHUCTAP(maDot);
CREATE INDEX IDX_DKTT_MASV           ON DANGKYTHUCTAP(maSV);

-- Phân bổ thực tập
CREATE INDEX IDX_PBTT_MASV           ON PHANBOTHUCTAP(maSV);
CREATE INDEX IDX_PBTT_MADOT          ON PHANBOTHUCTAP(maDot);
-- Mỗi sinh viên chỉ có 1 phân bổ còn hiệu lực trong 1 đợt
CREATE UNIQUE INDEX UQ_PBTT_SV_DOT   ON PHANBOTHUCTAP(maSV, maDot) WHERE trangThai <> N'Huy';

-- Tiến độ theo đợt và sinh viên
CREATE INDEX IDX_TDTT_MASV_MADOT     ON TIENDOTHUCTAP(maSV, maDot);

-- Phiếu chấm điểm
CREATE INDEX IDX_PCD_MASV_MADOT      ON PHIEUCHAMDIEM(maSV, maDot);

GO

-- ============================================================
-- TRIGGER: điểm chấm không vượt điểm tối đa của tiêu chí
-- ============================================================
CREATE OR ALTER TRIGGER trg_CTCD_KiemTraDiem ON CHITIETCHAMDIEM
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i
               JOIN TIEUCHI t ON t.maTieuChi = i.maTieuChi
               WHERE i.diemCham > t.diemToiDa)
    BEGIN
        RAISERROR(N'Điểm chấm vượt quá điểm tối đa của tiêu chí.', 16, 1);
        ROLLBACK TRANSACTION;
    END
END;
GO

-- ============================================================
-- TRIGGER: tự cập nhật GIANGVIEN.soLuongSVHD
-- (đếm số phân công đang ở trạng thái DangHuongDan)
-- ============================================================
CREATE OR ALTER TRIGGER trg_GVHD_CapNhatSoLuong ON GVHUONGDAN
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE g
    SET soLuongSVHD = (SELECT COUNT(*) FROM GVHUONGDAN h
                       WHERE h.maGV = g.maGV AND h.trangThai = N'DangHuongDan')
    FROM GIANGVIEN g
    WHERE g.maGV IN (SELECT maGV FROM inserted UNION SELECT maGV FROM deleted);
END;
GO

-- ============================================================
-- DỮ LIỆU MẪU (Seed Data)
-- 2 đợt: DOT01 (đã kết thúc, SV001-SV003 có điểm) và DOT02 (đang diễn ra, SV004-SV010)
-- ============================================================

-- 1. Vai trò hệ thống
INSERT INTO VAITRO (maVaiTro, tenVaiTro, moTa) VALUES
    ('VT01', N'QuanTriVien',    N'Quản trị toàn bộ hệ thống, tạo tài khoản và phân quyền'),
    ('VT02', N'Khoa',           N'Cán bộ Khoa quản lý đợt thực tập, phân bổ sinh viên'),
    ('VT03', N'GiangVien',      N'Giảng viên hướng dẫn thực tập'),
    ('VT04', N'SinhVien',       N'Sinh viên tham gia thực tập tốt nghiệp'),
    ('VT05', N'DaiDienDN',      N'Đại diện doanh nghiệp tiếp nhận và hướng dẫn sinh viên');
GO

-- 2. Tiêu chí chấm điểm CLO (tổng điểm tối đa = 10)
INSERT INTO TIEUCHI (maTieuChi, tenTieuChi, diemToiDa) VALUES
    ('TC01', N'Thái độ và kỷ luật làm việc',        3.0),
    ('TC02', N'Năng lực chuyên môn và kỹ thuật',    4.0),
    ('TC03', N'Kỹ năng giao tiếp và làm việc nhóm', 2.0),
    ('TC04', N'Báo cáo và tài liệu thực tập',       1.0);
GO

-- 3. Giảng viên (soLuongSVHD sẽ được trigger tự cập nhật)
INSERT INTO GIANGVIEN (maGV, hoTen, chuyenMon, soLuongSVHD) VALUES
    ('GV001', N'Nguyễn Văn An',    N'Công nghệ phần mềm', 0),
    ('GV002', N'Trần Thị Bình',    N'Hệ thống thông tin', 0),
    ('GV003', N'Lê Quốc Cường',    N'Trí tuệ nhân tạo',   0),
    ('GV004', N'Phạm Thị Dung',    N'Phát triển ứng dụng di động', 0),
    ('GV005', N'Hoàng Minh Em',    N'Khoa học dữ liệu',   0);
GO

-- 4. Sinh viên
INSERT INTO SINHVIEN (maSV, hoTen, lop, khoaHoc, gpa, kyNang, chuyenNganh, congNghe, duAnDaThucHien) VALUES
    ('SV001', N'Phạm Minh Đức',   N'CNTT01', N'2022', 3.20, N'Lập trình, Quản lý dự án',        N'Công nghệ thông tin', N'React, Node.js, SQL Server',        N'Hệ thống quản lý bán hàng'),
    ('SV002', N'Nguyễn Thu Hà',   N'CNTT01', N'2022', 3.50, N'Machine Learning, Python',        N'Khoa học dữ liệu',    N'Python, TensorFlow, PostgreSQL',    N'Phân loại ảnh sản phẩm'),
    ('SV003', N'Võ Thanh Huy',    N'CNTT02', N'2022', 2.80, N'Lập trình Web, UI/UX',            N'Công nghệ thông tin', N'Vue.js, PHP, MySQL',                N'Website thương mại điện tử'),
    ('SV004', N'Trần Quốc Bảo',   N'CNTT02', N'2022', 3.10, N'Lập trình Web, Làm việc nhóm',    N'Công nghệ thông tin', N'React, Spring Boot, MySQL',         N'Hệ thống quản lý thư viện'),
    ('SV005', N'Lê Ngọc Ánh',     N'CNTT01', N'2022', 3.40, N'Phát triển di động, UI/UX',       N'Công nghệ thông tin', N'Flutter, Firebase',                 N'Ứng dụng đặt lịch khám bệnh'),
    ('SV006', N'Đặng Hoàng Nam',  N'KHDL01', N'2022', 3.60, N'Machine Learning, Phân tích dữ liệu', N'Khoa học dữ liệu', N'Python, PyTorch, SQL Server',       N'Hệ thống gợi ý sản phẩm'),
    ('SV007', N'Bùi Thị Mai',     N'CNTT03', N'2022', 2.90, N'Lập trình Backend, REST API',     N'Công nghệ thông tin', N'Java, Spring Boot, PostgreSQL',     N'API quản lý đơn hàng'),
    ('SV008', N'Hoàng Gia Khang', N'CNTT03', N'2022', 3.00, N'Lập trình Backend, Docker',       N'Công nghệ thông tin', N'Node.js, MongoDB, Docker',          N'Hệ thống chat thời gian thực'),
    ('SV009', N'Ngô Thanh Tâm',   N'CNTT02', N'2022', 3.30, N'Phát triển di động, Kotlin',      N'Công nghệ thông tin', N'Kotlin, Android, SQLite',           N'Ứng dụng quản lý chi tiêu'),
    ('SV010', N'Phan Anh Tuấn',   N'KHDL01', N'2022', 3.70, N'Data Engineering, ETL',           N'Khoa học dữ liệu',    N'Python, Airflow, SQL Server',       N'Data warehouse bán lẻ');
GO

-- 5. Công ty (CT006 đang chờ duyệt)
INSERT INTO CONGTY (maCongTy, tenCongTy, viTriTuyen, thoiGian, soLuongNhan, yeuCau, trangThai) VALUES
    ('CT001', N'Công ty TNHH FPT Software',            N'Lập trình viên Web Fullstack', N'Từ 14/09/2026 đến 25/12/2026', 5, N'Biết React/Node.js, có kinh nghiệm làm dự án nhóm, GPA >= 2.5', N'DaDuyet'),
    ('CT002', N'Công ty CP VNG Corporation',           N'Kỹ sư AI/ML',                  N'Từ 14/09/2026 đến 25/12/2026', 3, N'Biết Python, Machine Learning cơ bản, GPA >= 3.0',             N'DaDuyet'),
    ('CT003', N'Công ty TNHH Tiki',                    N'Lập trình viên Backend',       N'Từ 14/09/2026 đến 25/12/2026', 4, N'Biết Java hoặc PHP, hiểu RESTful API, GPA >= 2.8',            N'DaDuyet'),
    ('CT004', N'Công ty CP Công nghệ Sao Việt',        N'Lập trình viên Mobile',        N'Từ 14/09/2026 đến 25/12/2026', 3, N'Biết Flutter hoặc Kotlin, GPA >= 2.8',                        N'DaDuyet'),
    ('CT005', N'Công ty TNHH Dữ liệu Lạc Việt',        N'Kỹ sư dữ liệu',                N'Từ 14/09/2026 đến 25/12/2026', 2, N'Biết SQL, Python, hiểu ETL, GPA >= 3.0',                      N'DaDuyet'),
    ('CT006', N'Công ty TNHH Giải pháp Phần mềm ABC',  N'Kiểm thử phần mềm',            N'Từ 14/09/2026 đến 25/12/2026', 2, N'Hiểu quy trình kiểm thử, GPA >= 2.5',                         N'ChoDuyet');
GO

-- 6. Đại diện doanh nghiệp
INSERT INTO DAIDIENDOANHNGHIEP (maSo, hoTen, chucVu, email, thongTinLienHe, maCongTy) VALUES
    ('DD001', N'Nguyễn Hoàng Long', N'Team Leader',      'long.nguyen@ct001.example.com', N'SĐT: 0901 000 001', 'CT001'),
    ('DD002', N'Trần Thị Thu',      N'Senior Developer', 'thu.tran@ct001.example.com',    N'SĐT: 0901 000 002', 'CT001'),
    ('DD003', N'Lê Minh Quân',      N'AI Team Lead',     'quan.le@ct002.example.com',     N'SĐT: 0901 000 003', 'CT002'),
    ('DD004', N'Phạm Thanh Sơn',    N'Backend Lead',     'son.pham@ct003.example.com',    N'SĐT: 0901 000 004', 'CT003'),
    ('DD005', N'Võ Thị Lan',        N'Mobile Lead',      'lan.vo@ct004.example.com',      N'SĐT: 0901 000 005', 'CT004'),
    ('DD006', N'Đỗ Văn Hải',        N'Data Manager',     'hai.do@ct005.example.com',      N'SĐT: 0901 000 006', 'CT005'),
    ('DD007', N'Huỳnh Kim Ngân',    N'QA Manager',       'ngan.huynh@ct006.example.com',  N'SĐT: 0901 000 007', 'CT006');
GO

-- 7. Đợt thực tập
INSERT INTO DOTTHUCTAP (maSo, tenDot, namHoc, thoiGianBD, thoiGianKT, trangThai) VALUES
    ('DOT01', N'Thực tập tốt nghiệp đợt 1 năm 2026', N'2025-2026', '2026-02-02', '2026-05-15', N'DaKetThuc'),
    ('DOT02', N'Thực tập tốt nghiệp đợt 2 năm 2026', N'2026-2027', '2026-09-14', '2026-12-25', N'DangDienRa');
GO

-- 8. Hồ sơ năng lực (embeddingHoSo để NULL, sẽ do mô hình ML sinh ra)
INSERT INTO HOSONANGLUC (maHoSo, NDHoSo, ngayCapNhat, maSV) VALUES
    ('HS001', N'Thành thạo React và Node.js, đã làm hệ thống quản lý bán hàng, mong muốn thực tập Web Fullstack.', '2026-01-05', 'SV001'),
    ('HS002', N'Nền tảng Python và Machine Learning, đã làm đề tài phân loại ảnh sản phẩm, mong muốn thực tập AI/ML.', '2026-01-05', 'SV002'),
    ('HS003', N'Lập trình Web với Vue.js và PHP, có kinh nghiệm thiết kế UI/UX, mong muốn thực tập Backend.', '2026-01-06', 'SV003'),
    ('HS004', N'Lập trình Web với React và Spring Boot, làm việc nhóm tốt, mong muốn thực tập Fullstack.', '2026-08-18', 'SV004'),
    ('HS005', N'Phát triển ứng dụng di động Flutter, đã làm app đặt lịch khám bệnh, mong muốn thực tập Mobile.', '2026-08-18', 'SV005'),
    ('HS006', N'Machine Learning và hệ thống gợi ý với PyTorch, mong muốn thực tập AI/ML.', '2026-08-19', 'SV006'),
    ('HS007', N'Lập trình Backend Java Spring Boot, đã xây dựng API quản lý đơn hàng, mong muốn thực tập Backend.', '2026-08-19', 'SV007'),
    ('HS008', N'Backend Node.js và Docker, đã làm hệ thống chat thời gian thực, mong muốn thực tập Backend.', '2026-08-19', 'SV008'),
    ('HS009', N'Phát triển Android với Kotlin, đã làm ứng dụng quản lý chi tiêu, mong muốn thực tập Mobile.', '2026-08-20', 'SV009'),
    ('HS010', N'Data Engineering với Airflow và SQL Server, đã làm data warehouse bán lẻ, mong muốn thực tập Dữ liệu.', '2026-08-20', 'SV010');
GO

-- 9. Gợi ý công ty từ mô hình ML
INSERT INTO GOIYCONGTY (maSo, tyLeTuongThich, ngayGoiY, maHoSo, maCongTy) VALUES
    ('GY001', 92.50, '2026-01-08', 'HS001', 'CT001'),
    ('GY002', 95.00, '2026-01-08', 'HS002', 'CT002'),
    ('GY003', 84.00, '2026-01-08', 'HS003', 'CT003'),
    ('GY004', 88.50, '2026-08-21', 'HS004', 'CT001'),
    ('GY005', 81.00, '2026-08-21', 'HS005', 'CT001'),
    ('GY006', 93.50, '2026-08-21', 'HS006', 'CT002'),
    ('GY007', 79.50, '2026-08-21', 'HS007', 'CT003'),
    ('GY008', 90.00, '2026-08-21', 'HS009', 'CT004'),
    ('GY009', 91.50, '2026-08-21', 'HS010', 'CT005'),
    ('GY010', 86.00, '2026-08-21', 'HS010', 'CT002');
GO

-- 10. Giảng viên giới thiệu công ty
INSERT INTO GIOITHIEU (maSo, ngayGioiThieu, trangThaiKetNoi, maCongTy, maGV) VALUES
    ('GT001', '2026-01-10', N'DaDuyet', 'CT001', 'GV001'),
    ('GT002', '2026-01-10', N'DaDuyet', 'CT002', 'GV003'),
    ('GT003', '2026-08-10', N'DaDuyet', 'CT004', 'GV004'),
    ('GT004', '2026-08-12', N'DangXem', 'CT006', 'GV002');
GO

-- 11. Phân công giảng viên hướng dẫn (trigger sẽ cập nhật GIANGVIEN.soLuongSVHD)
INSERT INTO GVHUONGDAN (maSo, ngayPC, trangThai, maGV, maSV) VALUES
    ('PC001', '2026-02-02', N'HoanThanh',    'GV001', 'SV001'),
    ('PC002', '2026-02-02', N'HoanThanh',    'GV002', 'SV002'),
    ('PC003', '2026-02-02', N'HoanThanh',    'GV003', 'SV003'),
    ('PC004', '2026-09-14', N'DangHuongDan', 'GV001', 'SV004'),
    ('PC005', '2026-09-14', N'DangHuongDan', 'GV001', 'SV005'),
    ('PC006', '2026-09-14', N'DangHuongDan', 'GV002', 'SV006'),
    ('PC007', '2026-09-14', N'DangHuongDan', 'GV002', 'SV007'),
    ('PC008', '2026-09-14', N'DangHuongDan', 'GV003', 'SV008'),
    ('PC009', '2026-09-14', N'DangHuongDan', 'GV004', 'SV009'),
    ('PC010', '2026-09-14', N'DangHuongDan', 'GV005', 'SV010');
GO

-- 12. Đăng ký thực tập (nguyện vọng 1 được duyệt thì được phân bổ)
INSERT INTO DANGKYTHUCTAP (maDK, ngayDangKy, thuTuUuTien, trangThai, maSV, maCongTy, maDot) VALUES
    ('DK001', '2026-01-12', 1, N'DaDuyet', 'SV001', 'CT001', 'DOT01'),
    ('DK002', '2026-01-12', 2, N'TuChoi', 'SV001', 'CT003', 'DOT01'),
    ('DK003', '2026-01-12', 1, N'DaDuyet', 'SV002', 'CT002', 'DOT01'),
    ('DK004', '2026-01-13', 1, N'DaDuyet', 'SV003', 'CT003', 'DOT01'),
    ('DK005', '2026-08-24', 1, N'DaDuyet', 'SV004', 'CT001', 'DOT02'),
    ('DK006', '2026-08-24', 1, N'DaDuyet', 'SV005', 'CT001', 'DOT02'),
    ('DK007', '2026-08-24', 2, N'TuChoi', 'SV005', 'CT004', 'DOT02'),
    ('DK008', '2026-08-25', 1, N'DaDuyet', 'SV006', 'CT002', 'DOT02'),
    ('DK009', '2026-08-25', 1, N'DaDuyet', 'SV007', 'CT003', 'DOT02'),
    ('DK010', '2026-08-25', 1, N'DaDuyet', 'SV008', 'CT003', 'DOT02'),
    ('DK011', '2026-08-25', 2, N'ChoDuyet', 'SV008', 'CT001', 'DOT02'),
    ('DK012', '2026-08-26', 1, N'DaDuyet', 'SV009', 'CT004', 'DOT02'),
    ('DK013', '2026-08-26', 1, N'DaDuyet', 'SV010', 'CT005', 'DOT02'),
    ('DK014', '2026-08-26', 2, N'TuChoi', 'SV010', 'CT002', 'DOT02');
GO

-- 13. Phân bổ thực tập
INSERT INTO PHANBOTHUCTAP (maPB, ngayPhanBo, trangThai, maDot, maCongTy, maSV) VALUES
    ('PB001', '2026-01-25', N'HoanThanh',  'DOT01', 'CT001', 'SV001'),
    ('PB002', '2026-01-25', N'HoanThanh',  'DOT01', 'CT002', 'SV002'),
    ('PB003', '2026-01-25', N'HoanThanh',  'DOT01', 'CT003', 'SV003'),
    ('PB004', '2026-09-05', N'DangThucTap','DOT02', 'CT001', 'SV004'),
    ('PB005', '2026-09-05', N'DangThucTap','DOT02', 'CT001', 'SV005'),
    ('PB006', '2026-09-05', N'DangThucTap','DOT02', 'CT002', 'SV006'),
    ('PB007', '2026-09-05', N'DangThucTap','DOT02', 'CT003', 'SV007'),
    ('PB008', '2026-09-05', N'DangThucTap','DOT02', 'CT003', 'SV008'),
    ('PB009', '2026-09-05', N'DangThucTap','DOT02', 'CT004', 'SV009'),
    ('PB010', '2026-09-05', N'DangThucTap','DOT02', 'CT005', 'SV010');
GO

-- 14. Đại diện doanh nghiệp hướng dẫn sinh viên
INSERT INTO HUONGDANDOANHNGHIEP (maSo, ngayBD, vaiTro, danhGia, maPB, maDaiDien) VALUES
    ('HD001', '2026-02-02', N'Hướng dẫn chính', N'Hoàn thành tốt công việc, chủ động học hỏi.',          'PB001', 'DD001'),
    ('HD002', '2026-02-02', N'Hướng dẫn chính', N'Nắm vững kiến thức ML, hoàn thành đúng hạn.',          'PB002', 'DD003'),
    ('HD003', '2026-02-02', N'Hướng dẫn chính', N'Hoàn thành công việc, cần cải thiện kỹ năng báo cáo.', 'PB003', 'DD004'),
    ('HD004', '2026-09-14', N'Hướng dẫn chính', NULL, 'PB004', 'DD001'),
    ('HD005', '2026-09-14', N'Hướng dẫn chính', NULL, 'PB005', 'DD002'),
    ('HD006', '2026-09-14', N'Hướng dẫn chính', NULL, 'PB006', 'DD003'),
    ('HD007', '2026-09-14', N'Hướng dẫn chính', NULL, 'PB007', 'DD004'),
    ('HD008', '2026-09-14', N'Hướng dẫn chính', NULL, 'PB008', 'DD004'),
    ('HD009', '2026-09-14', N'Hướng dẫn chính', NULL, 'PB009', 'DD005'),
    ('HD010', '2026-09-14', N'Hướng dẫn chính', NULL, 'PB010', 'DD006');
GO

-- 15. Phỏng vấn
INSERT INTO PHONGVAN (maPV, hinhThuc, ngayPV, ketQua, maDaiDien, maSV) VALUES
    ('PV001', N'Trực tuyến', '2026-01-18', N'Dat',      'DD001', 'SV001'),
    ('PV002', N'Trực tiếp',  '2026-01-18', N'Dat',      'DD003', 'SV002'),
    ('PV003', N'Trực tuyến', '2026-01-19', N'Dat',      'DD004', 'SV003'),
    ('PV004', N'Trực tuyến', '2026-08-28', N'Dat',      'DD001', 'SV004'),
    ('PV005', N'Trực tiếp',  '2026-08-28', N'Dat',      'DD002', 'SV005'),
    ('PV006', N'Trực tuyến', '2026-08-29', N'Dat',      'DD003', 'SV006'),
    ('PV007', N'Trực tuyến', '2026-08-29', N'Dat',      'DD004', 'SV007'),
    ('PV008', N'Trực tiếp',  '2026-08-30', N'Dat',      'DD004', 'SV008'),
    ('PV009', N'Trực tiếp',  '2026-08-30', N'Dat',      'DD005', 'SV009'),
    ('PV010', N'Trực tuyến', '2026-08-31', N'Dat',      'DD006', 'SV010'),
    ('PV011', N'Trực tuyến', '2026-08-31', N'KhongDat', 'DD003', 'SV010');
GO

-- 16. Tiến độ thực tập
INSERT INTO TIENDOTHUCTAP (maTienDo, mocThoiGian, noiDungBaoCao, ngayNop, trangThaiDuyet, maDot, maSV) VALUES
    ('TD001', '2026-03-02', N'Báo cáo tuần 1-4: làm quen dự án và môi trường làm việc.', '2026-03-01', N'DaDuyet', 'DOT01', 'SV001'),
    ('TD002', '2026-05-10', N'Báo cáo tổng kết thực tập.',                              '2026-05-09', N'DaDuyet', 'DOT01', 'SV001'),
    ('TD003', '2026-03-02', N'Báo cáo tuần 1-4: chuẩn bị dữ liệu và huấn luyện mô hình.', '2026-03-02', N'DaDuyet', 'DOT01', 'SV002'),
    ('TD004', '2026-05-10', N'Báo cáo tổng kết thực tập.',                              '2026-05-10', N'DaDuyet', 'DOT01', 'SV002'),
    ('TD005', '2026-03-02', N'Báo cáo tuần 1-4: xây dựng API cho hệ thống nội bộ.',      '2026-03-03', N'DaDuyet', 'DOT01', 'SV003'),
    ('TD006', '2026-05-10', N'Báo cáo tổng kết thực tập.',                              '2026-05-09', N'DaDuyet', 'DOT01', 'SV003'),
    ('TD007', '2026-09-30', N'Báo cáo tuần 1-2: tìm hiểu quy trình và công nghệ của công ty.', '2026-09-28', N'DaDuyet',  'DOT02', 'SV004'),
    ('TD008', '2026-09-30', N'Báo cáo tuần 1-2: cài đặt môi trường, nhận task đầu tiên.',      '2026-09-29', N'DaNop',    'DOT02', 'SV005'),
    ('TD009', '2026-09-30', N'Báo cáo tuần 1-2: tìm hiểu bộ dữ liệu của dự án.',               '2026-09-30', N'YeuCauSua','DOT02', 'SV006'),
    ('TD010', '2026-09-30', N'Báo cáo tuần 1-2: đọc tài liệu hệ thống backend.',               '2026-09-29', N'DaDuyet',  'DOT02', 'SV007'),
    ('TD011', '2026-09-30', NULL,                                                              NULL,         N'ChuaNop',  'DOT02', 'SV008'),
    ('TD012', '2026-09-30', N'Báo cáo tuần 1-2: làm quen codebase ứng dụng di động.',          '2026-09-30', N'DaNop',    'DOT02', 'SV009'),
    ('TD013', '2026-09-30', N'Báo cáo tuần 1-2: tìm hiểu pipeline ETL hiện có.',               '2026-09-29', N'DaNop',    'DOT02', 'SV010');
GO

-- 17. Phiếu chấm điểm (DOT01) - tongDiem = tổng điểm chi tiết bên dưới
INSERT INTO PHIEUCHAMDIEM (maPhieu, tongDiem, ngayCham, maDot, maSV, maHuongDanDN, maGVHuongDan) VALUES
    ('PCD001', 8.50, '2026-05-25', 'DOT01', 'SV001', 'DD001', 'PC001'),
    ('PCD002', 9.10, '2026-05-25', 'DOT01', 'SV002', 'DD003', 'PC002'),
    ('PCD003', 7.30, '2026-05-26', 'DOT01', 'SV003', 'DD004', 'PC003');
GO

-- 18. Chi tiết chấm điểm (trigger kiểm tra không vượt điểm tối đa của tiêu chí)
INSERT INTO CHITIETCHAMDIEM (maSo, diemCham, maPhieu, maTieuChi) VALUES
    ('CD001', 2.50, 'PCD001', 'TC01'), ('CD002', 3.50, 'PCD001', 'TC02'),
    ('CD003', 1.50, 'PCD001', 'TC03'), ('CD004', 1.00, 'PCD001', 'TC04'),
    ('CD005', 2.80, 'PCD002', 'TC01'), ('CD006', 3.60, 'PCD002', 'TC02'),
    ('CD007', 1.80, 'PCD002', 'TC03'), ('CD008', 0.90, 'PCD002', 'TC04'),
    ('CD009', 2.00, 'PCD003', 'TC01'), ('CD010', 3.00, 'PCD003', 'TC02'),
    ('CD011', 1.50, 'PCD003', 'TC03'), ('CD012', 0.80, 'PCD003', 'TC04');
GO

-- 19. Tài khoản mẫu (matKhau lưu dạng thường '123456', sẽ mã hóa sau bằng script riêng)
INSERT INTO TAIKHOAN (maTaiKhoan, tenDangNhap, matKhau, trangThai, maVaiTro, maSV, maGV, maDaiDien) VALUES
    ('TK001', 'admin', '123456', N'HoatDong', 'VT01', NULL,    NULL,    NULL),
    ('TK002', 'khoa01','123456', N'HoatDong', 'VT02', NULL,    NULL,    NULL),
    ('TK003', 'gv001', '123456', N'HoatDong', 'VT03', NULL,    'GV001', NULL),
    ('TK004', 'gv002', '123456', N'HoatDong', 'VT03', NULL,    'GV002', NULL),
    ('TK005', 'sv001', '123456', N'HoatDong', 'VT04', 'SV001', NULL,    NULL),
    ('TK006', 'sv004', '123456', N'HoatDong', 'VT04', 'SV004', NULL,    NULL),
    ('TK007', 'sv005', '123456', N'HoatDong', 'VT04', 'SV005', NULL,    NULL),
    ('TK008', 'dd001', '123456', N'HoatDong', 'VT05', NULL,    NULL,    'DD001');
GO

-- ============================================================
-- VIEW: Thống kê số lượng sinh viên theo công ty mỗi đợt
-- ============================================================
CREATE OR ALTER VIEW vw_ThongKeSVTheoCongTy AS
SELECT
    d.maSo         AS MaDot,
    d.tenDot       AS TenDot,
    c.maCongTy,
    c.tenCongTy,
    COUNT(pb.maSV) AS SoSinhVien
FROM DOTTHUCTAP d
LEFT JOIN PHANBOTHUCTAP pb ON pb.maDot = d.maSo
LEFT JOIN CONGTY c         ON c.maCongTy = pb.maCongTy
GROUP BY d.maSo, d.tenDot, c.maCongTy, c.tenCongTy;
GO

-- ============================================================
-- VIEW: Kết quả điểm thực tập của sinh viên
-- ============================================================
CREATE OR ALTER VIEW vw_KetQuaDiemThucTap AS
SELECT
    sv.maSV,
    sv.hoTen        AS TenSinhVien,
    sv.lop,
    d.tenDot,
    pcd.tongDiem,
    pcd.ngayCham,
    gv.hoTen        AS GiangVienHuongDan,
    ct.tenCongTy    AS CongTyThucTap
FROM PHIEUCHAMDIEM pcd
JOIN SINHVIEN     sv  ON sv.maSV      = pcd.maSV
JOIN DOTTHUCTAP   d   ON d.maSo       = pcd.maDot
LEFT JOIN GVHUONGDAN gvhd ON gvhd.maSo  = pcd.maGVHuongDan
LEFT JOIN GIANGVIEN  gv   ON gv.maGV    = gvhd.maGV
LEFT JOIN PHANBOTHUCTAP pb ON pb.maSV   = pcd.maSV AND pb.maDot = pcd.maDot
LEFT JOIN CONGTY         ct ON ct.maCongTy = pb.maCongTy;
GO

-- ============================================================
-- VIEW: Tiến độ thực tập của sinh viên
-- ============================================================
CREATE OR ALTER VIEW vw_TienDoThucTap AS
SELECT
    sv.maSV,
    sv.hoTen        AS TenSinhVien,
    d.tenDot,
    td.mocThoiGian,
    td.ngayNop,
    td.trangThaiDuyet,
    ct.tenCongTy
FROM TIENDOTHUCTAP td
JOIN SINHVIEN     sv ON sv.maSV    = td.maSV
JOIN DOTTHUCTAP   d  ON d.maSo     = td.maDot
LEFT JOIN PHANBOTHUCTAP pb ON pb.maSV = td.maSV AND pb.maDot = td.maDot
LEFT JOIN CONGTY        ct ON ct.maCongTy = pb.maCongTy;
GO

-- ============================================================
-- STORED PROCEDURE: Phân bổ sinh viên vào công ty
-- ============================================================
CREATE OR ALTER PROCEDURE sp_PhanBoSinhVien
    @maDot      NVARCHAR(20),
    @maSV       NVARCHAR(20),
    @maCongTy   NVARCHAR(20),
    @ngayPhanBo DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @ngayPhanBo IS NULL
        SET @ngayPhanBo = CAST(GETDATE() AS DATE);

    BEGIN TRANSACTION;

    -- Khóa dòng công ty để tránh phân bổ vượt chỉ tiêu khi chạy đồng thời
    DECLARE @ttCongTy NVARCHAR(50), @soLuongNhan INT;
    SELECT @ttCongTy = trangThai, @soLuongNhan = soLuongNhan
    FROM CONGTY WITH (UPDLOCK, HOLDLOCK)
    WHERE maCongTy = @maCongTy;

    IF @ttCongTy IS NULL
    BEGIN
        RAISERROR(N'Công ty không tồn tại.', 16, 1);
        ROLLBACK TRANSACTION; RETURN;
    END;

    IF @ttCongTy <> N'DaDuyet'
    BEGIN
        RAISERROR(N'Công ty chưa được duyệt nên không thể phân bổ.', 16, 1);
        ROLLBACK TRANSACTION; RETURN;
    END;

    -- Sinh viên chưa được phân bổ (còn hiệu lực) trong đợt này
    IF EXISTS (SELECT 1 FROM PHANBOTHUCTAP
               WHERE maSV = @maSV AND maDot = @maDot AND trangThai <> N'Huy')
    BEGIN
        RAISERROR(N'Sinh viên đã được phân bổ trong đợt thực tập này.', 16, 1);
        ROLLBACK TRANSACTION; RETURN;
    END;

    -- Công ty còn chỉ tiêu trong đợt này (soLuongNhan NULL = không giới hạn)
    IF @soLuongNhan IS NOT NULL
       AND (SELECT COUNT(*) FROM PHANBOTHUCTAP
            WHERE maCongTy = @maCongTy AND maDot = @maDot AND trangThai <> N'Huy') >= @soLuongNhan
    BEGIN
        RAISERROR(N'Công ty đã đủ chỉ tiêu nhận sinh viên trong đợt này.', 16, 1);
        ROLLBACK TRANSACTION; RETURN;
    END;

    DECLARE @maPB NVARCHAR(20) = 'PB' + FORMAT(GETDATE(), 'yyyyMMddHHmmss') +
                                  RIGHT('000' + CAST(ABS(CHECKSUM(NEWID())) % 1000 AS NVARCHAR), 3);

    INSERT INTO PHANBOTHUCTAP (maPB, ngayPhanBo, trangThai, maDot, maCongTy, maSV)
    VALUES (@maPB, @ngayPhanBo, N'ChuaNhanViec', @maDot, @maCongTy, @maSV);

    COMMIT TRANSACTION;

    SELECT @maPB AS MaPhanBoMoi, N'Phân bổ thành công' AS ThongBao;
END;
GO

-- ============================================================
-- STORED PROCEDURE: Tính tổng điểm phiếu chấm điểm
-- ============================================================
CREATE OR ALTER PROCEDURE sp_TinhTongDiem
    @maPhieu NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @tongDiem DECIMAL(5,2);

    SELECT @tongDiem = SUM(ctcd.diemCham)
    FROM CHITIETCHAMDIEM ctcd
    WHERE ctcd.maPhieu = @maPhieu;

    UPDATE PHIEUCHAMDIEM
    SET tongDiem = @tongDiem,
        ngayCham = CAST(GETDATE() AS DATE)
    WHERE maPhieu = @maPhieu;

    SELECT @maPhieu AS MaPhieu, @tongDiem AS TongDiem;
END;
GO

PRINT N'✅ Tạo cơ sở dữ liệu QuanLyThucTap thành công!';
PRINT N'✅ Đã tạo 19 bảng, index, trigger, view, stored procedure và dữ liệu mẫu.';
GO
""";
}
