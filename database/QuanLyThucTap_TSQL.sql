-- ============================================================
-- HỆ THỐNG QUẢN LÝ THỰC TẬP TỐT NGHIỆP
-- T-SQL Script - Tạo Cơ Sở Dữ Liệu
-- ============================================================

USE master;
GO

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
IF OBJECT_ID('THONGBAO',           'U') IS NOT NULL DROP TABLE THONGBAO;
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
IF OBJECT_ID('THANGDIEM',           'U') IS NOT NULL DROP TABLE THANGDIEM;
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
    chiTieuHD       INT             NOT NULL DEFAULT 10,
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
    maSVDeXuat          NVARCHAR(20)    NULL,   -- SV tự đề xuất doanh nghiệp (NULL = Khoa/GV đưa vào)
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
    maRubric        NVARCHAR(40)    NOT NULL DEFAULT 'CNTT_CLO_V1',
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
    FileCV          NVARCHAR(500)   NULL,
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
    ngayPV      DATETIME2(0)    NOT NULL,   -- ngày + giờ phỏng vấn
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
    nhanXet         NVARCHAR(1000)  NULL,
    nhanXetGV       NVARCHAR(500)   NULL,  
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
-- nhomDanhGia: 'GV' = giảng viên hướng dẫn chấm, 'DN' = đơn vị thực tập chấm
--              (Phiếu nhận xét), NULL = tiêu chí cũ không còn sử dụng.
-- ============================================================
CREATE TABLE TIEUCHI (
    maTieuChi   NVARCHAR(20)    NOT NULL,
    tenTieuChi  NVARCHAR(200)   NOT NULL,
    diemToiDa   DECIMAL(5,2)    NOT NULL DEFAULT 10,
    maRubric    NVARCHAR(40)    NOT NULL DEFAULT 'CNTT_CLO_V1',
    maCLO       NVARCHAR(20)    NOT NULL,
    nhomDanhGia NVARCHAR(10)    NULL,
    thuTu       INT             NOT NULL DEFAULT 0,
    CONSTRAINT PK_TIEUCHI PRIMARY KEY (maTieuChi),
    CONSTRAINT CK_TIEUCHI_DIEM CHECK (diemToiDa > 0),
    CONSTRAINT CK_TIEUCHI_NHOM CHECK (nhomDanhGia IN (N'GV', N'DN'))
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
    nhanXetGV       NVARCHAR(MAX)   NULL,   -- Nhận xét của GVHD
    nhanXetDN       NVARCHAR(MAX)   NULL,   -- Nhận xét của đơn vị thực tập (Phiếu nhận xét)
    daDoiChieuPhieuDN BIT            NOT NULL DEFAULT 0,
    ghiChuPhieuDN   NVARCHAR(500)   NULL,
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
    email       NVARCHAR(200)   NULL,
    soDienThoai NVARCHAR(30)    NULL,
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

-- ============================================================
-- BẢNG 20: THONGBAO
-- Quản lý thông báo học vụ do Cán bộ Khoa phát hành
-- ============================================================
CREATE TABLE THONGBAO (
    maThongBao       NVARCHAR(50)   NOT NULL,
    tieuDe           NVARCHAR(250)  NOT NULL,
    noiDung          NVARCHAR(MAX)  NOT NULL,
    ngayTao          DATETIME2      NOT NULL DEFAULT GETDATE(),
    maNguoiGui       NVARCHAR(50)   NULL,
    nguoiGui         NVARCHAR(100)  NULL DEFAULT N'Văn phòng Khoa CNTT',
    doiTuong         NVARCHAR(50)   NOT NULL DEFAULT N'ALL', -- 'ALL', 'GiangVien', 'SinhVien'
    loaiThongBao     NVARCHAR(50)   NULL DEFAULT N'Chung',
    danhMuc          NVARCHAR(50)   NOT NULL DEFAULT N'KHAN_CAP',
    tepDinhKem       NVARCHAR(500)  NULL,
    kichThuocTep     NVARCHAR(50)   NULL,
    actionLink       NVARCHAR(255)  NULL,
    actionText       NVARCHAR(100)  NULL,
    ghim             BIT            NULL DEFAULT 0,
    maDot            NVARCHAR(20)   NULL,
    CONSTRAINT PK_THONGBAO PRIMARY KEY (maThongBao),
    CONSTRAINT FK_THONGBAO_DOT FOREIGN KEY (maDot) REFERENCES DOTTHUCTAP(maSo)
);
GO

-- ============================================================
-- BẢNG 21: THANGDIEM (Bảng 3. Quy đổi giữa các thang điểm)
-- ============================================================
CREATE TABLE THANGDIEM (
    maThangDiem     VARCHAR(10)     NOT NULL,
    xepLoai         NVARCHAR(30)    NOT NULL,
    diem10Tu        DECIMAL(4,2)    NOT NULL,
    diem10Den       DECIMAL(4,2)    NOT NULL,
    thangDiem4      DECIMAL(3,1)    NOT NULL,
    thangDiemChu    VARCHAR(5)      NOT NULL,
    ketQua          NVARCHAR(20)    NOT NULL,
    CONSTRAINT PK_THANGDIEM PRIMARY KEY (maThangDiem)
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

-- Giảng viên hướng dẫn: mỗi sinh viên chỉ có tối đa 1 phân công đang hoạt động
CREATE UNIQUE INDEX UQ_GVHD_SV_ACTIVE ON GVHUONGDAN(maSV) WHERE trangThai = N'DangHuongDan';

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
-- GHI CHÚ VỀ GIANGVIEN.soLuongSVHD:
-- soLuongSVHD là HẠN MỨC CHỈ TIÊU (Quota) tối đa do Khoa giao cho Giảng viên (mặc định 10 SV).
-- Số lượng sinh viên đang hướng dẫn thực tế (soLuongHienTai) được đếm động qua bảng GVHUONGDAN.
-- ============================================================
IF OBJECT_ID('trg_GVHD_CapNhatSoLuong', 'TR') IS NOT NULL DROP TRIGGER trg_GVHD_CapNhatSoLuong;
GO


-- ============================================================
-- DỮ LIỆU MẪU (Seed Data)
-- Bao gồm 35 Sinh viên, 12 Giảng viên, 15 Doanh nghiệp, 3 Đợt thực tập,
-- 40 Báo cáo tiến độ, 21 Phiếu chấm điểm CLO đầy đủ và 65 Tài khoản mẫu.
-- Mật khẩu mặc định cho tất cả tài khoản: 123456
-- ============================================================

-- 1. Vai trò hệ thống
INSERT INTO VAITRO (maVaiTro, tenVaiTro, moTa) VALUES
    ('VT01', N'QuanTriVien',    N'Quản trị toàn bộ hệ thống, tạo tài khoản và phân quyền'),
    ('VT02', N'Khoa',           N'Cán bộ Khoa quản lý đợt thực tập, phân bổ sinh viên'),
    ('VT03', N'GiangVien',      N'Giảng viên hướng dẫn thực tập'),
    ('VT04', N'SinhVien',       N'Sinh viên tham gia thực tập tốt nghiệp'),
    ('VT05', N'DaiDienDN',      N'Đại diện doanh nghiệp tiếp nhận và hướng dẫn sinh viên');
GO

-- 2. Tiêu chí chấm điểm CLO (Tổng điểm tối đa = 10)
-- 2a. Tiêu chí theo rubric LEGACY_4TC
INSERT INTO TIEUCHI (maTieuChi, tenTieuChi, diemToiDa, maRubric, maCLO) VALUES
    ('TC01', N'Thái độ và kỷ luật làm việc',        3.0, 'LEGACY_4TC', 'TC01'),
    ('TC02', N'Năng lực chuyên môn và kỹ thuật',    4.0, 'LEGACY_4TC', 'TC02'),
    ('TC03', N'Kỹ năng giao tiếp và làm việc nhóm', 2.0, 'LEGACY_4TC', 'TC03'),
    ('TC04', N'Báo cáo và tài liệu thực tập',       1.0, 'LEGACY_4TC', 'TC04');

-- 2b. Tiêu chí theo rubric CNTT_CLO_V1 (File chấm điểm Khoa CNTT)
-- GVHD chấm CLO1.1 -> CLO3.4 (tối đa 5.0đ), DN chấm CLO4.1, CLO4.2 (tối đa 5.0đ)
INSERT INTO TIEUCHI (maTieuChi, tenTieuChi, diemToiDa, nhomDanhGia, thuTu, maRubric, maCLO) VALUES
    ('CLO1.1', N'Xác định được mục tiêu, nội dung, ý nghĩa của công việc thực tập',                                   0.75, N'GV', 1,  'CNTT_CLO_V1', 'CLO1.1'),
    ('CLO1.2', N'Giới thiệu chung về đơn vị thực tập',                                                                0.75, N'GV', 2,  'CNTT_CLO_V1', 'CLO1.2'),
    ('CLO1.3', N'Nắm vững vị trí công việc thực tập (Thông tin vị trí thực tập, lên kế hoạch thực tập)',              0.50, N'GV', 3,  'CNTT_CLO_V1', 'CLO1.3'),
    ('CLO2.1', N'Vận dụng được kiến thức giải quyết các công việc được giao',                                         0.50, N'GV', 4,  'CNTT_CLO_V1', 'CLO2.1'),
    ('CLO2.2', N'Giải thích được các phương pháp làm để thực hiện công việc được giao',                               0.50, N'GV', 5,  'CNTT_CLO_V1', 'CLO2.2'),
    ('CLO3.1', N'Nắm rõ được yêu cầu công việc tham gia tại doanh nghiệp',                                            0.50, N'GV', 6,  'CNTT_CLO_V1', 'CLO3.1'),
    ('CLO3.2', N'Hoàn thành quyển báo cáo đề tài nghiêm túc, hợp lý, ngữ nghĩa trong sáng, không sai lỗi chính tả',   0.50, N'GV', 7,  'CNTT_CLO_V1', 'CLO3.2'),
    ('CLO3.3', N'Thuyết trình nội dung rõ ràng với giáo viên',                                                         0.50, N'GV', 8,  'CNTT_CLO_V1', 'CLO3.3'),
    ('CLO3.4', N'Trả lời câu hỏi của giáo viên',                                                                        0.50, N'GV', 9,  'CNTT_CLO_V1', 'CLO3.4'),
    ('CLO4.1', N'Nhận xét của đơn vị thực tập về ý thức, trách nhiệm, kỷ luật (Phiếu nhận xét)',                       2.00, N'DN', 10, 'CNTT_CLO_V1', 'CLO4.1'),
    ('CLO4.2', N'Khả năng vận dụng kiến thức vào thực tiễn trong quá trình thực tập (Phiếu nhận xét)',                 3.00, N'DN', 11, 'CNTT_CLO_V1', 'CLO4.2');
GO

-- 3. Đợt thực tập
INSERT INTO DOTTHUCTAP (maSo, tenDot, namHoc, thoiGianBD, thoiGianKT, trangThai, maRubric) VALUES
    ('DOT01', N'Thực tập tốt nghiệp đợt 1 năm 2026', '2025-2026', '2026-01-05', '2026-05-30', N'DaKetThuc',   'CNTT_CLO_V1'),
    ('DOT02', N'Thực tập tốt nghiệp đợt 2 năm 2026', '2025-2026', '2026-08-15', '2026-12-30', N'DangDienRa',  'CNTT_CLO_V1'),
    ('DOT03', N'Thực tập tốt nghiệp đợt 1 năm 2027', '2026-2027', '2027-01-10', '2027-05-25', N'ChuaBatDau',  'CNTT_CLO_V1');
GO

-- 4. Giảng viên (soLuongSVHD được tự động cập nhật bởi trigger trg_GVHD_CapNhatSoLuong)
INSERT INTO GIANGVIEN (maGV, hoTen, chuyenMon, soLuongSVHD, chiTieuHD) VALUES
    ('GV001', N'Nguyễn Văn An', N'Công nghệ phần mềm & Kiến trúc hệ thống', 0, 10),
    ('GV002', N'Trần Thị Bình', N'Hệ thống thông tin & Phân tích nghiệp vụ', 0, 10),
    ('GV003', N'Lê Quốc Cường', N'Trí tuệ nhân tạo & Học máy', 0, 10),
    ('GV004', N'Phạm Thị Dung', N'Phát triển ứng dụng di động & Flutter', 0, 10),
    ('GV005', N'Hoàng Minh Em', N'Khoa học dữ liệu & Big Data', 0, 10),
    ('GV006', N'Đỗ Minh Trí', N'An toàn thông tin & Kiểm thử thâm nhập', 0, 10),
    ('GV007', N'Vũ Thị Hồng', N'Công nghệ phần mềm & CI/CD DevOps', 0, 10),
    ('GV008', N'Bùi Quang Dũng', N'Thị giác máy tính & Xử lý ngôn ngữ tự nhiên', 0, 10),
    ('GV009', N'Đinh Tuấn Kiệt', N'Hệ thống thông tin quản lý & ERP', 0, 10),
    ('GV010', N'Ngô Mai Lan', N'Phát triển ứng dụng Web Cloud & Microservices', 0, 10),
    ('GV011', N'Trịnh Công Minh', N'Khoa học máy tính & Thuật toán tối ưu', 0, 10),
    ('GV012', N'Phan Thanh Hà', N'Kiểm thử phần mềm tự động & Đảm bảo chất lượng QA', 0, 10);
GO

-- 5. Sinh viên
INSERT INTO SINHVIEN (maSV, hoTen, lop, khoaHoc, gpa, kyNang, chuyenNganh, congNghe, duAnDaThucHien) VALUES
    ('SV001', N'Phạm Minh Đức', N'CNTT01', N'2022', 3.20, N'Lập trình Web, Quản lý dự án', N'Công nghệ thông tin', N'React, Node.js, SQL Server', N'Hệ thống quản lý bán hàng'),
    ('SV002', N'Nguyễn Thu Hà', N'CNTT01', N'2022', 3.50, N'Machine Learning, Python', N'Khoa học dữ liệu', N'Python, TensorFlow, PostgreSQL', N'Phân loại ảnh sản phẩm'),
    ('SV003', N'Võ Thanh Huy', N'CNTT02', N'2022', 2.80, N'Lập trình Web, UI/UX', N'Công nghệ thông tin', N'Vue.js, PHP, MySQL', N'Website thương mại điện tử'),
    ('SV004', N'Trần Quốc Bảo', N'CNTT02', N'2022', 3.10, N'Lập trình Web, Làm việc nhóm', N'Công nghệ thông tin', N'React, Spring Boot, MySQL', N'Hệ thống quản lý thư viện'),
    ('SV005', N'Lê Ngọc Ánh', N'CNTT01', N'2022', 3.40, N'Phát triển di động, UI/UX', N'Công nghệ thông tin', N'Flutter, Firebase', N'Ứng dụng đặt lịch khám bệnh'),
    ('SV006', N'Đặng Hoàng Nam', N'KHDL01', N'2022', 3.60, N'Machine Learning, Phân tích dữ liệu', N'Khoa học dữ liệu', N'Python, PyTorch, SQL Server', N'Hệ thống gợi ý sản phẩm'),
    ('SV007', N'Bùi Thị Mai', N'CNTT03', N'2022', 2.90, N'Lập trình Backend, REST API', N'Công nghệ thông tin', N'Java, Spring Boot, PostgreSQL', N'API quản lý đơn hàng'),
    ('SV008', N'Hoàng Gia Khang', N'CNTT03', N'2022', 3.00, N'Lập trình Backend, Docker', N'Công nghệ thông tin', N'Node.js, MongoDB, Docker', N'Hệ thống chat thời gian thực'),
    ('SV009', N'Ngô Thanh Tâm', N'CNTT02', N'2022', 3.30, N'Phát triển di động, Kotlin', N'Công nghệ thông tin', N'Kotlin, Android, SQLite', N'Ứng dụng quản lý chi tiêu'),
    ('SV010', N'Phan Anh Tuấn', N'KHDL01', N'2022', 3.70, N'Data Engineering, ETL', N'Khoa học dữ liệu', N'Python, Airflow, SQL Server', N'Data warehouse bán lẻ'),
    ('SV011', N'Lê Văn Khải', N'CNTT01', N'2022', 3.45, N'DevOps, Cloud Computing, Docker', N'Công nghệ thông tin', N'AWS, Docker, CI/CD, Linux', N'Hệ thống tự động hóa CI/CD cho microservices'),
    ('SV012', N'Trần Mai Phương', N'CNTT02', N'2022', 3.65, N'An toàn thông tin, Kiểm thử thâm nhập', N'An toàn thông tin', N'Python, Kali Linux, Wireshark, BurpSuite', N'Đánh giá an toàn hệ thống thông tin nội bộ'),
    ('SV013', N'Đoàn Bảo Long', N'CNTT03', N'2022', 2.95, N'Lập trình Web, ReactJS, TypeScript', N'Công nghệ thông tin', N'ReactJS, TypeScript, Tailwind CSS, Redux', N'Trang thương mại điện tử phụ kiện số'),
    ('SV014', N'Vũ Hoàng Yến', N'KHDL01', N'2022', 3.80, N'Trí tuệ nhân tạo, Xử lý ngôn ngữ tự nhiên', N'Khoa học dữ liệu', N'Python, BERT, LLM, PyTorch', N'Trợ lý ảo hỏi đáp quy chế học vụ'),
    ('SV015', N'Nguyễn Đức Huy', N'CNTT02', N'2022', 2.65, N'Kiểm thử phần mềm, Automation Testing', N'Công nghệ thông tin', N'Selenium, Postman, Jest, Cypress', N'Bộ kiểm thử tự động cho hệ thống E-commerce'),
    ('SV016', N'Lý Minh Khoa', N'CNTT01', N'2022', 3.15, N'Lập trình Web Fullstack, Làm việc nhóm', N'Công nghệ thông tin', N'React, Node.js, Express, MySQL', N'Website đặt vé xem phim'),
    ('SV017', N'Trương Gia Hân', N'CNTT02', N'2022', 3.25, N'An toàn mạng, Phân tích log, Linux', N'An toàn thông tin', N'Linux, Wireshark, Splunk, Python', N'Hệ thống giám sát phát hiện xâm nhập mạng'),
    ('SV018', N'Phạm Quỳnh Như', N'CNTT03', N'2022', 3.05, N'Lập trình Frontend, UI/UX', N'Công nghệ thông tin', N'ReactJS, Redux, Tailwind CSS, Figma', N'Dashboard quản lý bán hàng responsive'),
    ('SV019', N'Hồ Tấn Phát', N'KHDL01', N'2022', 3.50, N'Phân tích dữ liệu, Machine Learning', N'Khoa học dữ liệu', N'Python, Pandas, scikit-learn, SQL', N'Dự báo doanh số bán lẻ'),
    ('SV020', N'Nguyễn Hoài Bảo', N'CNTT01', N'2022', 2.95, N'Phát triển di động, Dart, Flutter', N'Công nghệ thông tin', N'Flutter, Dart, Firebase', N'Ứng dụng ghi chú học tập'),
    ('SV021', N'Đỗ Phương Thảo', N'CNTT01', N'2022', 3.60, N'Fullstack Web & Cloud Services', N'Công nghệ thông tin', N'C#, ASP.NET Core, React, Azure', N'Hệ thống quản lý đào tạo trực tuyến'),
    ('SV022', N'Lâm Quốc Trọng', N'CNTT02', N'2022', 3.10, N'Lập trình Backend & CSDL lớn', N'Công nghệ thông tin', N'Go, PostgreSQL, Redis, Docker', N'Cổng thanh toán điện tử giả lập'),
    ('SV023', N'Tạ Thanh Ngân', N'CNTT03', N'2022', 3.35, N'UI/UX & Frontend Optimization', N'Công nghệ thông tin', N'Next.js, Tailwind CSS, TypeScript', N'Trang tin tức số đa phương tiện'),
    ('SV024', N'Võ Minh Trí', N'KHDL01', N'2022', 3.40, N'Deep Learning & Thị giác máy', N'Khoa học dữ liệu', N'Python, OpenCV, YOLO, PyTorch', N'Nhận diện biển số xe thông minh'),
    ('SV025', N'Bùi Anh Tuấn', N'CNTT01', N'2022', 2.85, N'Lập trình Web PHP/Laravel', N'Công nghệ thông tin', N'PHP, Laravel, MySQL, Vue.js', N'Hệ thống tuyển dụng việc làm'),
    ('SV026', N'Mai Hồng Nhung', N'CNTT02', N'2022', 3.75, N'An toàn thông tin & Kỹ thuật dịch ngược', N'An toàn thông tin', N'Ghidra, Python, C++, Network Security', N'Phân tích mã độc ransomware thử nghiệm'),
    ('SV027', N'Nguyễn Hải Đăng', N'CNTT03', N'2022', 3.00, N'Frontend Development & GraphQL', N'Công nghệ thông tin', N'React, GraphQL, Apollo, Ant Design', N'Sàn đấu giá sản phẩm trực tuyến'),
    ('SV028', N'Dương Tấn Thành', N'KHDL01', N'2022', 3.20, N'Big Data Analytics & Spark', N'Khoa học dữ liệu', N'Python, PySpark, Hadoop, PowerBI', N'Phân tích hành vi người tiêu dùng'),
    ('SV029', N'Phan Gia Phúc', N'CNTT01', N'2022', 2.70, N'Kiểm thử phần mềm & Viết tài liệu', N'Công nghệ thông tin', N'Jira, Postman, JMeter, TestLink', N'Kiểm thử hiệu năng hệ thống đặt vé'),
    ('SV030', N'Huỳnh Kim Ngân', N'CNTT02', N'2022', 3.55, N'Ứng dụng di động & Clean Architecture', N'Công nghệ thông tin', N'Kotlin, Jetpack Compose, MVVM', N'Sổ tay sức khỏe cá nhân'),
    ('SV031', N'Trần Văn Bình', N'CNTT03', N'2022', 2.50, N'Cơ sở dữ liệu & Quản trị mạng', N'Công nghệ thông tin', N'SQL Server, Cisco Packet Tracer', N'Quản trị mạng doanh nghiệp vừa và nhỏ'),
    ('SV032', N'Lê Thị Cúc', N'CNTT01', N'2022', 3.05, N'Lập trình ứng dụng Java Desktop', N'Công nghệ thông tin', N'Java Swing, Hibernate, MySQL', N'Phần mềm quản lý khách sạn'),
    ('SV033', N'Nguyễn Tiến Đạt', N'KHDL01', N'2022', 3.15, N'Xử lý dữ liệu & Báo cáo BI', N'Khoa học dữ liệu', N'Python, Tableau, SQL Server', N'Báo cáo thông minh cho chuỗi cà phê'),
    ('SV034', N'Hoàng Kim Oanh', N'CNTT02', N'2022', 3.45, N'Lập trình ứng dụng Web ASP.NET', N'Công nghệ thông tin', N'C#, .NET 8, Blazor, SQL Server', N'Cổng thông tin sinh viên nội bộ'),
    ('SV035', N'Vũ Quốc Việt', N'CNTT03', N'2022', 2.90, N'Lập trình nhúng & Vi điều khiển', N'Công nghệ thông tin', N'C, ESP32, MQTT, Node-RED', N'Hệ thống nhà thông minh IoT');
GO

-- 6. Công ty tiếp nhận thực tập
INSERT INTO CONGTY (maCongTy, tenCongTy, viTriTuyen, thoiGian, soLuongNhan, yeuCau, trangThai) VALUES
    ('CT001', N'Công ty TNHH Phần mềm FPT (FPT Software)', N'Lập trình viên Web Fullstack React/Node.js', N'14/08/2026 - 25/12/2026', 8, N'React, Node.js, REST API, GPA >= 2.5', N'DaDuyet'),
    ('CT002', N'Công ty Cổ phần VNG (VNG Corporation)', N'Kỹ sư Trí tuệ nhân tạo / Machine Learning', N'14/08/2026 - 25/12/2026', 5, N'Python, PyTorch/TensorFlow, GPA >= 3.0', N'DaDuyet'),
    ('CT003', N'Công ty TNHH Ti Ki (Tiki Corporation)', N'Kỹ sư Backend Golang / Java Microservices', N'14/08/2026 - 25/12/2026', 6, N'Java, Golang, MySQL, Kafka, GPA >= 2.8', N'DaDuyet'),
    ('CT004', N'Công ty Cổ phần Công nghệ Sao Việt', N'Lập trình viên Mobile Flutter / React Native', N'14/08/2026 - 25/12/2026', 4, N'Flutter, Dart, Firebase, GPA >= 2.7', N'DaDuyet'),
    ('CT005', N'Công ty TNHH Dữ liệu Lạc Việt', N'Kỹ sư Kỹ thuật dữ liệu (Data Engineer)', N'14/08/2026 - 25/12/2026', 4, N'SQL, Python, Apache Airflow, GPA >= 3.0', N'DaDuyet'),
    ('CT006', N'Công ty TNHH Giải pháp Phần mềm ABC', N'Thực tập sinh Kiểm thử phần mềm QA/QC', N'14/08/2026 - 25/12/2026', 3, N'Hiểu quy trình kiểm thử, test cases, GPA >= 2.5', N'ChoDuyet'),
    ('CT007', N'Tập đoàn Công nghiệp - Viễn thông Quân đội (Viettel)', N'Kỹ sư An toàn thông tin & Điện toán đám mây', N'14/08/2026 - 25/12/2026', 6, N'Linux, Wireshark, AWS, Docker, GPA >= 2.8', N'DaDuyet'),
    ('CT008', N'Công ty CP Dịch vụ Di động Trực tuyến (MoMo)', N'Kỹ sư Phát triển Backend & Hệ thống thanh toán', N'14/08/2026 - 25/12/2026', 5, N'Microservices, Redis, Spring Boot, GPA >= 3.0', N'DaDuyet'),
    ('CT009', N'Công ty TNHH Shopee Việt Nam', N'Lập trình viên Frontend ReactJS / TypeScript', N'14/08/2026 - 25/12/2026', 6, N'ReactJS, TypeScript, Tailwind CSS, GPA >= 2.8', N'DaDuyet'),
    ('CT010', N'Công ty CP Giải pháp Thanh toán Việt Nam (VNPAY)', N'Kỹ sư Kiểm thử tự động (Automation Test QA)', N'14/08/2026 - 25/12/2026', 5, N'Selenium, Postman, Jest, Cypress, GPA >= 2.7', N'DaDuyet'),
    ('CT011', N'Tập đoàn Bưu chính Viễn thông Việt Nam (VNPT)', N'Kỹ sư Trí tuệ nhân tạo & Xử lý ngôn ngữ tự nhiên', N'14/08/2026 - 25/12/2026', 5, N'Python, NLP, LLM, Computer Vision, GPA >= 3.0', N'DaDuyet'),
    ('CT012', N'Công ty TNHH KMS Technology Việt Nam', N'Software Engineer .NET / ReactJS', N'14/08/2026 - 25/12/2026', 4, N'C#, ASP.NET Core, React, SQL Server, GPA >= 2.8', N'DaDuyet'),
    ('CT013', N'Công ty TNHH DXC Technology Việt Nam', N'Enterprise Application Consultant', N'14/08/2026 - 25/12/2026', 3, N'Java, Oracle, Cloud Fundamentals, GPA >= 2.7', N'DaDuyet'),
    ('CT014', N'Công ty TNHH NashTech Việt Nam', N'Junior Fullstack Developer (.NET & Angular)', N'14/08/2026 - 25/12/2026', 4, N'.NET Core, Angular, Azure DevOps, GPA >= 2.8', N'DaDuyet'),
    ('CT015', N'Trung tâm R&D Bosch Global Software Technologies', N'Embedded Software & IoT Engineer', N'14/08/2026 - 25/12/2026', 4, N'C/C++, RTOS, IoT Protocols, GPA >= 3.0', N'DaDuyet');
GO

-- 7. Đại diện doanh nghiệp
INSERT INTO DAIDIENDOANHNGHIEP (maSo, hoTen, chucVu, email, thongTinLienHe, maCongTy) VALUES
    ('DD001', N'Trần Đình Khang', N'Trưởng phòng Kỹ thuật FPT', 'khangtd@fpt.com', '0901234001', 'CT001'),
    ('DD002', N'Lê Hoàng Yến', N'Senior Technical Lead VNG', 'yenlh@vng.com.vn', '0901234002', 'CT002'),
    ('DD003', N'Nguyễn Văn Hùng', N'Trưởng nhóm AI Research VNG', 'hungnv@vng.com.vn', '0901234003', 'CT002'),
    ('DD004', N'Phạm Quốc Toàn', N'Giám đốc Kỹ thuật Tiki', 'toanpq@tiki.vn', '0901234004', 'CT003'),
    ('DD005', N'Đỗ Thị Thu Thảo', N'Tech Lead Mobile Sao Việt', 'thaodtt@saoviet.vn', '0901234005', 'CT004'),
    ('DD006', N'Vũ Minh Tuấn', N'Trưởng bộ phận Data Lạc Việt', 'tuanvm@lacviet.com', '0901234006', 'CT005'),
    ('DD007', N'Ngô Đức Cảnh', N'Phó Giám đốc ABC Solutions', 'canhnd@abcsolutions.vn', '0901234007', 'CT006'),
    ('DD008', N'Hoàng Văn Thái', N'Trưởng phòng ATTT & Cloud Viettel', 'thaihv@viettel.com.vn', '0901234008', 'CT007'),
    ('DD009', N'Đặng Minh Quân', N'Principal Architect MoMo', 'quandm@momo.vn', '0901234009', 'CT008'),
    ('DD010', N'Bùi Thanh Phong', N'Engineering Manager Shopee', 'phongbt@shopee.com', '0901234010', 'CT009'),
    ('DD011', N'Trịnh Hải Đăng', N'Lead QA Automation VNPAY', 'dangth@vnpay.vn', '0901234011', 'CT010'),
    ('DD012', N'Lý Thanh Hương', N'Chuyên gia Dữ liệu cấp cao VNPT', 'huonglt@vnpt.vn', '0901234012', 'CT011'),
    ('DD013', N'Cao Bá Quát', N'Software Delivery Manager KMS', 'quatcb@kms-technology.com', '0901234013', 'CT012'),
    ('DD014', N'Dương Nhật Nam', N'Technical Consultant DXC', 'namdn@dxc.com', '0901234014', 'CT013'),
    ('DD015', N'Đinh Trọng Thắng', N'IoT Systems Lead Bosch', 'thangdt@bosch.com', '0901234015', 'CT015');
GO

-- 8. Hồ sơ năng lực sinh viên
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
    ('HS010', N'Data Engineering với Airflow và SQL Server, đã làm data warehouse bán lẻ, mong muốn thực tập Dữ liệu.', '2026-08-20', 'SV010'),
    ('HS011', N'Chuyên sâu về Docker, CI/CD Pipeline, AWS Cloud, có kinh nghiệm triển khai hạ tầng container, mong muốn thực tập DevOps/Cloud.', '2026-08-20', 'SV011'),
    ('HS012', N'Đam mê bảo mật, an toàn thông tin mạng, thành thạo công cụ rà quét lỗ hổng và kiểm thử thâm nhập, mong muốn thực tập Security/SOC.', '2026-08-20', 'SV012'),
    ('HS013', N'Kỹ năng lập trình ReactJS, TypeScript và UI/UX Responsive, mong muốn thực tập vị trí Frontend Developer.', '2026-08-20', 'SV013'),
    ('HS014', N'Nghiên cứu mô hình ngôn ngữ lớn (LLM), Natural Language Processing với PyTorch và HuggingFace, mong muốn thực tập Kỹ sư AI/NLP.', '2026-08-20', 'SV014'),
    ('HS015', N'Kiến thức kiểm thử hộp đen, hộp trắng, viết kịch bản test tự động bằng Selenium và Postman, mong muốn thực tập QA/Automation Tester.', '2026-08-20', 'SV015'),
    ('HS016', N'Lập trình Web Fullstack với React, Node.js và MySQL, đã làm website đặt vé xem phim, mong muốn thực tập Web Fullstack.', '2026-08-21', 'SV016'),
    ('HS017', N'Quan tâm an toàn mạng, phân tích log hệ thống trên Linux, đã xây dựng hệ thống phát hiện xâm nhập, mong muốn thực tập Security/SOC.', '2026-08-21', 'SV017'),
    ('HS018', N'Lập trình Frontend ReactJS, Redux, Tailwind CSS, thiết kế UI/UX trên Figma, mong muốn thực tập Frontend Developer.', '2026-08-21', 'SV018'),
    ('HS019', N'Phân tích dữ liệu với Python, Pandas, scikit-learn và SQL, đã làm dự báo doanh số bán lẻ, mong muốn thực tập Data/AI.', '2026-08-21', 'SV019'),
    ('HS020', N'Phát triển ứng dụng di động với Flutter và Firebase, mong muốn thực tập Mobile Developer.', '2026-08-21', 'SV020');
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
    ('GY010', 86.00, '2026-08-21', 'HS010', 'CT002'),
    ('GY011', 94.00, '2026-08-22', 'HS011', 'CT007'),
    ('GY012', 96.50, '2026-08-22', 'HS012', 'CT007'),
    ('GY013', 91.00, '2026-08-22', 'HS013', 'CT009'),
    ('GY014', 95.50, '2026-08-22', 'HS014', 'CT011'),
    ('GY015', 89.00, '2026-08-22', 'HS015', 'CT010');
GO

-- 10. Giảng viên giới thiệu công ty
INSERT INTO GIOITHIEU (maSo, ngayGioiThieu, trangThaiKetNoi, maCongTy, maGV) VALUES
    ('GT001', '2026-01-10', N'DaDuyet', 'CT001', 'GV001'),
    ('GT002', '2026-01-10', N'DaDuyet', 'CT002', 'GV003'),
    ('GT003', '2026-08-10', N'DaDuyet', 'CT004', 'GV004'),
    ('GT004', '2026-08-12', N'DangXem', 'CT006', 'GV002'),
    ('GT005', '2026-08-15', N'DaDuyet', 'CT007', 'GV006'),
    ('GT006', '2026-08-15', N'DaDuyet', 'CT008', 'GV007'),
    ('GT007', '2026-08-16', N'DaDuyet', 'CT009', 'GV010'),
    ('GT008', '2026-08-16', N'DangXem', 'CT010', 'GV009'),
    ('GT009', '2026-08-17', N'TuChoi',  'CT011', 'GV008'),
    ('GT010', '2026-08-18', N'DaDuyet', 'CT012', 'GV001'),
    ('GT011', '2026-08-18', N'DaDuyet', 'CT014', 'GV011'),
    ('GT012', '2026-08-19', N'DaDuyet', 'CT015', 'GV004');
GO

-- 11. Phân công giảng viên hướng dẫn (trigger sẽ cập nhật GIANGVIEN.soLuongSVHD)
INSERT INTO GVHUONGDAN (maSo, ngayPC, trangThai, maGV, maSV) VALUES
    ('PC001', '2026-02-02', N'HoanThanh', 'GV001', 'SV001'),
    ('PC002', '2026-02-02', N'HoanThanh', 'GV002', 'SV002'),
    ('PC003', '2026-02-02', N'HoanThanh', 'GV003', 'SV003'),
    ('PC004', '2026-08-20', N'DangHuongDan', 'GV001', 'SV004'),
    ('PC005', '2026-08-20', N'DangHuongDan', 'GV001', 'SV005'),
    ('PC006', '2026-08-20', N'DangHuongDan', 'GV002', 'SV006'),
    ('PC007', '2026-08-20', N'DangHuongDan', 'GV002', 'SV007'),
    ('PC008', '2026-08-20', N'DangHuongDan', 'GV003', 'SV008'),
    ('PC009', '2026-08-20', N'DangHuongDan', 'GV004', 'SV009'),
    ('PC010', '2026-08-20', N'DangHuongDan', 'GV005', 'SV010'),
    ('PC011', '2026-08-20', N'DangHuongDan', 'GV006', 'SV011'),
    ('PC012', '2026-08-20', N'DangHuongDan', 'GV007', 'SV012'),
    ('PC013', '2026-08-20', N'DangHuongDan', 'GV010', 'SV013'),
    ('PC014', '2026-08-20', N'DangHuongDan', 'GV008', 'SV014'),
    ('PC015', '2026-08-20', N'DangHuongDan', 'GV009', 'SV015'),
    ('PC016', '2026-08-20', N'DangHuongDan', 'GV001', 'SV016'),
    ('PC017', '2026-08-20', N'DangHuongDan', 'GV006', 'SV017'),
    ('PC018', '2026-08-20', N'DangHuongDan', 'GV010', 'SV018'),
    ('PC019', '2026-08-20', N'DangHuongDan', 'GV005', 'SV019'),
    ('PC020', '2026-08-20', N'DangHuongDan', 'GV004', 'SV020'),
    ('PC021', '2026-08-20', N'DangHuongDan', 'GV001', 'SV021'),
    ('PC022', '2026-08-20', N'DangHuongDan', 'GV003', 'SV022'),
    ('PC023', '2026-08-20', N'DangHuongDan', 'GV007', 'SV023'),
    ('PC024', '2026-08-20', N'DangHuongDan', 'GV008', 'SV024'),
    ('PC025', '2026-08-20', N'DangHuongDan', 'GV002', 'SV025'),
    ('PC026', '2026-08-20', N'DangHuongDan', 'GV006', 'SV026'),
    ('PC027', '2026-08-20', N'DangHuongDan', 'GV009', 'SV027'),
    ('PC028', '2026-08-20', N'DangHuongDan', 'GV005', 'SV028'),
    ('PC029', '2026-08-20', N'DangHuongDan', 'GV011', 'SV029'),
    ('PC030', '2026-08-20', N'DangHuongDan', 'GV004', 'SV030');
GO

-- 12. Đăng ký thực tập
INSERT INTO DANGKYTHUCTAP (maDK, ngayDangKy, thuTuUuTien, trangThai, maSV, maCongTy, maDot) VALUES
    ('DK001', '2026-01-12', 1, N'DaDuyet', 'SV001', 'CT001', 'DOT01'),
    ('DK002', '2026-01-12', 2, N'TuChoi',  'SV001', 'CT003', 'DOT01'),
    ('DK003', '2026-01-12', 1, N'DaDuyet', 'SV002', 'CT002', 'DOT01'),
    ('DK004', '2026-01-13', 1, N'DaDuyet', 'SV003', 'CT003', 'DOT01'),
    ('DK005', '2026-08-24', 1, N'DaDuyet', 'SV004', 'CT001', 'DOT02'),
    ('DK006', '2026-08-24', 1, N'DaDuyet', 'SV005', 'CT001', 'DOT02'),
    ('DK007', '2026-08-24', 2, N'TuChoi',  'SV005', 'CT004', 'DOT02'),
    ('DK008', '2026-08-25', 1, N'DaDuyet', 'SV006', 'CT002', 'DOT02'),
    ('DK009', '2026-08-25', 1, N'DaDuyet', 'SV007', 'CT003', 'DOT02'),
    ('DK010', '2026-08-25', 1, N'DaDuyet', 'SV008', 'CT003', 'DOT02'),
    ('DK011', '2026-08-25', 2, N'ChoDuyet', 'SV008', 'CT001', 'DOT02'),
    ('DK012', '2026-08-26', 1, N'DaDuyet', 'SV009', 'CT004', 'DOT02'),
    ('DK013', '2026-08-26', 1, N'DaDuyet', 'SV010', 'CT005', 'DOT02'),
    ('DK014', '2026-08-26', 2, N'TuChoi',  'SV010', 'CT002', 'DOT02'),
    ('DK015', '2026-08-27', 1, N'DaDuyet', 'SV011', 'CT007', 'DOT02'),
    ('DK016', '2026-08-27', 1, N'DaDuyet', 'SV012', 'CT007', 'DOT02'),
    ('DK017', '2026-08-27', 1, N'DaDuyet', 'SV013', 'CT009', 'DOT02'),
    ('DK018', '2026-08-28', 1, N'DaDuyet', 'SV014', 'CT011', 'DOT02'),
    ('DK019', '2026-08-28', 1, N'DaDuyet', 'SV015', 'CT010', 'DOT02'),
    ('DK020', '2026-08-28', 1, N'DaDuyet', 'SV016', 'CT001', 'DOT02'),
    ('DK021', '2026-08-28', 1, N'DaDuyet', 'SV017', 'CT007', 'DOT02'),
    ('DK022', '2026-08-28', 1, N'DaDuyet', 'SV018', 'CT009', 'DOT02'),
    ('DK023', '2026-08-29', 1, N'DaDuyet', 'SV019', 'CT011', 'DOT02'),
    ('DK024', '2026-08-29', 1, N'DaDuyet', 'SV020', 'CT004', 'DOT02'),
    ('DK025', '2026-08-29', 1, N'DaDuyet', 'SV021', 'CT012', 'DOT02'),
    ('DK026', '2026-08-29', 1, N'DaDuyet', 'SV022', 'CT008', 'DOT02'),
    ('DK027', '2026-08-29', 1, N'DaDuyet', 'SV023', 'CT009', 'DOT02'),
    ('DK028', '2026-08-29', 1, N'DaDuyet', 'SV024', 'CT002', 'DOT02'),
    ('DK029', '2026-08-29', 1, N'DaDuyet', 'SV025', 'CT001', 'DOT02'),
    ('DK030', '2026-08-29', 1, N'DaDuyet', 'SV026', 'CT007', 'DOT02');
GO

-- 13. Phân bổ thực tập
INSERT INTO PHANBOTHUCTAP (maPB, ngayPhanBo, trangThai, maDot, maCongTy, maSV) VALUES
    ('PB001', '2026-01-25', N'HoanThanh', 'DOT01', 'CT001', 'SV001'),
    ('PB002', '2026-01-25', N'HoanThanh', 'DOT01', 'CT002', 'SV002'),
    ('PB003', '2026-01-25', N'HoanThanh', 'DOT01', 'CT003', 'SV003'),
    ('PB004', '2026-08-25', N'DangThucTap', 'DOT02', 'CT001', 'SV004'),
    ('PB005', '2026-08-25', N'DangThucTap', 'DOT02', 'CT001', 'SV005'),
    ('PB006', '2026-08-25', N'DangThucTap', 'DOT02', 'CT002', 'SV006'),
    ('PB007', '2026-08-25', N'DangThucTap', 'DOT02', 'CT003', 'SV007'),
    ('PB008', '2026-08-25', N'DangThucTap', 'DOT02', 'CT003', 'SV008'),
    ('PB009', '2026-08-25', N'DangThucTap', 'DOT02', 'CT004', 'SV009'),
    ('PB010', '2026-08-25', N'DangThucTap', 'DOT02', 'CT005', 'SV010'),
    ('PB011', '2026-08-25', N'DangThucTap', 'DOT02', 'CT007', 'SV011'),
    ('PB012', '2026-08-25', N'DangThucTap', 'DOT02', 'CT007', 'SV012'),
    ('PB013', '2026-08-25', N'DangThucTap', 'DOT02', 'CT009', 'SV013'),
    ('PB014', '2026-08-25', N'DangThucTap', 'DOT02', 'CT011', 'SV014'),
    ('PB015', '2026-08-25', N'DangThucTap', 'DOT02', 'CT010', 'SV015'),
    ('PB016', '2026-08-25', N'DangThucTap', 'DOT02', 'CT001', 'SV016'),
    ('PB017', '2026-08-25', N'DangThucTap', 'DOT02', 'CT007', 'SV017'),
    ('PB018', '2026-08-25', N'DangThucTap', 'DOT02', 'CT009', 'SV018'),
    ('PB019', '2026-08-25', N'DangThucTap', 'DOT02', 'CT011', 'SV019'),
    ('PB020', '2026-08-25', N'DangThucTap', 'DOT02', 'CT004', 'SV020'),
    ('PB021', '2026-08-25', N'DangThucTap', 'DOT02', 'CT012', 'SV021'),
    ('PB022', '2026-08-25', N'DangThucTap', 'DOT02', 'CT008', 'SV022'),
    ('PB023', '2026-08-25', N'DangThucTap', 'DOT02', 'CT009', 'SV023'),
    ('PB024', '2026-08-25', N'DangThucTap', 'DOT02', 'CT002', 'SV024'),
    ('PB025', '2026-08-25', N'DangThucTap', 'DOT02', 'CT001', 'SV025'),
    ('PB026', '2026-08-25', N'DangThucTap', 'DOT02', 'CT007', 'SV026'),
    ('PB027', '2026-08-25', N'DangThucTap', 'DOT02', 'CT003', 'SV027'),
    ('PB028', '2026-08-25', N'DangThucTap', 'DOT02', 'CT005', 'SV028'),
    ('PB029', '2026-08-25', N'DangThucTap', 'DOT02', 'CT014', 'SV029'),
    ('PB030', '2026-08-25', N'DangThucTap', 'DOT02', 'CT004', 'SV030');
GO

-- 14. Đại diện doanh nghiệp hướng dẫn sinh viên
INSERT INTO HUONGDANDOANHNGHIEP (maSo, ngayBD, vaiTro, danhGia, maPB, maDaiDien) VALUES
    ('HD001', '2026-02-02', N'Hướng dẫn chính', N'Hoàn thành tốt công việc, chủ động học hỏi.',          'PB001', 'DD001'),
    ('HD002', '2026-02-02', N'Hướng dẫn chính', N'Nắm vững kiến thức ML, hoàn thành đúng hạn.',          'PB002', 'DD003'),
    ('HD003', '2026-02-02', N'Hướng dẫn chính', N'Hoàn thành công việc, cần cải thiện kỹ năng báo cáo.', 'PB003', 'DD004'),
    ('HD004', '2026-09-14', N'Hướng dẫn chính', N'Nắm bắt nhanh quy trình, hoàn thành tốt task được giao.','PB004', 'DD001'),
    ('HD005', '2026-09-14', N'Hướng dẫn chính', N'Tư duy logic tốt, kỷ luật làm việc rất nghiêm túc.',    'PB005', 'DD001'),
    ('HD006', '2026-09-14', N'Hướng dẫn chính', N'Hoàn thành yêu cầu nghiên cứu AI cơ bản.',             'PB006', 'DD003'),
    ('HD007', '2026-09-14', N'Hướng dẫn chính', N'Kỹ năng Backend Java tốt, tinh thần học hỏi cao.',     'PB007', 'DD004'),
    ('HD008', '2026-09-14', N'Hướng dẫn chính', N'Cần chú ý kỷ luật giờ giấc hơn.',                      'PB008', 'DD004'),
    ('HD009', '2026-09-14', N'Hướng dẫn chính', N'Nhiệt tình, hoàn thành các màn hình mobile đúng hẹn.',   'PB009', 'DD005'),
    ('HD010', '2026-09-14', N'Hướng dẫn chính', N'Tư duy Data Engineering rất tốt, chủ động đề xuất giải pháp.','PB010', 'DD006'),
    ('HD011', '2026-09-14', N'Hướng dẫn chính', N'Kỹ năng DevOps nổi trội, tiếp cận hạ tầng AWS rất nhanh.','PB011', 'DD008'),
    ('HD012', '2026-09-14', N'Hướng dẫn chính', N'Phát hiện nhiều lỗ hổng bảo mật có giá trị thực tế.',    'PB012', 'DD008'),
    ('HD013', '2026-09-14', N'Hướng dẫn chính', N'Giao diện web hoàn thiện tốt, đúng deadline.',           'PB013', 'DD010'),
    ('HD014', '2026-09-14', N'Hướng dẫn chính', N'Tố chất nghiên cứu AI nổi trội, độc lập giải quyết bài toán khó.','PB014', 'DD012'),
    ('HD015', '2026-09-14', N'Hướng dẫn chính', N'Viết test case tự động đạt chuẩn, cần chủ động hơn.',   'PB015', 'DD011'),
    ('HD016', '2026-09-14', N'Hướng dẫn chính', N'Website hoạt động ổn định, hòa đồng với đồng nghiệp.',  'PB016', 'DD001'),
    ('HD017', '2026-09-14', N'Hướng dẫn chính', N'Phân tích log mạng chi tiết, xử lý tốt sự cố.',        'PB017', 'DD008'),
    ('HD018', '2026-09-14', N'Hướng dẫn chính', N'Thiết kế giao diện đẹp mắt, thẩm mỹ cao.',             'PB018', 'DD010'),
    ('HD019', '2026-09-14', N'Hướng dẫn chính', N'Phân tích số liệu sắc sảo, dự báo bán lẻ chính xác.',   'PB019', 'DD012'),
    ('HD020', '2026-09-14', N'Hướng dẫn chính', N'Còn thiếu tập trung, cần nỗ lực nhiều hơn.',           'PB020', 'DD005'),
    ('HD021', '2026-09-14', N'Hướng dẫn chính', N'Vắng mặt nhiều buổi không phép, không đạt chuẩn DN.',  'PB021', 'DD013');
GO

-- 15. Phỏng vấn
INSERT INTO PHONGVAN (maPV, hinhThuc, ngayPV, ketQua, maDaiDien, maSV) VALUES
    ('PV001', N'Trực tuyến', '2026-01-18', N'Dat', 'DD001', 'SV001'),
    ('PV002', N'Trực tiếp',  '2026-01-18', N'Dat', 'DD003', 'SV002'),
    ('PV003', N'Trực tuyến', '2026-01-19', N'Dat', 'DD004', 'SV003'),
    ('PV004', N'Trực tuyến', '2026-08-28', N'Dat', 'DD001', 'SV004'),
    ('PV005', N'Trực tiếp',  '2026-08-28', N'Dat', 'DD001', 'SV005'),
    ('PV006', N'Trực tuyến', '2026-08-29', N'Dat', 'DD003', 'SV006'),
    ('PV007', N'Trực tuyến', '2026-08-29', N'Dat', 'DD004', 'SV007'),
    ('PV008', N'Trực tiếp',  '2026-08-30', N'Dat', 'DD004', 'SV008'),
    ('PV009', N'Trực tiếp',  '2026-08-30', N'Dat', 'DD005', 'SV009'),
    ('PV010', N'Trực tuyến', '2026-08-31', N'Dat', 'DD006', 'SV010'),
    ('PV011', N'Trực tuyến', '2026-08-31', N'Dat', 'DD008', 'SV011'),
    ('PV012', N'Trực tiếp',  '2026-08-31', N'Dat', 'DD008', 'SV012'),
    ('PV013', N'Trực tuyến', '2026-08-31', N'Dat', 'DD010', 'SV013'),
    ('PV014', N'Trực tiếp',  '2026-08-31', N'Dat', 'DD012', 'SV014'),
    ('PV015', N'Trực tuyến', '2026-08-31', N'Dat', 'DD011', 'SV015'),
    ('PV016', N'Trực tuyến', '2026-09-01', N'Dat', 'DD001', 'SV016'),
    ('PV017', N'Trực tiếp',  '2026-09-01', N'Dat', 'DD008', 'SV017'),
    ('PV018', N'Trực tuyến', '2026-09-02', N'Dat', 'DD010', 'SV018'),
    ('PV019', N'Trực tiếp',  '2026-09-02', N'Dat', 'DD012', 'SV019'),
    ('PV020', N'Trực tiếp',  '2026-09-02', N'Dat', 'DD005', 'SV020');
GO

-- 16. Tiến độ thực tập
INSERT INTO TIENDOTHUCTAP (maTienDo, mocThoiGian, noiDungBaoCao, ngayNop, trangThaiDuyet, nhanXetGV, nhanXet, maDot, maSV) VALUES
    ('TD001', '2026-03-02', N'Báo cáo tuần 1-4: làm quen dự án và môi trường làm việc.', '2026-03-01', N'DaDuyet', N'Nắm bắt công việc tốt, báo cáo đúng hạn.', N'Nắm bắt công việc tốt, báo cáo đúng hạn.', 'DOT01', 'SV001'),
    ('TD002', '2026-05-10', N'Báo cáo tổng kết thực tập.', '2026-05-09', N'DaDuyet', N'Báo cáo hoàn chỉnh, đánh giá cao kết quả.', N'Báo cáo hoàn chỉnh, đánh giá cao kết quả.', 'DOT01', 'SV001'),
    ('TD003', '2026-03-02', N'Báo cáo tuần 1-4: chuẩn bị dữ liệu và huấn luyện mô hình.', '2026-03-02', N'DaDuyet', N'Tiến độ nghiên cứu tốt, phát huy tiếp.', N'Tiến độ nghiên cứu tốt, phát huy tiếp.', 'DOT01', 'SV002'),
    ('TD004', '2026-05-10', N'Báo cáo tổng kết thực tập.', '2026-05-10', N'DaDuyet', N'Kết quả mô hình đạt chỉ tiêu đề ra.', N'Kết quả mô hình đạt chỉ tiêu đề ra.', 'DOT01', 'SV002'),
    ('TD005', '2026-03-02', N'Báo cáo tuần 1-4: xây dựng API cho hệ thống nội bộ.', '2026-03-03', N'DaDuyet', N'Thiết kế API rõ ràng, chuẩn REST.', N'Thiết kế API rõ ràng, chuẩn REST.', 'DOT01', 'SV003'),
    ('TD006', '2026-05-10', N'Báo cáo tổng kết thực tập.', '2026-05-09', N'DaDuyet', N'Hoàn thành đầy đủ các đầu việc được giao.', N'Hoàn thành đầy đủ các đầu việc được giao.', 'DOT01', 'SV003'),
    ('TD007', '2026-09-15', N'Báo cáo tuần 1-2: tìm hiểu quy trình và công nghệ của FPT Software.', '2026-09-14', N'DaDuyet', N'Báo cáo chi tiết, nắm quy trình nhanh.', N'Báo cáo chi tiết, nắm quy trình nhanh.', 'DOT02', 'SV004'),
    ('TD008', '2026-09-15', N'Báo cáo tuần 1-2: cài đặt môi trường, nhận task đầu tiên.', '2026-09-14', N'DaDuyet', N'Tiến độ đúng hạn, chủ động hỏi han khi gặp vướng mắc.', N'Tiến độ đúng hạn, chủ động hỏi han khi gặp vướng mắc.', 'DOT02', 'SV005'),
    ('TD009', '2026-09-15', N'Báo cáo tuần 1-2: tìm hiểu bộ dữ liệu của dự án VNG.', '2026-09-15', N'DaDuyet', N'Cấu trúc dữ liệu đã được tổng hợp chi tiết.', N'Cấu trúc dữ liệu đã được tổng hợp chi tiết.', 'DOT02', 'SV006'),
    ('TD010', '2026-09-15', N'Báo cáo tuần 1-2: đọc tài liệu hệ thống backend Tiki.', '2026-09-14', N'DaDuyet', N'Tốt, tiếp tục triển khai module tiếp theo.', N'Tốt, tiếp tục triển khai module tiếp theo.', 'DOT02', 'SV007'),
    ('TD011', '2026-09-15', N'Báo cáo tuần 1-2: làm quen hệ thống microservices.', '2026-09-16', N'DaDuyet', N'Nộp muộn 1 ngày nhưng nội dung chất lượng.', N'Nộp muộn 1 ngày nhưng nội dung chất lượng.', 'DOT02', 'SV008'),
    ('TD012', '2026-09-15', N'Báo cáo tuần 1-2: làm quen codebase ứng dụng di động Sao Việt.', '2026-09-15', N'DaDuyet', N'Kiến trúc code rõ ràng, tiếp thu nhanh.', N'Kiến trúc code rõ ràng, tiếp thu nhanh.', 'DOT02', 'SV009'),
    ('TD013', '2026-09-15', N'Báo cáo tuần 1-2: tìm hiểu pipeline ETL hiện có tại Lạc Việt.', '2026-09-14', N'DaDuyet', N'Đã nắm được luồng dữ liệu chính.', N'Đã nắm được luồng dữ liệu chính.', 'DOT02', 'SV010'),
    ('TD014', '2026-09-15', N'Báo cáo tuần 1-2: làm quen hạ tầng cloud và CI/CD Viettel.', '2026-09-14', N'DaDuyet', N'Tiếp cận nhanh, hoàn thành tốt task đầu.', N'Tiếp cận nhanh, hoàn thành tốt task đầu.', 'DOT02', 'SV011'),
    ('TD015', '2026-09-15', N'Báo cáo tuần 1-2: thiết lập môi trường lab pentest an toàn.', '2026-09-15', N'DaDuyet', N'Kế hoạch rà quét an toàn, đúng quy định.', N'Kế hoạch rà quét an toàn, đúng quy định.', 'DOT02', 'SV012'),
    ('TD016', '2026-09-15', N'Báo cáo tuần 1-2: dựng component thư viện UI Shopee.', '2026-09-15', N'DaDuyet', N'Component đẹp, tuân thủ design system.', N'Component đẹp, tuân thủ design system.', 'DOT02', 'SV013'),
    ('TD017', '2026-09-15', N'Báo cáo tuần 1-2: tiền xử lý tập dữ liệu văn bản NLP VNPT.', '2026-09-14', N'DaDuyet', N'Dữ liệu sạch, phương pháp chuẩn.', N'Dữ liệu sạch, phương pháp chuẩn.', 'DOT02', 'SV014'),
    ('TD018', '2026-09-15', N'Báo cáo tuần 1-2: viết test case tự động cho module giỏ hàng VNPAY.', '2026-09-15', N'DaDuyet', N'Đã bổ sung đầy đủ các edge cases.', N'Đã bổ sung đầy đủ các edge cases.', 'DOT02', 'SV015'),
    ('TD019', '2026-09-15', N'Báo cáo tuần 1-2: tìm hiểu luồng nghiệp vụ đặt vé FPT.', '2026-09-14', N'DaDuyet', N'Tốt, cần tập trung thêm phần thanh toán.', N'Tốt, cần tập trung thêm phần thanh toán.', 'DOT02', 'SV016'),
    ('TD020', '2026-09-15', N'Báo cáo tuần 1-2: cấu hình hệ thống giám sát cảnh báo SOC Viettel.', '2026-09-15', N'DaDuyet', N'Cấu hình chuẩn, phát hiện cảnh báo tốt.', N'Cấu hình chuẩn, phát hiện cảnh báo tốt.', 'DOT02', 'SV017'),
    ('TD021', '2026-09-15', N'Báo cáo tuần 1-2: tối ưu responsive giao diện bán hàng Shopee.', '2026-09-15', N'DaDuyet', N'Giao diện mượt mà trên mobile.', N'Giao diện mượt mà trên mobile.', 'DOT02', 'SV018'),
    ('TD022', '2026-09-15', N'Báo cáo tuần 1-2: thu thập dữ liệu huấn luyện mô hình VNPT.', '2026-09-14', N'DaDuyet', N'Nguồn dữ liệu phong phú, đáng tin cậy.', N'Nguồn dữ liệu phong phú, đáng tin cậy.', 'DOT02', 'SV019'),
    ('TD023', '2026-09-15', N'Báo cáo tuần 1-2: tích hợp Firebase Auth cho app Sao Việt.', '2026-09-15', N'DaDuyet', N'Authentication hoạt động ổn định.', N'Authentication hoạt động ổn định.', 'DOT02', 'SV020'),
    ('TD024', '2026-10-01', N'Báo cáo tuần 3-4: hoàn thành tính năng quản lý đơn hàng.', '2026-09-30', N'DaDuyet', N'Chức năng hoàn thiện tốt.', N'Chức năng hoàn thiện tốt.', 'DOT02', 'SV004'),
    ('TD025', '2026-10-01', N'Báo cáo tuần 3-4: thử nghiệm mô hình phân loại với tập kiểm thử mới.', '2026-10-01', N'DaDuyet', N'Độ chính xác F1-score đạt 92%.', N'Độ chính xác F1-score đạt 92%.', 'DOT02', 'SV005'),
    ('TD026', '2026-10-01', N'Báo cáo tuần 3-4: tối ưu hóa truy vấn cơ sở dữ liệu chậm.', '2026-09-29', N'DaNop', NULL, NULL, 'DOT02', 'SV006'),
    ('TD027', '2026-10-01', N'Báo cáo tuần 3-4: viết API xuất báo cáo Excel cho kế toán.', '2026-09-30', N'DaNop', NULL, NULL, 'DOT02', 'SV007'),
    ('TD028', '2026-10-01', N'Báo cáo tuần 3-4: nghiên cứu áp dụng Redis Cache.', '2026-10-02', N'YeuCauSua', N'Cần bổ sung biểu đồ đo lường hiệu năng trước và sau khi có cache.', N'Cần bổ sung biểu đồ đo lường hiệu năng trước và sau khi có cache.', 'DOT02', 'SV008'),
    ('TD029', '2026-10-01', N'Báo cáo tuần 3-4: triển khai màn hình thông báo đẩy Push Notification.', '2026-10-01', N'DaNop', NULL, NULL, 'DOT02', 'SV009'),
    ('TD030', '2026-10-01', N'Báo cáo tuần 3-4: tự động hóa luồng chuyển dữ liệu hàng ngày.', '2026-09-30', N'DaDuyet', N'Pipeline chạy ổn định, có monitoring đầy đủ.', N'Pipeline chạy ổn định, có monitoring đầy đủ.', 'DOT02', 'SV010'),
    ('TD031', '2026-10-01', N'Báo cáo tuần 3-4: cấu hình auto-scaling trên AWS ECS.', '2026-09-29', N'DaDuyet', N'Kiến trúc chịu tải cao rất ấn tượng.', N'Kiến trúc chịu tải cao rất ấn tượng.', 'DOT02', 'SV011'),
    ('TD032', '2026-10-01', N'Báo cáo tuần 3-4: phát hiện và báo cáo 3 lỗ hổng bảo mật mức Medium.', '2026-09-30', N'DaDuyet', N'Báo cáo chứng minh PoC rõ ràng.', N'Báo cáo chứng minh PoC rõ ràng.', 'DOT02', 'SV012'),
    ('TD033', '2026-10-01', N'Báo cáo tuần 3-4: tích hợp Redux Toolkit quản lý state giỏ hàng.', '2026-10-01', N'DaNop', NULL, NULL, 'DOT02', 'SV013'),
    ('TD034', '2026-10-01', N'Báo cáo tuần 3-4: tinh chỉnh mô hình PhBERT tiếng Việt.', '2026-09-28', N'DaDuyet', N'Fine-tuning hiệu quả, loss giảm đều.', N'Fine-tuning hiệu quả, loss giảm đều.', 'DOT02', 'SV014'),
    ('TD035', '2026-10-01', N'Báo cáo tuần 3-4: chạy bộ kiểm thử tải bằng JMeter.', '2026-10-02', N'YeuCauSua', N'Bổ sung thêm kịch bản kiểm thử 1000 người dùng đồng thời.', N'Bổ sung thêm kịch bản kiểm thử 1000 người dùng đồng thời.', 'DOT02', 'SV015'),
    ('TD036', '2026-10-15', NULL, NULL, N'ChuaNop', NULL, NULL, 'DOT02', 'SV021'),
    ('TD037', '2026-10-15', NULL, NULL, N'ChuaNop', NULL, NULL, 'DOT02', 'SV022'),
    ('TD038', '2026-10-15', NULL, NULL, N'ChuaNop', NULL, NULL, 'DOT02', 'SV023'),
    ('TD039', '2026-10-15', NULL, NULL, N'ChuaNop', NULL, NULL, 'DOT02', 'SV024'),
    ('TD040', '2026-10-15', NULL, NULL, N'ChuaNop', NULL, NULL, 'DOT02', 'SV025');
GO

-- 17. Phiếu chấm điểm (DOT01 & DOT02)
INSERT INTO PHIEUCHAMDIEM (maPhieu, tongDiem, ngayCham, maDot, maSV, maHuongDanDN, maGVHuongDan, nhanXetGV, nhanXetDN, daDoiChieuPhieuDN) VALUES
    ('PCD001', 9.00, '2026-05-25', 'DOT01', 'SV001', 'DD001', 'PC001', N'Báo cáo đầy đủ, bảo vệ tự tin, thái độ tốt.', N'Chủ động học hỏi, hòa nhập nhanh với team.', 1),
    ('PCD002', 9.70, '2026-05-25', 'DOT01', 'SV002', 'DD003', 'PC002', N'Năng lực nghiên cứu xuất sắc, trả lời thuyết phục.', N'Nắm vững kỹ thuật AI, hoàn thành vượt mức.', 1),
    ('PCD003', 7.40, '2026-05-26', 'DOT01', 'SV003', 'DD004', 'PC003', N'Báo cáo cần trình bày mạch lạc hơn.', N'Kỹ năng code khá, cần giao tiếp chủ động hơn.', 1),
    ('PCD004', 8.90, '2026-10-10', 'DOT02', 'SV004', 'DD001', 'PC004', N'Kiến thức nền vững chắc, trả lời phản biện xuất sắc.', N'Đóng góp tính năng quan trọng cho dự án.', 1),
    ('PCD005', 9.70, '2026-10-10', 'DOT02', 'SV005', 'DD001', 'PC005', N'Sản phẩm thực tập hoàn thiện cao, giao diện chuẩn UI/UX.', N'Chuyên cần, kỷ luật cao, tư duy sáng tạo.', 1),
    ('PCD006', 6.70, '2026-10-11', 'DOT02', 'SV006', 'DD003', 'PC006', N'Cần nắm sâu hơn về thuật toán tối ưu dữ liệu.', N'Hoàn thành nhiệm vụ ở mức cơ bản.', 1),
    ('PCD007', 8.15, '2026-10-11', 'DOT02', 'SV007', 'DD004', 'PC007', N'Báo cáo rõ ràng, nắm vững quy trình backend.', N'Kỹ năng chuyên môn tốt, hòa đồng với đồng nghiệp.', 1),
    ('PCD008', 5.00, '2026-10-12', 'DOT02', 'SV008', 'DD004', 'PC008', N'Kiến thức thực tế còn hạn chế, cần rèn luyện thêm.', N'Còn đi muộn vài buổi, cần cải thiện kỷ luật.', 1),
    ('PCD009', 7.60, '2026-10-12', 'DOT02', 'SV009', 'DD005', 'PC009', N'Ứng dụng chạy mượt, trả lời tốt phần kiến trúc mobile.', N'Nhiệt tình, ham học hỏi.', 1),
    ('PCD010', 9.25, '2026-10-13', 'DOT02', 'SV010', 'DD006', 'PC010', N'Pipeline ETL thiết kế chuyên nghiệp, xử lý tốt dữ liệu lớn.', N'Có tư duy data engineering rất vững.', 1),
    ('PCD011', 8.80, '2026-10-13', 'DOT02', 'SV011', 'DD008', 'PC011', N'Tự động hóa CI/CD rất bài bản, triển khai cloud nhanh.', N'Kỹ năng DevOps nổi bật.', 1),
    ('PCD012', 8.40, '2026-10-14', 'DOT02', 'SV012', 'DD008', 'PC012', N'Báo cáo bảo mật chặt chẽ, phát hiện lỗ hổng thực tế có giá trị.', N'Tuân thủ nghiêm ngặt quy định an toàn.', 1),
    ('PCD013', 7.20, '2026-10-14', 'DOT02', 'SV013', 'DD010', 'PC013', N'Giao diện hoàn thiện tốt, cần tối ưu hiệu năng render.', N'Làm việc đúng hạn, tinh thần trách nhiệm.', 1),
    ('PCD014', 9.80, '2026-10-15', 'DOT02', 'SV014', 'DD012', 'PC014', N'Mô hình xử lý ngôn ngữ tiếng Việt đạt kết quả xuất sắc.', N'Tố chất nghiên cứu AI nổi trội.', 1),
    ('PCD015', 6.20, '2026-10-15', 'DOT02', 'SV015', 'DD011', 'PC015', N'Test case tự động chạy được, cần bổ sung kịch bản phức tạp.', N'Cần chủ động báo cáo tiến độ sớm hơn.', 1),
    ('PCD016', 7.85, '2026-10-15', 'DOT02', 'SV016', 'DD001', 'PC016', N'Website đầy đủ tính năng, thuyết trình rõ ràng.', N'Phối hợp tốt với các thành viên trong nhóm.', 1),
    ('PCD017', 8.20, '2026-10-16', 'DOT02', 'SV017', 'DD008', 'PC017', N'Phân tích log mạng chi tiết, phát hiện tốt bất thường.', N'Độc lập giải quyết vấn đề kỹ thuật tốt.', 1),
    ('PCD018', 7.50, '2026-10-16', 'DOT02', 'SV018', 'DD010', 'PC018', N'UI thiết kế chuẩn UX, có tư duy thẩm mỹ tốt.', N'Báo cáo tiến độ đầy đủ, đúng hạn.', 1),
    ('PCD019', 8.40, '2026-10-16', 'DOT02', 'SV019', 'DD012', 'PC019', N'Mô hình dự báo doanh số áp dụng thực tế khả quan.', N'Kỹ năng phân tích số liệu nhạy bén.', 1),
    ('PCD020', 4.50, '2026-10-16', 'DOT02', 'SV020', 'DD005', 'PC020', N'Chưa hoàn thành đủ chức năng đã đăng ký ban đầu.', N'Còn thiếu tập trung trong giờ làm việc.', 1),
    ('PCD021', 3.80, '2026-10-16', 'DOT02', 'SV021', 'DD013', 'PC021', N'Báo cáo sơ sài, không trả lời được câu hỏi chuyên môn.', N'Nghỉ nhiều không lý do, không đạt tiêu chuẩn doanh nghiệp.', 1);
GO

-- 18. Chi tiết chấm điểm theo 11 CLO chuẩn Khoa CNTT
INSERT INTO CHITIETCHAMDIEM (maSo, diemCham, maPhieu, maTieuChi) VALUES
    ('CD0001', 0.65, 'PCD001', 'CLO1.1'),
    ('CD0002', 0.70, 'PCD001', 'CLO1.2'),
    ('CD0003', 0.45, 'PCD001', 'CLO1.3'),
    ('CD0004', 0.45, 'PCD001', 'CLO2.1'),
    ('CD0005', 0.45, 'PCD001', 'CLO2.2'),
    ('CD0006', 0.45, 'PCD001', 'CLO3.1'),
    ('CD0007', 0.45, 'PCD001', 'CLO3.2'),
    ('CD0008', 0.45, 'PCD001', 'CLO3.3'),
    ('CD0009', 0.45, 'PCD001', 'CLO3.4'),
    ('CD0010', 1.80, 'PCD001', 'CLO4.1'),
    ('CD0011', 2.70, 'PCD001', 'CLO4.2'),
    ('CD0012', 0.75, 'PCD002', 'CLO1.1'),
    ('CD0013', 0.75, 'PCD002', 'CLO1.2'),
    ('CD0014', 0.50, 'PCD002', 'CLO1.3'),
    ('CD0015', 0.50, 'PCD002', 'CLO2.1'),
    ('CD0016', 0.45, 'PCD002', 'CLO2.2'),
    ('CD0017', 0.50, 'PCD002', 'CLO3.1'),
    ('CD0018', 0.50, 'PCD002', 'CLO3.2'),
    ('CD0019', 0.50, 'PCD002', 'CLO3.3'),
    ('CD0020', 0.45, 'PCD002', 'CLO3.4'),
    ('CD0021', 1.90, 'PCD002', 'CLO4.1'),
    ('CD0022', 2.90, 'PCD002', 'CLO4.2'),
    ('CD0023', 0.55, 'PCD003', 'CLO1.1'),
    ('CD0024', 0.55, 'PCD003', 'CLO1.2'),
    ('CD0025', 0.40, 'PCD003', 'CLO1.3'),
    ('CD0026', 0.40, 'PCD003', 'CLO2.1'),
    ('CD0027', 0.35, 'PCD003', 'CLO2.2'),
    ('CD0028', 0.40, 'PCD003', 'CLO3.1'),
    ('CD0029', 0.35, 'PCD003', 'CLO3.2'),
    ('CD0030', 0.40, 'PCD003', 'CLO3.3'),
    ('CD0031', 0.40, 'PCD003', 'CLO3.4'),
    ('CD0032', 1.50, 'PCD003', 'CLO4.1'),
    ('CD0033', 2.10, 'PCD003', 'CLO4.2'),
    ('CD0034', 0.70, 'PCD004', 'CLO1.1'),
    ('CD0035', 0.70, 'PCD004', 'CLO1.2'),
    ('CD0036', 0.45, 'PCD004', 'CLO1.3'),
    ('CD0037', 0.45, 'PCD004', 'CLO2.1'),
    ('CD0038', 0.45, 'PCD004', 'CLO2.2'),
    ('CD0039', 0.45, 'PCD004', 'CLO3.1'),
    ('CD0040', 0.45, 'PCD004', 'CLO3.2'),
    ('CD0041', 0.45, 'PCD004', 'CLO3.3'),
    ('CD0042', 0.40, 'PCD004', 'CLO3.4'),
    ('CD0043', 1.80, 'PCD004', 'CLO4.1'),
    ('CD0044', 2.60, 'PCD004', 'CLO4.2'),
    ('CD0045', 0.75, 'PCD005', 'CLO1.1'),
    ('CD0046', 0.75, 'PCD005', 'CLO1.2'),
    ('CD0047', 0.50, 'PCD005', 'CLO1.3'),
    ('CD0048', 0.50, 'PCD005', 'CLO2.1'),
    ('CD0049', 0.50, 'PCD005', 'CLO2.2'),
    ('CD0050', 0.50, 'PCD005', 'CLO3.1');
GO
INSERT INTO CHITIETCHAMDIEM (maSo, diemCham, maPhieu, maTieuChi) VALUES
    ('CD0051', 0.45, 'PCD005', 'CLO3.2'),
    ('CD0052', 0.50, 'PCD005', 'CLO3.3'),
    ('CD0053', 0.45, 'PCD005', 'CLO3.4'),
    ('CD0054', 1.95, 'PCD005', 'CLO4.1'),
    ('CD0055', 2.85, 'PCD005', 'CLO4.2'),
    ('CD0056', 0.50, 'PCD006', 'CLO1.1'),
    ('CD0057', 0.50, 'PCD006', 'CLO1.2'),
    ('CD0058', 0.35, 'PCD006', 'CLO1.3'),
    ('CD0059', 0.35, 'PCD006', 'CLO2.1'),
    ('CD0060', 0.35, 'PCD006', 'CLO2.2'),
    ('CD0061', 0.35, 'PCD006', 'CLO3.1'),
    ('CD0062', 0.35, 'PCD006', 'CLO3.2'),
    ('CD0063', 0.35, 'PCD006', 'CLO3.3'),
    ('CD0064', 0.30, 'PCD006', 'CLO3.4'),
    ('CD0065', 1.40, 'PCD006', 'CLO4.1'),
    ('CD0066', 1.90, 'PCD006', 'CLO4.2'),
    ('CD0067', 0.65, 'PCD007', 'CLO1.1'),
    ('CD0068', 0.65, 'PCD007', 'CLO1.2'),
    ('CD0069', 0.40, 'PCD007', 'CLO1.3'),
    ('CD0070', 0.45, 'PCD007', 'CLO2.1'),
    ('CD0071', 0.40, 'PCD007', 'CLO2.2'),
    ('CD0072', 0.40, 'PCD007', 'CLO3.1'),
    ('CD0073', 0.40, 'PCD007', 'CLO3.2'),
    ('CD0074', 0.40, 'PCD007', 'CLO3.3'),
    ('CD0075', 0.40, 'PCD007', 'CLO3.4'),
    ('CD0076', 1.70, 'PCD007', 'CLO4.1'),
    ('CD0077', 2.30, 'PCD007', 'CLO4.2'),
    ('CD0078', 0.40, 'PCD008', 'CLO1.1'),
    ('CD0079', 0.40, 'PCD008', 'CLO1.2'),
    ('CD0080', 0.25, 'PCD008', 'CLO1.3'),
    ('CD0081', 0.25, 'PCD008', 'CLO2.1'),
    ('CD0082', 0.25, 'PCD008', 'CLO2.2'),
    ('CD0083', 0.25, 'PCD008', 'CLO3.1'),
    ('CD0084', 0.25, 'PCD008', 'CLO3.2'),
    ('CD0085', 0.25, 'PCD008', 'CLO3.3'),
    ('CD0086', 0.20, 'PCD008', 'CLO3.4'),
    ('CD0087', 1.10, 'PCD008', 'CLO4.1'),
    ('CD0088', 1.40, 'PCD008', 'CLO4.2'),
    ('CD0089', 0.60, 'PCD009', 'CLO1.1'),
    ('CD0090', 0.60, 'PCD009', 'CLO1.2'),
    ('CD0091', 0.40, 'PCD009', 'CLO1.3'),
    ('CD0092', 0.40, 'PCD009', 'CLO2.1'),
    ('CD0093', 0.35, 'PCD009', 'CLO2.2'),
    ('CD0094', 0.40, 'PCD009', 'CLO3.1'),
    ('CD0095', 0.40, 'PCD009', 'CLO3.2'),
    ('CD0096', 0.35, 'PCD009', 'CLO3.3'),
    ('CD0097', 0.35, 'PCD009', 'CLO3.4'),
    ('CD0098', 1.60, 'PCD009', 'CLO4.1'),
    ('CD0099', 2.15, 'PCD009', 'CLO4.2'),
    ('CD0100', 0.75, 'PCD010', 'CLO1.1');
GO
INSERT INTO CHITIETCHAMDIEM (maSo, diemCham, maPhieu, maTieuChi) VALUES
    ('CD0101', 0.70, 'PCD010', 'CLO1.2'),
    ('CD0102', 0.45, 'PCD010', 'CLO1.3'),
    ('CD0103', 0.45, 'PCD010', 'CLO2.1'),
    ('CD0104', 0.45, 'PCD010', 'CLO2.2'),
    ('CD0105', 0.50, 'PCD010', 'CLO3.1'),
    ('CD0106', 0.45, 'PCD010', 'CLO3.2'),
    ('CD0107', 0.45, 'PCD010', 'CLO3.3'),
    ('CD0108', 0.45, 'PCD010', 'CLO3.4'),
    ('CD0109', 1.85, 'PCD010', 'CLO4.1'),
    ('CD0110', 2.75, 'PCD010', 'CLO4.2'),
    ('CD0111', 0.70, 'PCD011', 'CLO1.1'),
    ('CD0112', 0.70, 'PCD011', 'CLO1.2'),
    ('CD0113', 0.45, 'PCD011', 'CLO1.3'),
    ('CD0114', 0.45, 'PCD011', 'CLO2.1'),
    ('CD0115', 0.45, 'PCD011', 'CLO2.2'),
    ('CD0116', 0.45, 'PCD011', 'CLO3.1'),
    ('CD0117', 0.45, 'PCD011', 'CLO3.2'),
    ('CD0118', 0.45, 'PCD011', 'CLO3.3'),
    ('CD0119', 0.40, 'PCD011', 'CLO3.4'),
    ('CD0120', 1.80, 'PCD011', 'CLO4.1'),
    ('CD0121', 2.50, 'PCD011', 'CLO4.2'),
    ('CD0122', 0.65, 'PCD012', 'CLO1.1'),
    ('CD0123', 0.65, 'PCD012', 'CLO1.2'),
    ('CD0124', 0.45, 'PCD012', 'CLO1.3'),
    ('CD0125', 0.45, 'PCD012', 'CLO2.1'),
    ('CD0126', 0.40, 'PCD012', 'CLO2.2'),
    ('CD0127', 0.40, 'PCD012', 'CLO3.1'),
    ('CD0128', 0.40, 'PCD012', 'CLO3.2'),
    ('CD0129', 0.40, 'PCD012', 'CLO3.3'),
    ('CD0130', 0.40, 'PCD012', 'CLO3.4'),
    ('CD0131', 1.75, 'PCD012', 'CLO4.1'),
    ('CD0132', 2.45, 'PCD012', 'CLO4.2'),
    ('CD0133', 0.60, 'PCD013', 'CLO1.1'),
    ('CD0134', 0.55, 'PCD013', 'CLO1.2'),
    ('CD0135', 0.35, 'PCD013', 'CLO1.3'),
    ('CD0136', 0.35, 'PCD013', 'CLO2.1'),
    ('CD0137', 0.35, 'PCD013', 'CLO2.2'),
    ('CD0138', 0.40, 'PCD013', 'CLO3.1'),
    ('CD0139', 0.35, 'PCD013', 'CLO3.2'),
    ('CD0140', 0.35, 'PCD013', 'CLO3.3'),
    ('CD0141', 0.35, 'PCD013', 'CLO3.4'),
    ('CD0142', 1.50, 'PCD013', 'CLO4.1'),
    ('CD0143', 2.05, 'PCD013', 'CLO4.2'),
    ('CD0144', 0.75, 'PCD014', 'CLO1.1'),
    ('CD0145', 0.75, 'PCD014', 'CLO1.2'),
    ('CD0146', 0.50, 'PCD014', 'CLO1.3'),
    ('CD0147', 0.50, 'PCD014', 'CLO2.1'),
    ('CD0148', 0.50, 'PCD014', 'CLO2.2'),
    ('CD0149', 0.50, 'PCD014', 'CLO3.1'),
    ('CD0150', 0.50, 'PCD014', 'CLO3.2');
GO
INSERT INTO CHITIETCHAMDIEM (maSo, diemCham, maPhieu, maTieuChi) VALUES
    ('CD0151', 0.45, 'PCD014', 'CLO3.3'),
    ('CD0152', 0.45, 'PCD014', 'CLO3.4'),
    ('CD0153', 2.00, 'PCD014', 'CLO4.1'),
    ('CD0154', 2.90, 'PCD014', 'CLO4.2'),
    ('CD0155', 0.50, 'PCD015', 'CLO1.1'),
    ('CD0156', 0.50, 'PCD015', 'CLO1.2'),
    ('CD0157', 0.30, 'PCD015', 'CLO1.3'),
    ('CD0158', 0.30, 'PCD015', 'CLO2.1'),
    ('CD0159', 0.30, 'PCD015', 'CLO2.2'),
    ('CD0160', 0.30, 'PCD015', 'CLO3.1'),
    ('CD0161', 0.30, 'PCD015', 'CLO3.2'),
    ('CD0162', 0.30, 'PCD015', 'CLO3.3'),
    ('CD0163', 0.30, 'PCD015', 'CLO3.4'),
    ('CD0164', 1.30, 'PCD015', 'CLO4.1'),
    ('CD0165', 1.80, 'PCD015', 'CLO4.2'),
    ('CD0166', 0.65, 'PCD016', 'CLO1.1'),
    ('CD0167', 0.60, 'PCD016', 'CLO1.2'),
    ('CD0168', 0.40, 'PCD016', 'CLO1.3'),
    ('CD0169', 0.40, 'PCD016', 'CLO2.1'),
    ('CD0170', 0.40, 'PCD016', 'CLO2.2'),
    ('CD0171', 0.40, 'PCD016', 'CLO3.1'),
    ('CD0172', 0.40, 'PCD016', 'CLO3.2'),
    ('CD0173', 0.40, 'PCD016', 'CLO3.3'),
    ('CD0174', 0.40, 'PCD016', 'CLO3.4'),
    ('CD0175', 1.65, 'PCD016', 'CLO4.1'),
    ('CD0176', 2.15, 'PCD016', 'CLO4.2'),
    ('CD0177', 0.65, 'PCD017', 'CLO1.1'),
    ('CD0178', 0.65, 'PCD017', 'CLO1.2'),
    ('CD0179', 0.45, 'PCD017', 'CLO1.3'),
    ('CD0180', 0.40, 'PCD017', 'CLO2.1'),
    ('CD0181', 0.40, 'PCD017', 'CLO2.2'),
    ('CD0182', 0.40, 'PCD017', 'CLO3.1'),
    ('CD0183', 0.40, 'PCD017', 'CLO3.2'),
    ('CD0184', 0.40, 'PCD017', 'CLO3.3'),
    ('CD0185', 0.40, 'PCD017', 'CLO3.4'),
    ('CD0186', 1.70, 'PCD017', 'CLO4.1'),
    ('CD0187', 2.35, 'PCD017', 'CLO4.2'),
    ('CD0188', 0.60, 'PCD018', 'CLO1.1'),
    ('CD0189', 0.60, 'PCD018', 'CLO1.2'),
    ('CD0190', 0.35, 'PCD018', 'CLO1.3'),
    ('CD0191', 0.40, 'PCD018', 'CLO2.1'),
    ('CD0192', 0.35, 'PCD018', 'CLO2.2'),
    ('CD0193', 0.40, 'PCD018', 'CLO3.1'),
    ('CD0194', 0.35, 'PCD018', 'CLO3.2'),
    ('CD0195', 0.40, 'PCD018', 'CLO3.3'),
    ('CD0196', 0.35, 'PCD018', 'CLO3.4'),
    ('CD0197', 1.60, 'PCD018', 'CLO4.1'),
    ('CD0198', 2.10, 'PCD018', 'CLO4.2'),
    ('CD0199', 0.70, 'PCD019', 'CLO1.1'),
    ('CD0200', 0.65, 'PCD019', 'CLO1.2');
GO
INSERT INTO CHITIETCHAMDIEM (maSo, diemCham, maPhieu, maTieuChi) VALUES
    ('CD0201', 0.45, 'PCD019', 'CLO1.3'),
    ('CD0202', 0.45, 'PCD019', 'CLO2.1'),
    ('CD0203', 0.40, 'PCD019', 'CLO2.2'),
    ('CD0204', 0.40, 'PCD019', 'CLO3.1'),
    ('CD0205', 0.40, 'PCD019', 'CLO3.2'),
    ('CD0206', 0.40, 'PCD019', 'CLO3.3'),
    ('CD0207', 0.40, 'PCD019', 'CLO3.4'),
    ('CD0208', 1.75, 'PCD019', 'CLO4.1'),
    ('CD0209', 2.40, 'PCD019', 'CLO4.2'),
    ('CD0210', 0.35, 'PCD020', 'CLO1.1'),
    ('CD0211', 0.35, 'PCD020', 'CLO1.2'),
    ('CD0212', 0.20, 'PCD020', 'CLO1.3'),
    ('CD0213', 0.25, 'PCD020', 'CLO2.1'),
    ('CD0214', 0.20, 'PCD020', 'CLO2.2'),
    ('CD0215', 0.25, 'PCD020', 'CLO3.1'),
    ('CD0216', 0.25, 'PCD020', 'CLO3.2'),
    ('CD0217', 0.20, 'PCD020', 'CLO3.3'),
    ('CD0218', 0.20, 'PCD020', 'CLO3.4'),
    ('CD0219', 1.00, 'PCD020', 'CLO4.1'),
    ('CD0220', 1.25, 'PCD020', 'CLO4.2'),
    ('CD0221', 0.30, 'PCD021', 'CLO1.1'),
    ('CD0222', 0.30, 'PCD021', 'CLO1.2'),
    ('CD0223', 0.20, 'PCD021', 'CLO1.3'),
    ('CD0224', 0.20, 'PCD021', 'CLO2.1'),
    ('CD0225', 0.15, 'PCD021', 'CLO2.2'),
    ('CD0226', 0.20, 'PCD021', 'CLO3.1'),
    ('CD0227', 0.20, 'PCD021', 'CLO3.2'),
    ('CD0228', 0.15, 'PCD021', 'CLO3.3'),
    ('CD0229', 0.15, 'PCD021', 'CLO3.4'),
    ('CD0230', 0.80, 'PCD021', 'CLO4.1'),
    ('CD0231', 1.15, 'PCD021', 'CLO4.2');
GO

-- 19. Tài khoản người dùng (Mật khẩu mặc định: 123456)
INSERT INTO TAIKHOAN (maTaiKhoan, tenDangNhap, matKhau, trangThai, maVaiTro, maSV, maGV, maDaiDien, email, soDienThoai) VALUES
    ('TK001', 'admin', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT01', NULL, NULL, NULL, 'admin@uit.edu.vn', '0909000001'),
    ('TK002', 'khoa01', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT02', NULL, NULL, NULL, 'khoacntt@uit.edu.vn', '0909000002'),
    ('TK002B', 'khoa02', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT02', NULL, NULL, NULL, 'khoapdt@uit.edu.vn', '0909000003'),
    ('TK_GV001', 'gv001', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT03', NULL, 'GV001', NULL, 'gv001@uit.edu.vn', '0912000001'),
    ('TK_GV002', 'gv002', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT03', NULL, 'GV002', NULL, 'gv002@uit.edu.vn', '0912000002'),
    ('TK_GV003', 'gv003', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT03', NULL, 'GV003', NULL, 'gv003@uit.edu.vn', '0912000003'),
    ('TK_GV004', 'gv004', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT03', NULL, 'GV004', NULL, 'gv004@uit.edu.vn', '0912000004'),
    ('TK_GV005', 'gv005', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT03', NULL, 'GV005', NULL, 'gv005@uit.edu.vn', '0912000005'),
    ('TK_GV006', 'gv006', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT03', NULL, 'GV006', NULL, 'gv006@uit.edu.vn', '0912000006'),
    ('TK_GV007', 'gv007', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT03', NULL, 'GV007', NULL, 'gv007@uit.edu.vn', '0912000007'),
    ('TK_GV008', 'gv008', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT03', NULL, 'GV008', NULL, 'gv008@uit.edu.vn', '0912000008'),
    ('TK_GV009', 'gv009', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT03', NULL, 'GV009', NULL, 'gv009@uit.edu.vn', '0912000009'),
    ('TK_GV010', 'gv010', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT03', NULL, 'GV010', NULL, 'gv010@uit.edu.vn', '0912000010'),
    ('TK_GV011', 'gv011', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT03', NULL, 'GV011', NULL, 'gv011@uit.edu.vn', '0912000011'),
    ('TK_GV012', 'gv012', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT03', NULL, 'GV012', NULL, 'gv012@uit.edu.vn', '0912000012'),
    ('TK_SV001', 'sv001', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV001', NULL, NULL, 'sv001@student.uit.edu.vn', '0987000001'),
    ('TK_SV002', 'sv002', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV002', NULL, NULL, 'sv002@student.uit.edu.vn', '0987000002'),
    ('TK_SV003', 'sv003', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV003', NULL, NULL, 'sv003@student.uit.edu.vn', '0987000003'),
    ('TK_SV004', 'sv004', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV004', NULL, NULL, 'sv004@student.uit.edu.vn', '0987000004'),
    ('TK_SV005', 'sv005', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV005', NULL, NULL, 'sv005@student.uit.edu.vn', '0987000005'),
    ('TK_SV006', 'sv006', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV006', NULL, NULL, 'sv006@student.uit.edu.vn', '0987000006'),
    ('TK_SV007', 'sv007', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV007', NULL, NULL, 'sv007@student.uit.edu.vn', '0987000007'),
    ('TK_SV008', 'sv008', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV008', NULL, NULL, 'sv008@student.uit.edu.vn', '0987000008'),
    ('TK_SV009', 'sv009', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV009', NULL, NULL, 'sv009@student.uit.edu.vn', '0987000009'),
    ('TK_SV010', 'sv010', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV010', NULL, NULL, 'sv010@student.uit.edu.vn', '0987000010'),
    ('TK_SV011', 'sv011', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV011', NULL, NULL, 'sv011@student.uit.edu.vn', '0987000011'),
    ('TK_SV012', 'sv012', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV012', NULL, NULL, 'sv012@student.uit.edu.vn', '0987000012'),
    ('TK_SV013', 'sv013', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV013', NULL, NULL, 'sv013@student.uit.edu.vn', '0987000013'),
    ('TK_SV014', 'sv014', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV014', NULL, NULL, 'sv014@student.uit.edu.vn', '0987000014'),
    ('TK_SV015', 'sv015', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV015', NULL, NULL, 'sv015@student.uit.edu.vn', '0987000015'),
    ('TK_SV016', 'sv016', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV016', NULL, NULL, 'sv016@student.uit.edu.vn', '0987000016'),
    ('TK_SV017', 'sv017', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV017', NULL, NULL, 'sv017@student.uit.edu.vn', '0987000017'),
    ('TK_SV018', 'sv018', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV018', NULL, NULL, 'sv018@student.uit.edu.vn', '0987000018'),
    ('TK_SV019', 'sv019', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV019', NULL, NULL, 'sv019@student.uit.edu.vn', '0987000019'),
    ('TK_SV020', 'sv020', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV020', NULL, NULL, 'sv020@student.uit.edu.vn', '0987000020'),
    ('TK_SV021', 'sv021', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV021', NULL, NULL, 'sv021@student.uit.edu.vn', '0987000021'),
    ('TK_SV022', 'sv022', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV022', NULL, NULL, 'sv022@student.uit.edu.vn', '0987000022'),
    ('TK_SV023', 'sv023', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV023', NULL, NULL, 'sv023@student.uit.edu.vn', '0987000023'),
    ('TK_SV024', 'sv024', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV024', NULL, NULL, 'sv024@student.uit.edu.vn', '0987000024'),
    ('TK_SV025', 'sv025', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV025', NULL, NULL, 'sv025@student.uit.edu.vn', '0987000025'),
    ('TK_SV026', 'sv026', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV026', NULL, NULL, 'sv026@student.uit.edu.vn', '0987000026'),
    ('TK_SV027', 'sv027', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV027', NULL, NULL, 'sv027@student.uit.edu.vn', '0987000027'),
    ('TK_SV028', 'sv028', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV028', NULL, NULL, 'sv028@student.uit.edu.vn', '0987000028'),
    ('TK_SV029', 'sv029', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV029', NULL, NULL, 'sv029@student.uit.edu.vn', '0987000029'),
    ('TK_SV030', 'sv030', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV030', NULL, NULL, 'sv030@student.uit.edu.vn', '0987000030'),
    ('TK_SV031', 'sv031', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV031', NULL, NULL, 'sv031@student.uit.edu.vn', '0987000031'),
    ('TK_SV032', 'sv032', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV032', NULL, NULL, 'sv032@student.uit.edu.vn', '0987000032'),
    ('TK_SV033', 'sv033', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV033', NULL, NULL, 'sv033@student.uit.edu.vn', '0987000033'),
    ('TK_SV034', 'sv034', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV034', NULL, NULL, 'sv034@student.uit.edu.vn', '0987000034'),
    ('TK_SV035', 'sv035', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT04', 'SV035', NULL, NULL, 'sv035@student.uit.edu.vn', '0987000035'),
    ('TK_DD001', 'dd001', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT05', NULL, NULL, 'DD001', 'dd001@partner.com', '0933000001'),
    ('TK_DD002', 'dd002', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT05', NULL, NULL, 'DD002', 'dd002@partner.com', '0933000002'),
    ('TK_DD003', 'dd003', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT05', NULL, NULL, 'DD003', 'dd003@partner.com', '0933000003'),
    ('TK_DD004', 'dd004', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT05', NULL, NULL, 'DD004', 'dd004@partner.com', '0933000004'),
    ('TK_DD005', 'dd005', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT05', NULL, NULL, 'DD005', 'dd005@partner.com', '0933000005'),
    ('TK_DD006', 'dd006', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT05', NULL, NULL, 'DD006', 'dd006@partner.com', '0933000006'),
    ('TK_DD007', 'dd007', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT05', NULL, NULL, 'DD007', 'dd007@partner.com', '0933000007'),
    ('TK_DD008', 'dd008', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT05', NULL, NULL, 'DD008', 'dd008@partner.com', '0933000008'),
    ('TK_DD009', 'dd009', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT05', NULL, NULL, 'DD009', 'dd009@partner.com', '0933000009'),
    ('TK_DD010', 'dd010', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT05', NULL, NULL, 'DD010', 'dd010@partner.com', '0933000010'),
    ('TK_DD011', 'dd011', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT05', NULL, NULL, 'DD011', 'dd011@partner.com', '0933000011'),
    ('TK_DD012', 'dd012', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT05', NULL, NULL, 'DD012', 'dd012@partner.com', '0933000012'),
    ('TK_DD013', 'dd013', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT05', NULL, NULL, 'DD013', 'dd013@partner.com', '0933000013'),
    ('TK_DD014', 'dd014', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT05', NULL, NULL, 'DD014', 'dd014@partner.com', '0933000014'),
    ('TK_DD015', 'dd015', 'AQAAAAIAAYagAAAAEKt1AQTn5/4ZNMq58lDtuRLyXq7gDpMzLfd0uemeqVYUmnJ5kpjcpP7+eCySF1SJ8g==', N'HoatDong', 'VT05', NULL, NULL, 'DD015', 'dd015@partner.com', '0933000015');
GO
-- ============================================================
-- DỮ LIỆU BẢNG QUY ĐỔI THANG ĐIỂM (Bảng 3. Quy đổi giữa các thang điểm)
-- ============================================================
INSERT INTO THANGDIEM (maThangDiem, xepLoai, diem10Tu, diem10Den, thangDiem4, thangDiemChu, ketQua) VALUES
    ('TD_A',  N'Giỏi',           8.50, 10.00, 4.0, 'A',  N'Đạt'),
    ('TD_BP', N'Khá',            8.00,  8.49, 3.5, 'B+', N'Đạt'),
    ('TD_B',  N'Khá',            7.00,  7.99, 3.0, 'B',  N'Đạt'),
    ('TD_CP', N'Trung bình',     6.50,  6.99, 2.5, 'C+', N'Đạt'),
    ('TD_C',  N'Trung bình',     5.50,  6.49, 2.0, 'C',  N'Đạt'),
    ('TD_DP', N'Trung bình yếu', 5.00,  5.49, 1.5, 'D+', N'Đạt'),
    ('TD_D',  N'Trung bình yếu', 4.00,  4.99, 1.0, 'D',  N'Đạt'),
    ('TD_F',  N'Kém',            0.00,  3.99, 0.0, 'F',  N'Không đạt');
GO

-- ============================================================
-- CÁC HÀM QUY ĐỔI THANG ĐIỂM (Bảng 3. Quy đổi giữa các thang điểm)
-- ============================================================
CREATE OR ALTER FUNCTION dbo.fn_QuyDoiDiemChu(@tongDiem DECIMAL(5,2))
RETURNS VARCHAR(5)
AS
BEGIN
    IF @tongDiem IS NULL RETURN NULL;
    DECLARE @d DECIMAL(4,1) = ROUND(@tongDiem, 1);
    RETURN (
        CASE
            WHEN @d >= 8.5 THEN 'A'
            WHEN @d >= 8.0 THEN 'B+'
            WHEN @d >= 7.0 THEN 'B'
            WHEN @d >= 6.5 THEN 'C+'
            WHEN @d >= 5.5 THEN 'C'
            WHEN @d >= 5.0 THEN 'D+'
            WHEN @d >= 4.0 THEN 'D'
            ELSE 'F'
        END
    );
END;
GO

CREATE OR ALTER FUNCTION dbo.fn_QuyDoiThang4(@tongDiem DECIMAL(5,2))
RETURNS DECIMAL(3,1)
AS
BEGIN
    IF @tongDiem IS NULL RETURN NULL;
    DECLARE @d DECIMAL(4,1) = ROUND(@tongDiem, 1);
    RETURN (
        CASE
            WHEN @d >= 8.5 THEN 4.0
            WHEN @d >= 8.0 THEN 3.5
            WHEN @d >= 7.0 THEN 3.0
            WHEN @d >= 6.5 THEN 2.5
            WHEN @d >= 5.5 THEN 2.0
            WHEN @d >= 5.0 THEN 1.5
            WHEN @d >= 4.0 THEN 1.0
            ELSE 0.0
        END
    );
END;
GO

CREATE OR ALTER FUNCTION dbo.fn_QuyDoiXepLoai(@tongDiem DECIMAL(5,2))
RETURNS NVARCHAR(30)
AS
BEGIN
    IF @tongDiem IS NULL RETURN NULL;
    DECLARE @d DECIMAL(4,1) = ROUND(@tongDiem, 1);
    RETURN (
        CASE
            WHEN @d >= 8.5 THEN N'Giỏi'
            WHEN @d >= 7.0 THEN N'Khá'
            WHEN @d >= 5.5 THEN N'Trung bình'
            WHEN @d >= 4.0 THEN N'Trung bình yếu'
            ELSE N'Kém'
        END
    );
END;
GO

CREATE OR ALTER FUNCTION dbo.fn_QuyDoiKetQua(@tongDiem DECIMAL(5,2))
RETURNS NVARCHAR(20)
AS
BEGIN
    IF @tongDiem IS NULL RETURN NULL;
    DECLARE @d DECIMAL(4,1) = ROUND(@tongDiem, 1);
    RETURN (
        CASE
            WHEN @d >= 4.0 THEN N'Đạt'
            ELSE N'Không đạt'
        END
    );
END;
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
    sv.hoTen                                AS TenSinhVien,
    sv.lop,
    d.tenDot,
    pcd.tongDiem,
    dbo.fn_QuyDoiThang4(pcd.tongDiem)       AS DiemThang4,
    dbo.fn_QuyDoiDiemChu(pcd.tongDiem)      AS DiemChu,
    dbo.fn_QuyDoiXepLoai(pcd.tongDiem)      AS XepLoai,
    dbo.fn_QuyDoiKetQua(pcd.tongDiem)       AS KetQua,
    pcd.ngayCham,
    gv.hoTen                                AS GiangVienHuongDan,
    ct.tenCongTy                            AS CongTyThucTap
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
    td.nhanXetGV,
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

    SELECT 
        @maPhieu AS MaPhieu, 
        @tongDiem AS TongDiem,
        dbo.fn_QuyDoiThang4(@tongDiem)  AS DiemThang4,
        dbo.fn_QuyDoiDiemChu(@tongDiem) AS DiemChu,
        dbo.fn_QuyDoiXepLoai(@tongDiem) AS XepLoai,
        dbo.fn_QuyDoiKetQua(@tongDiem)  AS KetQua;
END;
GO

PRINT N'✅ Tạo cơ sở dữ liệu QuanLyThucTap thành công!';
PRINT N'✅ Đã tạo 19 bảng, index, trigger, view, stored procedure và dữ liệu mẫu.';
GO
