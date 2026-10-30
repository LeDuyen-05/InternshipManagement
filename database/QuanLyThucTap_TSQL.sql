-- ============================================================
-- HỆ THỐNG QUẢN LÝ THỰC TẬP TỐT NGHIỆP
-- T-SQL tạo CSDL TEST riêng QuanLyThucTap_WebTest; KHÔNG ghi vào QuanLyThucTap gốc.
-- ============================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'QuanLyThucTap_WebTest')
BEGIN
    CREATE DATABASE QuanLyThucTap_WebTest
    COLLATE Vietnamese_CI_AS;
END
GO

USE QuanLyThucTap_WebTest;
GO

SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================
-- CHỈ KHỞI TẠO CSDL RỖNG. Chạy lại giữ nguyên dữ liệu đang test.
-- Khi bị chặn, mở kết nối/query mới trước khi chạy script khác (NOEXEC ON).
IF EXISTS (SELECT 1 FROM sys.tables)
BEGIN
    RAISERROR(N'CSDL đã có bảng. Dừng để bảo toàn dữ liệu; hãy dùng CSDL test rỗng mới.', 16, 1);
    SET NOEXEC ON;
END;
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
    HanDieuChinhNoiThucTap DATETIMEOFFSET NULL,
    MoChamGV DATETIMEOFFSET NULL,
    HanChamGV DATETIMEOFFSET NULL,
    HanChamDN DATETIMEOFFSET NULL,
    PhienBanThoiHan INT NOT NULL DEFAULT 0,
    CONSTRAINT PK_DOTTHUCTAP PRIMARY KEY (maSo),
    CONSTRAINT CK_DOTTHUCTAP_THOIGIAN  CHECK (thoiGianKT >= thoiGianBD),
    CONSTRAINT CK_DOTTHUCTAP_TRANGTHAI CHECK (trangThai IN (N'ChuaBatDau', N'DangDienRa', N'DaKetThuc'))
);
GO

-- ============================================================
-- Danh sách SV tham gia đợt do Khoa chủ động thêm (không tự gán toàn bộ SV).
CREATE TABLE NHATKYTHOIHAN (
    MaNhatKy NVARCHAR(20) NOT NULL PRIMARY KEY,
    MaDot NVARCHAR(20) NOT NULL,
    Loai NVARCHAR(30) NOT NULL,
    Truoc NVARCHAR(MAX) NOT NULL,
    Sau NVARCHAR(MAX) NOT NULL,
    LyDo NVARCHAR(1000) NOT NULL,
    NguoiThucHien NVARCHAR(20) NOT NULL,
    ThoiDiem DATETIMEOFFSET NOT NULL,
    CONSTRAINT FK_NKTH_DOT FOREIGN KEY (MaDot) REFERENCES DOTTHUCTAP(maSo)
);
GO

CREATE TABLE CONGTYTHEODOT (
    MaGVGioiThieu NVARCHAR(20) NULL,
    MaCongTy NVARCHAR(20) NOT NULL, MaDot NVARCHAR(20) NOT NULL,
    ViTriTuyen NVARCHAR(500) NOT NULL, YeuCau NVARCHAR(MAX) NOT NULL,
    SoLuongNhan INT NOT NULL, MoDangKy DATETIMEOFFSET NOT NULL, HanDangKy DATETIMEOFFSET NOT NULL,
    HoatDong BIT NOT NULL DEFAULT 1, PhienBan INT NOT NULL DEFAULT 0,
    CONSTRAINT PK_CONGTYTHEODOT PRIMARY KEY (MaCongTy,MaDot),
    CONSTRAINT FK_CT_DOT_CT FOREIGN KEY (MaCongTy) REFERENCES CONGTY(maCongTy),
    CONSTRAINT FK_CT_DOT_DOT FOREIGN KEY (MaDot) REFERENCES DOTTHUCTAP(maSo),
    CONSTRAINT FK_CT_DOT_GV FOREIGN KEY (MaGVGioiThieu) REFERENCES GIANGVIEN(maGV),
    CONSTRAINT CK_CT_DOT_SOLUONG CHECK (SoLuongNhan > 0),
    CONSTRAINT CK_CT_DOT_HAN CHECK (HanDangKy > MoDangKy)
);
GO

CREATE TABLE SVTHAMGIADOT (
    MaDot NVARCHAR(20) NOT NULL,
    MaSV NVARCHAR(20) NOT NULL,
    DangThamGia BIT NOT NULL CONSTRAINT DF_SVTGD_ACTIVE DEFAULT 1,
    NgayThem DATETIMEOFFSET NOT NULL,
    NguoiThem NVARCHAR(20) NOT NULL,
    NgayCapNhat DATETIMEOFFSET NOT NULL,
    NguoiCapNhat NVARCHAR(20) NOT NULL,
    CONSTRAINT PK_SVTHAMGIADOT PRIMARY KEY (MaDot, MaSV),
    CONSTRAINT FK_SVTGD_DOT FOREIGN KEY (MaDot) REFERENCES DOTTHUCTAP(maSo),
    CONSTRAINT FK_SVTGD_SV FOREIGN KEY (MaSV) REFERENCES SINHVIEN(maSV)
);
GO

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
    MaDK NVARCHAR(20) NULL,
    LyDoKetQua NVARCHAR(1000) NULL,
    NguonKetQua NVARCHAR(20) NULL,
    NguoiGhiKetQua NVARCHAR(20) NULL,
    ThoiDiemKetQua DATETIMEOFFSET NULL,
    maPV        NVARCHAR(20)    NOT NULL,
    hinhThuc    NVARCHAR(100)   NULL,
    ngayPV      DATETIME2(0)    NOT NULL,   -- ngày + giờ phỏng vấn
    ketQua      NVARCHAR(50)    NULL,
    maDaiDien   NVARCHAR(20)    NOT NULL,
    maSV        NVARCHAR(20)    NOT NULL,
    CONSTRAINT PK_PHONGVAN PRIMARY KEY (maPV),
    CONSTRAINT FK_PV_DAIDIENDOANHNGHIEP FOREIGN KEY (maDaiDien) REFERENCES DAIDIENDOANHNGHIEP(maSo),
    CONSTRAINT FK_PV_SINHVIEN           FOREIGN KEY (maSV)      REFERENCES SINHVIEN(maSV),
    CONSTRAINT CK_PV_KETQUA             CHECK (ketQua IN (N'Dat', N'KhongDat', N'Vang', N'ChuaCoKetQua'))
);
GO

-- ============================================================
-- BẢNG 11: DANGKYTHUCTAP
-- Lưu nguyện vọng đăng ký thực tập của sinh viên
-- ============================================================
CREATE TABLE DANGKYTHUCTAP (
    ViTriDangKy NVARCHAR(500) NULL,
    YeuCauDangKy NVARCHAR(MAX) NULL,
    LyDoKetThuc NVARCHAR(1000) NULL,
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
ALTER TABLE PHONGVAN ADD CONSTRAINT FK_PV_DANGKY FOREIGN KEY (MaDK) REFERENCES DANGKYTHUCTAP(maDK);
CREATE INDEX IX_PV_DANGKY ON PHONGVAN(MaDK);
CREATE UNIQUE INDEX UQ_PV_DANGKY_CHO ON PHONGVAN(MaDK) WHERE MaDK IS NOT NULL AND ketQua = N'ChuaCoKetQua';
GO

CREATE TABLE NHATKYPHONGVAN (
    MaNhatKy NVARCHAR(20) NOT NULL PRIMARY KEY,
    MaPV NVARCHAR(20) NOT NULL,
    MaDK NVARCHAR(20) NOT NULL,
    KetQuaCu NVARCHAR(50) NULL,
    KetQuaMoi NVARCHAR(50) NOT NULL,
    LyDo NVARCHAR(1000) NOT NULL,
    Nguon NVARCHAR(20) NOT NULL,
    NguoiThucHien NVARCHAR(20) NOT NULL,
    ThoiDiem DATETIMEOFFSET NOT NULL,
    CONSTRAINT FK_NKPV_PV FOREIGN KEY (MaPV) REFERENCES PHONGVAN(maPV),
    CONSTRAINT FK_NKPV_DK FOREIGN KEY (MaDK) REFERENCES DANGKYTHUCTAP(maDK)
);
GO

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
    daDuocKhoaDuyet BIT NOT NULL CONSTRAINT DF_PBTT_KHOADUYET DEFAULT 1,
    ngaySVXacNhan DATETIME2 NULL,
    ngayKhoaDuyet DATETIME2 NULL,
    nguoiKhoaDuyet NVARCHAR(20) NULL,
    LyDoHuy NVARCHAR(1000) NULL,
    CanCuHuy NVARCHAR(1000) NULL,
    NguoiHuy NVARCHAR(20) NULL,
    NgayHuy DATETIMEOFFSET NULL,
    TrangThaiXuLyLai NVARCHAR(30) NULL,
    MaPhanBoTruoc NVARCHAR(20) NULL,
    NguonPhanBo NVARCHAR(30) NULL,
    NgayBatDauThucTap DATE NULL,
    NgayKetThucThucTap DATE NULL,
    PhienBanThoiGian INT NOT NULL DEFAULT 0,
    CONSTRAINT FK_PBTT_TRUOC FOREIGN KEY (MaPhanBoTruoc) REFERENCES PHANBOTHUCTAP(maPB),
    CONSTRAINT CK_PBTT_TRANGTHAI  CHECK (trangThai IN (N'ChuaNhanViec', N'ChoKhoaDuyet', N'DangThucTap', N'HoanThanh', N'Huy'))
);
GO

-- ============================================================
-- Nhật ký tiếp nhận hồ sơ trực tiếp, đặt hạn, hủy và phân bổ lại do Khoa xử lý.
CREATE TABLE NHATKYDIEUCHINHTHUCTAP (
    MaNhatKy NVARCHAR(20) NOT NULL PRIMARY KEY,
    MaDot NVARCHAR(20) NOT NULL,
    MaSV NVARCHAR(20) NULL,
    MaPhanBo NVARCHAR(20) NULL,
    Loai NVARCHAR(30) NOT NULL,
    LyDo NVARCHAR(1000) NOT NULL,
    CanCu NVARCHAR(1000) NOT NULL,
    NoiDung NVARCHAR(2000) NOT NULL,
    NguoiThucHien NVARCHAR(20) NOT NULL,
    ThoiDiem DATETIMEOFFSET NOT NULL,
    CONSTRAINT FK_NKDCTT_DOT FOREIGN KEY (MaDot) REFERENCES DOTTHUCTAP(maSo),
    CONSTRAINT FK_NKDCTT_SV FOREIGN KEY (MaSV) REFERENCES SINHVIEN(maSV),
    CONSTRAINT FK_NKDCTT_PB FOREIGN KEY (MaPhanBo) REFERENCES PHANBOTHUCTAP(maPB)
);
CREATE INDEX IX_NKDCTT_DOT_SV ON NHATKYDIEUCHINHTHUCTAP(MaDot, MaSV, ThoiDiem);
GO

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
    MaPhanBoLuuTru NVARCHAR(20) NULL,
    mocThoiGian     DATE            NOT NULL,
    noiDungBaoCao   NVARCHAR(MAX)   NULL,
    ngayNop         DATETIME2       NULL,
    NopTre          BIT             NULL,
    HanNopBoSung    DATETIMEOFFSET  NULL,
    trangThaiDuyet  NVARCHAR(50)    NOT NULL DEFAULT N'ChuaNop',
    nhanXet         NVARCHAR(1000)  NULL,
    nhanXetGV       NVARCHAR(500)   NULL,  
    maDot           NVARCHAR(20)    NOT NULL,
    maSV            NVARCHAR(20)    NOT NULL,
    CONSTRAINT PK_TIENDOTHUCTAP PRIMARY KEY (maTienDo),
    CONSTRAINT FK_TDTT_LUUTRU FOREIGN KEY (MaPhanBoLuuTru) REFERENCES PHANBOTHUCTAP(maPB),
    CONSTRAINT FK_TDTT_DOTTHUCTAP FOREIGN KEY (maDot) REFERENCES DOTTHUCTAP(maSo),
    CONSTRAINT FK_TDTT_SINHVIEN   FOREIGN KEY (maSV)  REFERENCES SINHVIEN(maSV),
    CONSTRAINT CK_TDTT_TRANGTHAI  CHECK (trangThaiDuyet IN (N'ChuaNop', N'DaNop', N'DaDuyet', N'YeuCauSua'))
);
GO

-- ============================================================
-- BẢNG 15: TIEUCHI
-- Danh sách tiêu chí chấm điểm (CLO) thực tập
-- nhomDanhGia: 'GV' = giảng viên hướng dẫn chấm (CLO1.1 - CLO3.4: 5.0đ),
--              'DN' = đơn vị thực tập chấm qua phiếu nhận xét (CLO4.1 - CLO4.2: 5.0đ).
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
    securityStamp NVARCHAR(32)   NOT NULL CONSTRAINT DF_TAIKHOAN_securityStamp DEFAULT (REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', '')),
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

-- 2. Tiêu chí chấm điểm CLO chuẩn Khoa CNTT (Duy nhất 1 bộ 11 tiêu chí CLO, Tổng điểm tối đa = 10)
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

-- 4. Giảng viên: chiTieuHD là hạn mức; tải thực tế đếm từ GVHUONGDAN theo đợt.
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

-- 11. Phân công giảng viên hướng dẫn
-- Giữ phân công SV001-SV021 để bảo toàn liên kết phiếu điểm mẫu.
-- SV022-SV030 đã có nơi thực tập nhưng chưa có GVHD, dùng để thử phân công thủ công/tự động.
-- SV031 trở đi chưa đăng ký thực tập và chưa được phân công GVHD.
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
    ('PC021', '2026-08-20', N'DangHuongDan', 'GV001', 'SV021');
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
CREATE OR ALTER VIEW vw_DiemCLOHopLe AS
SELECT p.maPhieu,
 CASE WHEN COUNT(c.maSo)=r.SoTieuChi AND r.SoTieuChi>0 AND r.SoGV>0 AND r.SoDN>0 AND r.TongToiDa=10
 AND COUNT(c.maSo)=SUM(CASE WHEN t.maRubric=d.maRubric AND c.diemCham BETWEEN 0 AND t.diemToiDa THEN 1 ELSE 0 END)
 THEN ROUND(SUM(c.diemCham),1) ELSE NULL END AS TongDiemHopLe
FROM PHIEUCHAMDIEM p JOIN DOTTHUCTAP d ON d.maSo=p.maDot
CROSS APPLY (SELECT COUNT(*) SoTieuChi,SUM(CASE WHEN nhomDanhGia='GV' THEN 1 ELSE 0 END) SoGV,
 SUM(CASE WHEN nhomDanhGia='DN' THEN 1 ELSE 0 END) SoDN,SUM(diemToiDa) TongToiDa FROM TIEUCHI WHERE maRubric=d.maRubric) r
LEFT JOIN CHITIETCHAMDIEM c ON c.maPhieu=p.maPhieu LEFT JOIN TIEUCHI t ON t.maTieuChi=c.maTieuChi
GROUP BY p.maPhieu,r.SoTieuChi,r.SoGV,r.SoDN,r.TongToiDa,d.maRubric;
GO

CREATE OR ALTER VIEW vw_KetQuaDiemThucTap AS
SELECT
    sv.maSV,
    sv.hoTen                                AS TenSinhVien,
    sv.lop,
    d.tenDot,
    clo.TongDiemHopLe AS tongDiem,
    dbo.fn_QuyDoiThang4(clo.TongDiemHopLe)       AS DiemThang4,
    dbo.fn_QuyDoiDiemChu(clo.TongDiemHopLe)      AS DiemChu,
    dbo.fn_QuyDoiXepLoai(clo.TongDiemHopLe)      AS XepLoai,
    dbo.fn_QuyDoiKetQua(clo.TongDiemHopLe)       AS KetQua,
    pcd.ngayCham,
    gv.hoTen                                AS GiangVienHuongDan,
    ct.tenCongTy                            AS CongTyThucTap
FROM PHIEUCHAMDIEM pcd JOIN vw_DiemCLOHopLe clo ON clo.maPhieu=pcd.maPhieu
JOIN SINHVIEN     sv  ON sv.maSV      = pcd.maSV
JOIN DOTTHUCTAP   d   ON d.maSo       = pcd.maDot
LEFT JOIN GVHUONGDAN gvhd ON gvhd.maSo  = pcd.maGVHuongDan
LEFT JOIN GIANGVIEN  gv   ON gv.maGV    = gvhd.maGV
LEFT JOIN PHANBOTHUCTAP pb ON pb.maSV   = pcd.maSV AND pb.maDot = pcd.maDot AND pb.trangThai <> N'Huy'
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

    SELECT @tongDiem = TongDiemHopLe FROM vw_DiemCLOHopLe WHERE maPhieu = @maPhieu;

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

-- Phần dữ liệu kiểm thử mở rộng và thông báo hoàn tất ở cuối file.

GO

-- BEGIN GENERATED WEB TEST DATA
-- Generated by scripts/database/Sync-TestSchema.ps1. Edit migration sources or fixtures, then sync.
-- Migration: AccountSecurity
IF COL_LENGTH('TAIKHOAN','securityStamp') IS NULL
          ALTER TABLE TAIKHOAN ADD securityStamp NVARCHAR(32) NOT NULL
              CONSTRAINT DF_TAIKHOAN_securityStamp DEFAULT (REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', '')) WITH VALUES;
GO
-- Migration: GVHuongDanRound
IF COL_LENGTH('GVHUONGDAN', 'maDot') IS NULL
            ALTER TABLE GVHUONGDAN ADD maDot NVARCHAR(20) NULL;
GO
UPDATE hd SET maDot = source.maDot
        FROM GVHUONGDAN hd
        JOIN (
            SELECT maGVHuongDan, MIN(maDot) AS maDot
            FROM PHIEUCHAMDIEM
            WHERE maGVHuongDan IS NOT NULL
            GROUP BY maGVHuongDan HAVING COUNT(DISTINCT maDot) = 1
        ) source ON source.maGVHuongDan = hd.maSo
        WHERE hd.maDot IS NULL;

        UPDATE hd SET maDot = source.maDot
        FROM GVHUONGDAN hd
        JOIN (
            SELECT maSV, MIN(maDot) AS maDot
            FROM PHANBOTHUCTAP
            GROUP BY maSV HAVING COUNT(DISTINCT maDot) = 1
        ) source ON source.maSV = hd.maSV
        WHERE hd.maDot IS NULL
          AND NOT EXISTS (SELECT 1 FROM PHIEUCHAMDIEM p WHERE p.maGVHuongDan = hd.maSo);
GO
SET XACT_ABORT ON;
        BEGIN TRANSACTION;
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_GVHD_DOTTHUCTAP')
            ALTER TABLE GVHUONGDAN WITH CHECK ADD CONSTRAINT FK_GVHD_DOTTHUCTAP
                FOREIGN KEY (maDot) REFERENCES DOTTHUCTAP(maSo);
        IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('GVHUONGDAN') AND name = 'UQ_GVHD_SV_ACTIVE')
            DROP INDEX UQ_GVHD_SV_ACTIVE ON GVHUONGDAN;
        IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('GVHUONGDAN') AND name = 'IX_GVHUONGDAN_maSV' AND is_unique = 1)
            DROP INDEX IX_GVHUONGDAN_maSV ON GVHUONGDAN;
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('GVHUONGDAN') AND name = 'UQ_GVHD_SV_DOT_ACTIVE')
            CREATE UNIQUE INDEX UQ_GVHD_SV_DOT_ACTIVE ON GVHUONGDAN(maSV, maDot)
                WHERE trangThai = N'DangHuongDan' AND maDot IS NOT NULL;
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('GVHUONGDAN') AND name = 'UQ_GVHD_LEGACY_ACTIVE')
            CREATE UNIQUE INDEX UQ_GVHD_LEGACY_ACTIVE ON GVHUONGDAN(maSV)
                WHERE trangThai = N'DangHuongDan' AND maDot IS NULL;
        COMMIT TRANSACTION;
GO
-- Migration: ThucTapTuTim
IF COL_LENGTH('CONGTY', 'chiTiepNhanTuTim') IS NULL
            ALTER TABLE CONGTY ADD chiTiepNhanTuTim BIT NOT NULL CONSTRAINT DF_CT_TUTIM DEFAULT 0;
GO
IF OBJECT_ID(N'DEXUATTHUCTAPTUTIM', N'U') IS NULL
        BEGIN
            CREATE TABLE DEXUATTHUCTAPTUTIM (
                MaHoSo NVARCHAR(20) NOT NULL CONSTRAINT PK_TUTIM PRIMARY KEY,
                MaSV NVARCHAR(20) NOT NULL,
                MaDot NVARCHAR(20) NOT NULL,
                MaCongTy NVARCHAR(20) NULL,
                TenCongTy NVARCHAR(200) NOT NULL,
                DiaChi NVARCHAR(500) NOT NULL,
                ViTri NVARCHAR(200) NOT NULL,
                NguoiLienHe NVARCHAR(200) NOT NULL,
                LienHe NVARCHAR(200) NOT NULL,
                NgayBatDau DATETIME2 NOT NULL,
                NgayKetThuc DATETIME2 NOT NULL,
                TrangThai NVARCHAR(20) NOT NULL,
                NgayGui DATETIME2 NOT NULL,
                NgayDuyet DATETIME2 NULL,
                NguoiDuyet NVARCHAR(20) NULL,
                LyDo NVARCHAR(1000) NULL,
                MaPhanBo NVARCHAR(20) NULL,
                CONSTRAINT FK_TUTIM_SV FOREIGN KEY (MaSV) REFERENCES SINHVIEN(maSV),
                CONSTRAINT FK_TUTIM_DOT FOREIGN KEY (MaDot) REFERENCES DOTTHUCTAP(maSo),
                CONSTRAINT FK_TUTIM_CT FOREIGN KEY (MaCongTy) REFERENCES CONGTY(maCongTy),
                CONSTRAINT FK_TUTIM_PB FOREIGN KEY (MaPhanBo) REFERENCES PHANBOTHUCTAP(maPB),
                CONSTRAINT CK_TUTIM_DATE CHECK (NgayKetThuc >= NgayBatDau),
                CONSTRAINT CK_TUTIM_STATUS CHECK (TrangThai IN (N'ChoDuyet', N'DaDuyet', N'TuChoi'))
            );
        END;
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('DEXUATTHUCTAPTUTIM') AND name = 'UQ_TUTIM_CHO_DUYET')
            CREATE UNIQUE INDEX UQ_TUTIM_CHO_DUYET ON DEXUATTHUCTAPTUTIM(MaSV, MaDot) WHERE TrangThai = N'ChoDuyet';
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('DEXUATTHUCTAPTUTIM') AND name = 'UQ_TUTIM_PHANBO')
            CREATE UNIQUE INDEX UQ_TUTIM_PHANBO ON DEXUATTHUCTAPTUTIM(MaPhanBo) WHERE MaPhanBo IS NOT NULL;
GO
-- Migration: KhoaChotPhanBo
IF COL_LENGTH('PHANBOTHUCTAP', 'daDuocKhoaDuyet') IS NULL
            ALTER TABLE PHANBOTHUCTAP ADD daDuocKhoaDuyet BIT NOT NULL CONSTRAINT DF_PBTT_KHOADUYET DEFAULT 1 WITH VALUES;
        IF COL_LENGTH('PHANBOTHUCTAP', 'ngaySVXacNhan') IS NULL
            ALTER TABLE PHANBOTHUCTAP ADD ngaySVXacNhan DATETIME2 NULL;
        IF COL_LENGTH('PHANBOTHUCTAP', 'ngayKhoaDuyet') IS NULL
            ALTER TABLE PHANBOTHUCTAP ADD ngayKhoaDuyet DATETIME2 NULL;
        IF COL_LENGTH('PHANBOTHUCTAP', 'nguoiKhoaDuyet') IS NULL
            ALTER TABLE PHANBOTHUCTAP ADD nguoiKhoaDuyet NVARCHAR(20) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('PHANBOTHUCTAP')
                       AND name = 'CK_PBTT_TRANGTHAI' AND definition LIKE '%ChoKhoaDuyet%')
        BEGIN
            SET XACT_ABORT ON;
            BEGIN TRANSACTION;
            IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('PHANBOTHUCTAP') AND name = 'CK_PBTT_TRANGTHAI')
                ALTER TABLE PHANBOTHUCTAP DROP CONSTRAINT CK_PBTT_TRANGTHAI;
            ALTER TABLE PHANBOTHUCTAP WITH CHECK ADD CONSTRAINT CK_PBTT_TRANGTHAI
                CHECK (trangThai IN (N'ChuaNhanViec', N'ChoKhoaDuyet', N'DangThucTap', N'HoanThanh', N'Huy'));
            COMMIT TRANSACTION;
        END;
GO
-- Migration: SinhVienThamGiaDot
IF OBJECT_ID(N'SVTHAMGIADOT', N'U') IS NULL
        BEGIN
            CREATE TABLE SVTHAMGIADOT (
                MaDot NVARCHAR(20) NOT NULL,
                MaSV NVARCHAR(20) NOT NULL,
                DangThamGia BIT NOT NULL CONSTRAINT DF_SVTGD_ACTIVE DEFAULT 1,
                NgayThem DATETIMEOFFSET NOT NULL,
                NguoiThem NVARCHAR(20) NOT NULL,
                NgayCapNhat DATETIMEOFFSET NOT NULL,
                NguoiCapNhat NVARCHAR(20) NOT NULL,
                CONSTRAINT PK_SVTHAMGIADOT PRIMARY KEY (MaDot, MaSV),
                CONSTRAINT FK_SVTGD_DOT FOREIGN KEY (MaDot) REFERENCES DOTTHUCTAP(maSo),
                CONSTRAINT FK_SVTGD_SV FOREIGN KEY (MaSV) REFERENCES SINHVIEN(maSV)
            );
        END;
GO
-- Migration: DieuChinhNoiThucTap
IF COL_LENGTH('DOTTHUCTAP', 'HanDieuChinhNoiThucTap') IS NULL
            ALTER TABLE DOTTHUCTAP ADD HanDieuChinhNoiThucTap DATETIMEOFFSET NULL;
        IF COL_LENGTH('PHANBOTHUCTAP', 'LyDoHuy') IS NULL ALTER TABLE PHANBOTHUCTAP ADD LyDoHuy NVARCHAR(1000) NULL;
        IF COL_LENGTH('PHANBOTHUCTAP', 'CanCuHuy') IS NULL ALTER TABLE PHANBOTHUCTAP ADD CanCuHuy NVARCHAR(1000) NULL;
        IF COL_LENGTH('PHANBOTHUCTAP', 'NguoiHuy') IS NULL ALTER TABLE PHANBOTHUCTAP ADD NguoiHuy NVARCHAR(20) NULL;
        IF COL_LENGTH('PHANBOTHUCTAP', 'NgayHuy') IS NULL ALTER TABLE PHANBOTHUCTAP ADD NgayHuy DATETIMEOFFSET NULL;
        IF COL_LENGTH('PHANBOTHUCTAP', 'TrangThaiXuLyLai') IS NULL ALTER TABLE PHANBOTHUCTAP ADD TrangThaiXuLyLai NVARCHAR(30) NULL;
        IF COL_LENGTH('PHANBOTHUCTAP', 'MaPhanBoTruoc') IS NULL ALTER TABLE PHANBOTHUCTAP ADD MaPhanBoTruoc NVARCHAR(20) NULL;
        IF COL_LENGTH('PHANBOTHUCTAP', 'NguonPhanBo') IS NULL ALTER TABLE PHANBOTHUCTAP ADD NguonPhanBo NVARCHAR(30) NULL;
        IF COL_LENGTH('TIENDOTHUCTAP', 'MaPhanBoLuuTru') IS NULL ALTER TABLE TIENDOTHUCTAP ADD MaPhanBoLuuTru NVARCHAR(20) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_PBTT_TRUOC')
            ALTER TABLE PHANBOTHUCTAP ADD CONSTRAINT FK_PBTT_TRUOC FOREIGN KEY (MaPhanBoTruoc) REFERENCES PHANBOTHUCTAP(maPB);
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_TDTT_LUUTRU')
            ALTER TABLE TIENDOTHUCTAP ADD CONSTRAINT FK_TDTT_LUUTRU FOREIGN KEY (MaPhanBoLuuTru) REFERENCES PHANBOTHUCTAP(maPB);
        IF OBJECT_ID('NHATKYDIEUCHINHTHUCTAP', 'U') IS NULL
        BEGIN
            CREATE TABLE NHATKYDIEUCHINHTHUCTAP (
                MaNhatKy NVARCHAR(20) NOT NULL PRIMARY KEY,
                MaDot NVARCHAR(20) NOT NULL,
                MaSV NVARCHAR(20) NULL,
                MaPhanBo NVARCHAR(20) NULL,
                Loai NVARCHAR(30) NOT NULL,
                LyDo NVARCHAR(1000) NOT NULL,
                CanCu NVARCHAR(1000) NOT NULL,
                NoiDung NVARCHAR(2000) NOT NULL,
                NguoiThucHien NVARCHAR(20) NOT NULL,
                ThoiDiem DATETIMEOFFSET NOT NULL,
                CONSTRAINT FK_NKDCTT_DOT FOREIGN KEY (MaDot) REFERENCES DOTTHUCTAP(maSo),
                CONSTRAINT FK_NKDCTT_SV FOREIGN KEY (MaSV) REFERENCES SINHVIEN(maSV),
                CONSTRAINT FK_NKDCTT_PB FOREIGN KEY (MaPhanBo) REFERENCES PHANBOTHUCTAP(maPB)
            );
            CREATE INDEX IX_NKDCTT_DOT_SV ON NHATKYDIEUCHINHTHUCTAP(MaDot, MaSV, ThoiDiem);
        END;
GO
-- Migration: InterviewOutcome
IF COL_LENGTH('PHONGVAN', 'MaDK') IS NULL ALTER TABLE PHONGVAN ADD MaDK NVARCHAR(20) NULL;
        IF COL_LENGTH('PHONGVAN', 'LyDoKetQua') IS NULL ALTER TABLE PHONGVAN ADD LyDoKetQua NVARCHAR(1000) NULL;
        IF COL_LENGTH('PHONGVAN', 'NguonKetQua') IS NULL ALTER TABLE PHONGVAN ADD NguonKetQua NVARCHAR(20) NULL;
        IF COL_LENGTH('PHONGVAN', 'NguoiGhiKetQua') IS NULL ALTER TABLE PHONGVAN ADD NguoiGhiKetQua NVARCHAR(20) NULL;
        IF COL_LENGTH('PHONGVAN', 'ThoiDiemKetQua') IS NULL ALTER TABLE PHONGVAN ADD ThoiDiemKetQua DATETIMEOFFSET NULL;
        IF COL_LENGTH('DANGKYTHUCTAP', 'LyDoKetThuc') IS NULL ALTER TABLE DANGKYTHUCTAP ADD LyDoKetThuc NVARCHAR(1000) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_PV_DANGKY')
            ALTER TABLE PHONGVAN ADD CONSTRAINT FK_PV_DANGKY FOREIGN KEY (MaDK) REFERENCES DANGKYTHUCTAP(maDK);
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('PHONGVAN') AND name = 'IX_PV_DANGKY')
            CREATE INDEX IX_PV_DANGKY ON PHONGVAN(MaDK);
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('PHONGVAN') AND name = 'UQ_PV_DANGKY_CHO')
            CREATE UNIQUE INDEX UQ_PV_DANGKY_CHO ON PHONGVAN(MaDK) WHERE MaDK IS NOT NULL AND ketQua = N'ChuaCoKetQua';
        IF OBJECT_ID('NHATKYPHONGVAN', 'U') IS NULL
        CREATE TABLE NHATKYPHONGVAN (
            MaNhatKy NVARCHAR(20) NOT NULL PRIMARY KEY,
            MaPV NVARCHAR(20) NOT NULL,
            MaDK NVARCHAR(20) NOT NULL,
            KetQuaCu NVARCHAR(50) NULL,
            KetQuaMoi NVARCHAR(50) NOT NULL,
            LyDo NVARCHAR(1000) NOT NULL,
            Nguon NVARCHAR(20) NOT NULL,
            NguoiThucHien NVARCHAR(20) NOT NULL,
            ThoiDiem DATETIMEOFFSET NOT NULL,
            CONSTRAINT FK_NKPV_PV FOREIGN KEY (MaPV) REFERENCES PHONGVAN(maPV),
            CONSTRAINT FK_NKPV_DK FOREIGN KEY (MaDK) REFERENCES DANGKYTHUCTAP(maDK)
        );
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_PV_KETQUA' AND definition LIKE '%Vang%')
        BEGIN
            IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_PV_KETQUA')
                ALTER TABLE PHONGVAN DROP CONSTRAINT CK_PV_KETQUA;
            ALTER TABLE PHONGVAN WITH NOCHECK ADD CONSTRAINT CK_PV_KETQUA CHECK
                (ketQua IN (N'ChuaCoKetQua', N'Dat', N'KhongDat', N'Vang'));
        END;
GO
-- Migration: InterviewCorrection
IF COL_LENGTH('PHONGVAN','PhienBan') IS NULL ALTER TABLE PHONGVAN ADD PhienBan INT NOT NULL DEFAULT 0;
        IF COL_LENGTH('PHONGVAN','MaPVTruoc') IS NULL ALTER TABLE PHONGVAN ADD MaPVTruoc NVARCHAR(20) NULL;
        IF COL_LENGTH('DANGKYTHUCTAP','MaPVKetThuc') IS NULL ALTER TABLE DANGKYTHUCTAP ADD MaPVKetThuc NVARCHAR(20) NULL;
        IF COL_LENGTH('NHATKYPHONGVAN','Loai') IS NULL ALTER TABLE NHATKYPHONGVAN ADD Loai NVARCHAR(20) NOT NULL DEFAULT 'KetQua';
        IF COL_LENGTH('NHATKYPHONGVAN','MaPVMoi') IS NULL ALTER TABLE NHATKYPHONGVAN ADD MaPVMoi NVARCHAR(20) NULL;
        IF COL_LENGTH('NHATKYPHONGVAN','NoiDungCu') IS NULL ALTER TABLE NHATKYPHONGVAN ADD NoiDungCu NVARCHAR(MAX) NULL;
        IF COL_LENGTH('NHATKYPHONGVAN','NoiDungMoi') IS NULL ALTER TABLE NHATKYPHONGVAN ADD NoiDungMoi NVARCHAR(MAX) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_PV_TRUOC')
            ALTER TABLE PHONGVAN ADD CONSTRAINT FK_PV_TRUOC FOREIGN KEY (MaPVTruoc) REFERENCES PHONGVAN(maPV);
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_DK_PV_KETTHUC')
            ALTER TABLE DANGKYTHUCTAP ADD CONSTRAINT FK_DK_PV_KETTHUC FOREIGN KEY (MaPVKetThuc) REFERENCES PHONGVAN(maPV);
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('PHONGVAN') AND name='UQ_PV_THAYTHE')
            CREATE UNIQUE INDEX UQ_PV_THAYTHE ON PHONGVAN(MaPVTruoc) WHERE MaPVTruoc IS NOT NULL;
        -- Backfill only a uniquely linked, audited negative result with its exact generated closing reason.
        UPDATE d SET MaPVKetThuc=p.maPV FROM DANGKYTHUCTAP d JOIN PHONGVAN p ON p.MaDK=d.maDK
        WHERE d.MaPVKetThuc IS NULL AND d.trangThai=N'TuChoi' AND p.ketQua IN (N'KhongDat',N'Vang')
          AND d.LyDoKetThuc=LEFT(CASE WHEN p.ketQua=N'Vang' THEN N'Vắng/bỏ phỏng vấn: ' ELSE N'Phỏng vấn không đạt: ' END+ISNULL(p.LyDoKetQua,N''),1000)
          AND (SELECT COUNT(*) FROM PHONGVAN p2 WHERE p2.MaDK=d.maDK)=1
          AND EXISTS (SELECT 1 FROM NHATKYPHONGVAN n WHERE n.MaPV=p.maPV AND n.MaDK=d.maDK AND n.KetQuaMoi=p.ketQua);
GO
-- Migration: ThoiHan
IF COL_LENGTH('DOTTHUCTAP', 'MoChamGV') IS NULL ALTER TABLE DOTTHUCTAP ADD MoChamGV DATETIMEOFFSET NULL;
        IF COL_LENGTH('DOTTHUCTAP', 'HanChamGV') IS NULL ALTER TABLE DOTTHUCTAP ADD HanChamGV DATETIMEOFFSET NULL;
        IF COL_LENGTH('DOTTHUCTAP', 'HanChamDN') IS NULL ALTER TABLE DOTTHUCTAP ADD HanChamDN DATETIMEOFFSET NULL;
        IF COL_LENGTH('DOTTHUCTAP', 'PhienBanThoiHan') IS NULL ALTER TABLE DOTTHUCTAP ADD PhienBanThoiHan INT NOT NULL CONSTRAINT DF_DOT_THOIHAN DEFAULT 0;
        IF COL_LENGTH('TIENDOTHUCTAP', 'NopTre') IS NULL ALTER TABLE TIENDOTHUCTAP ADD NopTre BIT NULL;
        IF COL_LENGTH('TIENDOTHUCTAP', 'HanNopBoSung') IS NULL ALTER TABLE TIENDOTHUCTAP ADD HanNopBoSung DATETIMEOFFSET NULL;
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('TIENDOTHUCTAP') AND name = 'ngayNop' AND system_type_id = TYPE_ID('date'))
            ALTER TABLE TIENDOTHUCTAP ALTER COLUMN ngayNop DATETIME2 NULL;
        IF OBJECT_ID('NHATKYTHOIHAN', 'U') IS NULL
        CREATE TABLE NHATKYTHOIHAN (
            MaNhatKy NVARCHAR(20) NOT NULL PRIMARY KEY,
            MaDot NVARCHAR(20) NOT NULL,
            Loai NVARCHAR(30) NOT NULL,
            Truoc NVARCHAR(MAX) NOT NULL,
            Sau NVARCHAR(MAX) NOT NULL,
            LyDo NVARCHAR(1000) NOT NULL,
            NguoiThucHien NVARCHAR(20) NOT NULL,
            ThoiDiem DATETIMEOFFSET NOT NULL,
            CONSTRAINT FK_NKTH_DOT FOREIGN KEY (MaDot) REFERENCES DOTTHUCTAP(maSo)
        );
GO
-- Migration: ConfirmationDeadline
IF COL_LENGTH('DOTTHUCTAP', 'HanXacNhanSV') IS NULL
            ALTER TABLE DOTTHUCTAP ADD HanXacNhanSV DATETIMEOFFSET NULL;
        IF COL_LENGTH('DOTTHUCTAP', 'PhienBanXacNhan') IS NULL
            ALTER TABLE DOTTHUCTAP ADD PhienBanXacNhan INT NOT NULL CONSTRAINT DF_DOT_XACNHAN DEFAULT 0;
GO
-- Migration: PlacementPeriod
IF COL_LENGTH('PHANBOTHUCTAP','NgayBatDauThucTap') IS NULL ALTER TABLE PHANBOTHUCTAP ADD NgayBatDauThucTap DATE NULL;
        IF COL_LENGTH('PHANBOTHUCTAP','NgayKetThucThucTap') IS NULL ALTER TABLE PHANBOTHUCTAP ADD NgayKetThucThucTap DATE NULL;
        IF COL_LENGTH('PHANBOTHUCTAP','PhienBanThoiGian') IS NULL ALTER TABLE PHANBOTHUCTAP ADD PhienBanThoiGian INT NOT NULL CONSTRAINT DF_PB_THOIGIAN DEFAULT 0;
GO
-- Migration: CompanyRound
IF COL_LENGTH('DANGKYTHUCTAP','ViTriDangKy') IS NULL ALTER TABLE DANGKYTHUCTAP ADD ViTriDangKy NVARCHAR(500) NULL;
        IF COL_LENGTH('DANGKYTHUCTAP','YeuCauDangKy') IS NULL ALTER TABLE DANGKYTHUCTAP ADD YeuCauDangKy NVARCHAR(MAX) NULL;
        IF OBJECT_ID('CONGTYTHEODOT','U') IS NULL
        CREATE TABLE CONGTYTHEODOT (
            MaCongTy NVARCHAR(20) NOT NULL, MaDot NVARCHAR(20) NOT NULL,
            ViTriTuyen NVARCHAR(500) NOT NULL, YeuCau NVARCHAR(MAX) NOT NULL,
            SoLuongNhan INT NOT NULL, MoDangKy DATETIMEOFFSET NOT NULL, HanDangKy DATETIMEOFFSET NOT NULL,
            HoatDong BIT NOT NULL DEFAULT 1, PhienBan INT NOT NULL DEFAULT 0,
            CONSTRAINT PK_CONGTYTHEODOT PRIMARY KEY (MaCongTy,MaDot),
            CONSTRAINT FK_CT_DOT_CT FOREIGN KEY (MaCongTy) REFERENCES CONGTY(maCongTy),
            CONSTRAINT FK_CT_DOT_DOT FOREIGN KEY (MaDot) REFERENCES DOTTHUCTAP(maSo),
            CONSTRAINT CK_CT_DOT_SOLUONG CHECK (SoLuongNhan > 0),
            CONSTRAINT CK_CT_DOT_HAN CHECK (HanDangKy > MoDangKy)
        );
GO
IF COL_LENGTH('CONGTYTHEODOT','MaGVGioiThieu') IS NULL ALTER TABLE CONGTYTHEODOT ADD MaGVGioiThieu NVARCHAR(20) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_CT_DOT_GV')
            ALTER TABLE CONGTYTHEODOT ADD CONSTRAINT FK_CT_DOT_GV FOREIGN KEY (MaGVGioiThieu) REFERENCES GIANGVIEN(maGV);
GO
-- Migration: CompanyPosition
IF OBJECT_ID('VITRITHEODOT','U') IS NULL
        CREATE TABLE VITRITHEODOT (
            MaViTri NVARCHAR(40) NOT NULL PRIMARY KEY,
            MaCongTy NVARCHAR(20) NOT NULL, MaDot NVARCHAR(20) NOT NULL,
            TenViTri NVARCHAR(500) NOT NULL, YeuCau NVARCHAR(MAX) NOT NULL,
            SoLuongNhan INT NOT NULL CHECK (SoLuongNhan > 0), HoatDong BIT NOT NULL DEFAULT 1,
            CONSTRAINT UQ_VT_SCOPE UNIQUE (MaViTri,MaCongTy,MaDot),
            CONSTRAINT FK_VT_KEHOACH FOREIGN KEY (MaCongTy,MaDot) REFERENCES CONGTYTHEODOT(MaCongTy,MaDot)
        );
        IF COL_LENGTH('DANGKYTHUCTAP','MaViTri') IS NULL ALTER TABLE DANGKYTHUCTAP ADD MaViTri NVARCHAR(40) NULL;
        IF COL_LENGTH('PHANBOTHUCTAP','MaViTri') IS NULL ALTER TABLE PHANBOTHUCTAP ADD MaViTri NVARCHAR(40) NULL;
GO
-- Only the first conversion creates a position and links existing records. Restarts never relink external/new records.
        DECLARE @Converted TABLE (MaViTri NVARCHAR(40),MaCongTy NVARCHAR(20),MaDot NVARCHAR(20));
        INSERT INTO VITRITHEODOT (MaViTri,MaCongTy,MaDot,TenViTri,YeuCau,SoLuongNhan,HoatDong)
        OUTPUT inserted.MaViTri,inserted.MaCongTy,inserted.MaDot INTO @Converted
        SELECT CONVERT(NVARCHAR(36),NEWID()),c.MaCongTy,c.MaDot,c.ViTriTuyen,c.YeuCau,c.SoLuongNhan,1
        FROM CONGTYTHEODOT c WHERE NOT EXISTS (SELECT 1 FROM VITRITHEODOT v WHERE v.MaCongTy=c.MaCongTy AND v.MaDot=c.MaDot);
        UPDATE d SET MaViTri=v.MaViTri FROM DANGKYTHUCTAP d JOIN @Converted v ON d.maCongTy=v.MaCongTy AND d.maDot=v.MaDot WHERE d.MaViTri IS NULL;
        UPDATE p SET MaViTri=v.MaViTri FROM PHANBOTHUCTAP p JOIN @Converted v ON p.maCongTy=v.MaCongTy AND p.maDot=v.MaDot
        WHERE p.MaViTri IS NULL AND ISNULL(p.NguonPhanBo,'') <> 'TiepNhanBenNgoai';
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_DK_VITRI')
            ALTER TABLE DANGKYTHUCTAP ADD CONSTRAINT FK_DK_VITRI FOREIGN KEY (MaViTri,maCongTy,maDot) REFERENCES VITRITHEODOT(MaViTri,MaCongTy,MaDot);
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_PB_VITRI')
            ALTER TABLE PHANBOTHUCTAP ADD CONSTRAINT FK_PB_VITRI FOREIGN KEY (MaViTri,maCongTy,maDot) REFERENCES VITRITHEODOT(MaViTri,MaCongTy,MaDot);
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_PB_VITRI' AND object_id=OBJECT_ID('PHANBOTHUCTAP'))
            CREATE INDEX IX_PB_VITRI ON PHANBOTHUCTAP(MaViTri,maCongTy,maDot,trangThai);
GO
-- Migration: ChotDot
IF OBJECT_ID('CHOTDOTTHUCTAP','U') IS NULL
        CREATE TABLE CHOTDOTTHUCTAP (
            MaDot NVARCHAR(20) NOT NULL PRIMARY KEY REFERENCES DOTTHUCTAP(maSo),
            TrangThai NVARCHAR(20) NOT NULL, PhienBan INT NOT NULL DEFAULT 0,
            HanMoLai DATETIMEOFFSET NULL, NguoiCapNhat NVARCHAR(20) NULL,
            NgayCapNhat DATETIMEOFFSET NOT NULL, LyDo NVARCHAR(1000) NOT NULL
        );
        IF OBJECT_ID('KHONGHOANTATDOT','U') IS NULL
        CREATE TABLE KHONGHOANTATDOT (
            MaDot NVARCHAR(20) NOT NULL REFERENCES DOTTHUCTAP(maSo),
            MaSV NVARCHAR(20) NOT NULL REFERENCES SINHVIEN(maSV), HieuLuc BIT NOT NULL DEFAULT 1,
            LyDo NVARCHAR(1000) NOT NULL, CanCu NVARCHAR(1000) NOT NULL,
            NguoiXacNhan NVARCHAR(20) NOT NULL, NgayXacNhan DATETIMEOFFSET NOT NULL,
            CONSTRAINT PK_KHONGHOANTATDOT PRIMARY KEY(MaDot,MaSV)
        );
        IF OBJECT_ID('NHATKYCHOTDOT','U') IS NULL
        CREATE TABLE NHATKYCHOTDOT (
            MaNhatKy NVARCHAR(32) NOT NULL PRIMARY KEY, MaDot NVARCHAR(20) NOT NULL REFERENCES DOTTHUCTAP(maSo),
            PhienBan INT NOT NULL, Loai NVARCHAR(30) NOT NULL, NguoiThucHien NVARCHAR(20) NOT NULL,
            ThoiDiem DATETIMEOFFSET NOT NULL, LyDo NVARCHAR(1000) NOT NULL, NoiDung NVARCHAR(MAX) NOT NULL
        );
GO
-- Migration: DocumentStorage
IF OBJECT_ID('STORED_DOCUMENT','U') IS NULL
        CREATE TABLE STORED_DOCUMENT (
            Id NVARCHAR(32) NOT NULL PRIMARY KEY, Kind NVARCHAR(30) NOT NULL, ResourceId NVARCHAR(40) NOT NULL,
            RoundId NVARCHAR(20) NULL, ActorId NVARCHAR(20) NOT NULL, RequestId NVARCHAR(32) NOT NULL,
            ObjectKey NVARCHAR(120) NOT NULL, FileName NVARCHAR(200) NOT NULL, ContentType NVARCHAR(100) NOT NULL,
            Size BIGINT NOT NULL, Sha256 NVARCHAR(64) NOT NULL, State NVARCHAR(20) NOT NULL,
            StorageId NVARCHAR(64) NOT NULL, CleanedAt DATETIMEOFFSET NULL, CleanedBy NVARCHAR(20) NULL,
            CreatedAt DATETIMEOFFSET NOT NULL, LastAttemptAt DATETIMEOFFSET NOT NULL, ReadyAt DATETIMEOFFSET NULL,
            CONSTRAINT UQ_DOCUMENT_REQUEST UNIQUE(ActorId, RequestId),
            CONSTRAINT UQ_DOCUMENT_OBJECT UNIQUE(ObjectKey),
            CONSTRAINT CK_DOCUMENT_SIZE CHECK(Size > 0),
            CONSTRAINT CK_DOCUMENT_STATE CHECK(State IN ('Uploading','Ready','Failed'))
        );
        IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_DOCUMENT_RESOURCE' AND object_id=OBJECT_ID('STORED_DOCUMENT'))
            CREATE INDEX IX_DOCUMENT_RESOURCE ON STORED_DOCUMENT(Kind,ResourceId,State);
        IF COL_LENGTH('STORED_DOCUMENT','StorageId') IS NULL
            ALTER TABLE STORED_DOCUMENT ADD StorageId NVARCHAR(64) NOT NULL CONSTRAINT DF_DOCUMENT_STORAGEID DEFAULT N'';
        IF COL_LENGTH('STORED_DOCUMENT','CleanedAt') IS NULL ALTER TABLE STORED_DOCUMENT ADD CleanedAt DATETIMEOFFSET NULL;
        IF COL_LENGTH('STORED_DOCUMENT','CleanedBy') IS NULL ALTER TABLE STORED_DOCUMENT ADD CleanedBy NVARCHAR(20) NULL;
        IF COL_LENGTH('STORED_DOCUMENT','LastAttemptAt') IS NULL ALTER TABLE STORED_DOCUMENT ADD LastAttemptAt DATETIMEOFFSET NULL;
        IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('STORED_DOCUMENT') AND name='LastAttemptAt' AND is_nullable=1)
        BEGIN
            EXEC(N'UPDATE STORED_DOCUMENT SET LastAttemptAt=CreatedAt WHERE LastAttemptAt IS NULL');
            EXEC(N'ALTER TABLE STORED_DOCUMENT ALTER COLUMN LastAttemptAt DATETIMEOFFSET NOT NULL');
        END;
GO
-- Migration: LanHoTro
IF COL_LENGTH('DOTTHUCTAP','TrangThaiDanhSachNoi') IS NULL
            ALTER TABLE DOTTHUCTAP ADD TrangThaiDanhSachNoi NVARCHAR(20) NOT NULL
                CONSTRAINT DF_DOT_DANHSACHNOI DEFAULT N'ChuaCongBo';
GO
IF OBJECT_ID(N'LANHOTROTHUCTAP', N'U') IS NULL
        BEGIN
            CREATE TABLE LANHOTROTHUCTAP (
                MaLan NVARCHAR(32) NOT NULL PRIMARY KEY,
                MaDot NVARCHAR(20) NOT NULL,
                TenLan NVARCHAR(200) NOT NULL,
                NgayHoTro DATETIME2 NOT NULL,
                TrangThai NVARCHAR(20) NOT NULL,
                MaLanTruoc NVARCHAR(32) NULL,
                PhienBan INT NOT NULL,
                DanhSachJson NVARCHAR(MAX) NOT NULL,
                NhatKyJson NVARCHAR(MAX) NOT NULL,
                CONSTRAINT FK_LANHOTRO_DOT FOREIGN KEY (MaDot) REFERENCES DOTTHUCTAP(maSo)
            );
            CREATE INDEX IX_LANHOTRO_DOT_NGAY ON LANHOTROTHUCTAP(MaDot, NgayHoTro);
        END;
GO
-- Migration: CongBoDanhSach
IF OBJECT_ID(N'CONGBODANHSACHTHUCTAP', N'U') IS NULL
        BEGIN
            CREATE TABLE CONGBODANHSACHTHUCTAP (
                MaCongBo NVARCHAR(32) NOT NULL PRIMARY KEY,
                MaDot NVARCHAR(20) NOT NULL,
                PhienBan INT NOT NULL,
                TieuDe NVARCHAR(200) NOT NULL,
                NoiDung NVARCHAR(2000) NOT NULL,
                HanPhanHoi DATETIMEOFFSET NOT NULL,
                NgayCongBo DATETIMEOFFSET NOT NULL,
                NguoiCongBo NVARCHAR(20) NOT NULL,
                DanhSachJson NVARCHAR(MAX) NOT NULL,
                CONSTRAINT FK_CBDS_DOT FOREIGN KEY (MaDot) REFERENCES DOTTHUCTAP(maSo),
                CONSTRAINT UQ_CBDS_VERSION UNIQUE (MaDot, PhienBan)
            );
        END;
GO
IF OBJECT_ID(N'PHANHOIDANHSACHTHUCTAP', N'U') IS NULL
        BEGIN
            CREATE TABLE PHANHOIDANHSACHTHUCTAP (
                MaPhanHoi NVARCHAR(32) NOT NULL PRIMARY KEY,
                MaDot NVARCHAR(20) NOT NULL,
                MaCongBo NVARCHAR(32) NOT NULL,
                MaSV NVARCHAR(20) NOT NULL,
                LanPhanHoi INT NOT NULL,
                ThongTinDung BIT NOT NULL,
                NoiDung NVARCHAR(2000) NOT NULL,
                NguoiGui NVARCHAR(20) NOT NULL,
                NgayGui DATETIMEOFFSET NOT NULL,
                CONSTRAINT FK_PHDS_CB FOREIGN KEY (MaCongBo) REFERENCES CONGBODANHSACHTHUCTAP(MaCongBo),
                CONSTRAINT FK_PHDS_SV FOREIGN KEY (MaSV) REFERENCES SINHVIEN(maSV),
                CONSTRAINT UQ_PHDS_LAN UNIQUE (MaCongBo, MaSV, LanPhanHoi)
            );
        END;
GO
-- Migration: XuLyDanhSach
IF COL_LENGTH('KHONGHOANTATDOT','TruocChotDanhSach') IS NULL
            ALTER TABLE KHONGHOANTATDOT ADD TruocChotDanhSach BIT NOT NULL CONSTRAINT DF_KHT_TRUOCCHOT DEFAULT 0;
GO
IF COL_LENGTH('PHANHOIDANHSACHTHUCTAP','ThongTinMoiJson') IS NULL
            ALTER TABLE PHANHOIDANHSACHTHUCTAP ADD ThongTinMoiJson NVARCHAR(MAX) NULL,
                ThongTinCuJson NVARCHAR(MAX) NULL, PhienBanThongTin INT NOT NULL CONSTRAINT DF_PHDS_INFO DEFAULT 0;
        IF COL_LENGTH('PHANBOTHUCTAP','TenCongTyXacNhan') IS NULL
            ALTER TABLE PHANBOTHUCTAP ADD TenCongTyXacNhan NVARCHAR(500) NULL, DiaChiCongTyXacNhan NVARCHAR(1000) NULL,
                MaSoThueCongTyXacNhan NVARCHAR(30) NULL;
GO
IF OBJECT_ID(N'XULYPHANHOIDANHSACH', N'U') IS NULL
            CREATE TABLE XULYPHANHOIDANHSACH (
                MaXuLy NVARCHAR(32) NOT NULL PRIMARY KEY,
                MaDot NVARCHAR(20) NOT NULL REFERENCES DOTTHUCTAP(maSo),
                MaPhanHoi NVARCHAR(32) NOT NULL UNIQUE REFERENCES PHANHOIDANHSACHTHUCTAP(MaPhanHoi),
                ChapThuan BIT NOT NULL, LyDo NVARCHAR(2000) NOT NULL, NguoiXuLy NVARCHAR(20) NOT NULL,
                NgayXuLy DATETIMEOFFSET NOT NULL, ThongTinCuJson NVARCHAR(MAX) NOT NULL, ThongTinMoiJson NVARCHAR(MAX) NOT NULL
            );
        IF OBJECT_ID(N'DANHSACHTHUCTAPCHINHTHUC', N'U') IS NULL
            CREATE TABLE DANHSACHTHUCTAPCHINHTHUC (
                MaDot NVARCHAR(20) NOT NULL PRIMARY KEY REFERENCES DOTTHUCTAP(maSo),
                MaCongBo NVARCHAR(32) NOT NULL REFERENCES CONGBODANHSACHTHUCTAP(MaCongBo),
                PhienBanRaSoat INT NOT NULL, DanhSachJson NVARCHAR(MAX) NOT NULL,
                LyDo NVARCHAR(2000) NOT NULL, NguoiChot NVARCHAR(20) NOT NULL, NgayChot DATETIMEOFFSET NOT NULL
            );
GO
-- Fixtures v1, 29/10/2026. Chỉ nạp cùng schema mới, không chạy riêng lên CSDL đang dùng.
-- Mọi hạn mới tính theo ngày nạp UTC+7; giờ PV lưu giờ địa phương theo hợp đồng API.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;
DECLARE @now DATETIMEOFFSET = SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time';
DECLARE @today DATE = CONVERT(DATE,@now);
DECLARE @local DATETIME2 = CONVERT(DATETIME2,@now);

-- Hoàn thiện liên kết của bộ dữ liệu cũ; không tự tạo kế hoạch cho toàn danh mục DN.
INSERT INTO SVTHAMGIADOT (MaDot,MaSV,NgayThem,NguoiThem,NgayCapNhat,NguoiCapNhat)
SELECT s.maDot,s.maSV,@now,'TK002',@now,'TK002' FROM (
 SELECT maDot,maSV FROM PHANBOTHUCTAP UNION SELECT maDot,maSV FROM DANGKYTHUCTAP
 UNION SELECT 'DOT02',maSV FROM SINHVIEN WHERE maSV IN ('SV031','SV032','SV033','SV034','SV035')
) s WHERE NOT EXISTS (SELECT 1 FROM SVTHAMGIADOT r WHERE r.MaDot=s.maDot AND r.MaSV=s.maSV);
INSERT INTO CONGTYTHEODOT (MaCongTy,MaDot,ViTriTuyen,YeuCau,SoLuongNhan,MoDangKy,HanDangKy,HoatDong)
SELECT c.maCongTy,d.maSo,c.viTriTuyen,c.yeuCau,
 CASE WHEN c.soLuongNhan < used.N THEN used.N ELSE c.soLuongNhan END,
 DATEADD(DAY,-30,CONVERT(DATETIMEOFFSET,d.thoiGianBD)),CONVERT(DATETIMEOFFSET,d.thoiGianBD),0
FROM CONGTY c CROSS JOIN DOTTHUCTAP d
CROSS APPLY (SELECT COUNT(*) N FROM PHANBOTHUCTAP p WHERE p.maCongTy=c.maCongTy AND p.maDot=d.maSo AND p.trangThai<>'Huy') used
WHERE EXISTS(SELECT 1 FROM DANGKYTHUCTAP a WHERE a.maDot=d.maSo AND a.maCongTy=c.maCongTy)
 OR EXISTS(SELECT 1 FROM PHANBOTHUCTAP p WHERE p.maDot=d.maSo AND p.maCongTy=c.maCongTy);
INSERT INTO VITRITHEODOT (MaViTri,MaCongTy,MaDot,TenViTri,YeuCau,SoLuongNhan,HoatDong)
SELECT CONCAT('OLD_',MaDot,'_',MaCongTy),MaCongTy,MaDot,ViTriTuyen,YeuCau,SoLuongNhan,0 FROM CONGTYTHEODOT;
UPDATE d SET MaViTri=v.MaViTri,ViTriDangKy=v.TenViTri,YeuCauDangKy=v.YeuCau
FROM DANGKYTHUCTAP d JOIN VITRITHEODOT v ON v.MaCongTy=d.maCongTy AND v.MaDot=d.maDot;
UPDATE p SET MaViTri=v.MaViTri,NguonPhanBo='DangKyOnline',ngayKhoaDuyet=p.ngayPhanBo,nguoiKhoaDuyet='TK002'
FROM PHANBOTHUCTAP p JOIN VITRITHEODOT v ON v.MaCongTy=p.maCongTy AND v.MaDot=p.maDot;
UPDATE p SET MaDK=d.maDK FROM PHONGVAN p JOIN DAIDIENDOANHNGHIEP r ON r.maSo=p.maDaiDien
JOIN DANGKYTHUCTAP d ON d.maSV=p.maSV AND d.maCongTy=r.maCongTy AND d.trangThai='DaDuyet';
-- Sửa thứ tự thời gian cũ: được tiếp nhận sau PV, trước phân công GV; không làm mất giờ.
UPDATE p SET ngayPV=DATEADD(HOUR,9,CONVERT(DATETIME2,DATEADD(DAY,1,d.ngayDangKy)))
FROM PHONGVAN p JOIN DANGKYTHUCTAP d ON d.maDK=p.MaDK;
UPDATE p SET ngayPhanBo=DATEADD(DAY,2,d.ngayDangKy),ngaySVXacNhan=DATEADD(DAY,2,d.ngayDangKy),
 ngayKhoaDuyet=DATEADD(DAY,2,d.ngayDangKy)
FROM PHANBOTHUCTAP p JOIN DANGKYTHUCTAP d ON d.maSV=p.maSV AND d.maDot=p.maDot AND d.maCongTy=p.maCongTy AND d.trangThai='DaDuyet';
UPDATE h SET ngayPC=DATEADD(DAY,1,p.ngayPhanBo) FROM GVHUONGDAN h JOIN PHANBOTHUCTAP p ON p.maSV=h.maSV AND p.maDot=h.maDot;
UPDATE GIANGVIEN SET soLuongSVHD=chiTieuHD;

-- 12 đợt riêng cho các biên thời gian/trạng thái; TEST_RONG tuyệt đối không có SV.
INSERT INTO DOTTHUCTAP (maSo,tenDot,namHoc,thoiGianBD,thoiGianKT,trangThai,maRubric,
 HanXacNhanSV,MoChamGV,HanChamGV,HanChamDN,HanDieuChinhNoiThucTap) VALUES
('TEST_MOI',N'[TEST] Đăng ký, phỏng vấn, bố trí trước đợt','TEST',DATEADD(DAY,14,@today),DATEADD(DAY,104,@today),'DangDienRa','CNTT_CLO_V1',DATEADD(DAY,10,@now),NULL,DATEADD(DAY,120,@now),DATEADD(DAY,120,@now),DATEADD(DAY,12,@now)),
('TEST_DANG',N'[TEST] Đang thực tập: tiến độ và CLO','TEST',DATEADD(DAY,-30,@today),DATEADD(DAY,60,@today),'DangDienRa','CNTT_CLO_V1',NULL,DATEADD(DAY,-5,@now),DATEADD(DAY,90,@now),DATEADD(DAY,90,@now),DATEADD(DAY,15,@now)),
('TEST_HAN',N'[TEST] Quá hạn xác nhận, còn giữ chỗ','TEST',DATEADD(DAY,14,@today),DATEADD(DAY,104,@today),'DangDienRa','CNTT_CLO_V1',DATEADD(DAY,-1,@now),NULL,NULL,NULL,DATEADD(DAY,10,@now)),
('TEST_KT',N'[TEST] Hết lịch, chưa chốt: thiếu điểm / không hoàn tất','TEST',DATEADD(DAY,-120,@today),DATEADD(DAY,-1,@today),'DaKetThuc','CNTT_CLO_V1',NULL,DATEADD(DAY,-10,@now),DATEADD(DAY,14,@now),DATEADD(DAY,14,@now),NULL),
('TEST_KHOA',N'[TEST] Đã chốt khóa ghi','TEST',DATEADD(DAY,-120,@today),DATEADD(DAY,-10,@today),'DaKetThuc','CNTT_CLO_V1',NULL,NULL,DATEADD(DAY,14,@now),DATEADD(DAY,14,@now),NULL),
('TEST_MOLAI',N'[TEST] Mở lại điểm, báo cáo còn hạn','TEST',DATEADD(DAY,-120,@today),DATEADD(DAY,-10,@today),'DaKetThuc','CNTT_CLO_V1',NULL,NULL,DATEADD(DAY,14,@now),DATEADD(DAY,14,@now),NULL),
('TEST_HETMO',N'[TEST] Hết hạn mở lại, chờ chốt lại','TEST',DATEADD(DAY,-120,@today),DATEADD(DAY,-10,@today),'DaKetThuc','CNTT_CLO_V1',NULL,NULL,DATEADD(DAY,14,@now),DATEADD(DAY,14,@now),NULL),
('TEST_RONG',N'[TEST] Đợt trống không lấy toàn danh mục','TEST',DATEADD(DAY,14,@today),DATEADD(DAY,104,@today),'ChuaBatDau','CNTT_CLO_V1',NULL,NULL,NULL,NULL,NULL),
('TEST_CHOTDS',N'[TEST] Chốt danh sách trước ngày bắt đầu','TEST',DATEADD(DAY,14,@today),DATEADD(DAY,104,@today),'ChuaBatDau','CNTT_CLO_V1',NULL,NULL,NULL,NULL,NULL),
('TEST_DUKIEN',N'[TEST] Công bố dự kiến và phản hồi','TEST',DATEADD(DAY,14,@today),DATEADD(DAY,104,@today),'ChuaBatDau','CNTT_CLO_V1',NULL,NULL,NULL,NULL,NULL),
('TEST_CHUACHAM',N'[TEST] Chưa tới lịch mở chấm GV','TEST',DATEADD(DAY,-30,@today),DATEADD(DAY,60,@today),'DangDienRa','CNTT_CLO_V1',NULL,DATEADD(DAY,7,@now),DATEADD(DAY,90,@now),DATEADD(DAY,90,@now),NULL),
('TEST_HETCHAM',N'[TEST] Hết hạn chấm không tự khóa đợt','TEST',DATEADD(DAY,-120,@today),DATEADD(DAY,-10,@today),'DaKetThuc','CNTT_CLO_V1',NULL,NULL,DATEADD(DAY,-1,@now),DATEADD(DAY,-1,@now),NULL);

-- DN được duyệt/chưa duyệt/ngừng nhận/chỉ tiếp nhận ngoài, đầu mối GV còn/hết tải.
INSERT INTO CONGTY (maCongTy,tenCongTy,viTriTuyen,thoiGian,soLuongNhan,yeuCau,trangThai,chiTiepNhanTuTim) VALUES
('WCT01',N'[TEST] Công nghệ Sao Việt',N'Backend / Frontend',N'Theo kế hoạch đợt',30,N'C#, SQL Server, React, Git','DaDuyet',0),
('WCT02',N'[TEST] Vị trí đầy, tổng còn',N'QA',N'Theo đợt',10,N'Test case, SQL','DaDuyet',0),
('WCT03',N'[TEST] Tổng trần đầy',N'Fullstack',N'Theo đợt',1,N'C#, React','DaDuyet',0),
('WCT04',N'[TEST] Kế hoạch ngừng nhận',N'Data',N'Theo đợt',5,N'Python, SQL','DaDuyet',0),
('WCT05',N'[TEST] Kế hoạch hết hạn',N'DevOps',N'Theo đợt',5,N'Docker, CI/CD','DaDuyet',0),
('WCT06',N'[TEST] Kế hoạch chưa mở',N'Mobile',N'Theo đợt',5,N'Flutter','DaDuyet',0),
('WCT07',N'[TEST] Chỉ tiếp nhận bên ngoài',N'Tiếp nhận ngoài',N'Theo hồ sơ',20,N'Theo hồ sơ xác minh','DaDuyet',1),
('WCT08',N'[TEST] Đề xuất DN chờ duyệt',N'AI Intern',N'Theo đề xuất',3,N'Python, NLP','ChoDuyet',0),
('WCT09',N'[TEST] Đề xuất DN từ chối',N'Web Intern',N'Theo đề xuất',3,N'JavaScript','TuChoi',0),
('WCT10',N'[TEST] Danh mục chưa có kế hoạch',N'Business Analyst',N'Chưa có kế hoạch',5,N'Phân tích nghiệp vụ','DaDuyet',0);
INSERT INTO GIANGVIEN (maGV,hoTen,chuyenMon,soLuongSVHD,chiTieuHD) VALUES
('WGV01',N'[TEST] Nguyễn Minh Anh',N'C#, SQL Server, React',30,30),
('WGV02',N'[TEST] Trần Thu Hà',N'Python, AI, Data',1,1),
('WGV03',N'[TEST] Lê Đức Nam',N'Kiểm thử, DevOps',0,0);
INSERT INTO DAIDIENDOANHNGHIEP (maSo,hoTen,chucVu,email,thongTinLienHe,maCongTy)
SELECT CONCAT('WDD',RIGHT(maCongTy,2)),CONCAT(N'Đại diện test ',RIGHT(maCongTy,2)),N'Người hướng dẫn',CONCAT('dn',RIGHT(maCongTy,2),'@example.test'),'0900000000',maCongTy
FROM CONGTY WHERE maCongTy LIKE 'WCT%';
INSERT INTO TAIKHOAN (maTaiKhoan,tenDangNhap,matKhau,trangThai,maVaiTro,maGV,maDaiDien,email)
SELECT CONCAT('WTK_',maGV),CONCAT('testgv',RIGHT(maGV,2)),(SELECT matKhau FROM TAIKHOAN WHERE maTaiKhoan='TK001'),'HoatDong','VT03',maGV,NULL,CONCAT(maGV,'@example.test') FROM GIANGVIEN WHERE maGV LIKE 'WGV%'
UNION ALL SELECT CONCAT('WTK_',maSo),CONCAT('testdn',RIGHT(maSo,2)),(SELECT matKhau FROM TAIKHOAN WHERE maTaiKhoan='TK001'),'HoatDong','VT05',NULL,maSo,email FROM DAIDIENDOANHNGHIEP WHERE maSo LIKE 'WDD%' AND maSo<>'WDD10';
INSERT INTO GIOITHIEU (maSo,ngayGioiThieu,trangThaiKetNoi,maCongTy,maGV) VALUES
('WGT08',@today,'DangXem','WCT08','WGV01'),('WGT09',@today,'TuChoi','WCT09','WGV02');

-- Mỗi tài khoản testsv01..50 trùng số WX001..050; tên ghi rõ trạng thái để dễ tìm.
DECLARE @students TABLE (N INT PRIMARY KEY,Scenario NVARCHAR(100));
INSERT INTO @students VALUES
(1,N'Chưa có hồ sơ năng lực'),(2,N'Hồ sơ năng lực đủ, chưa đăng ký'),(3,N'Đơn chờ duyệt'),(4,N'PV tương lai'),(5,N'PV đã tới giờ chưa kết quả'),
(6,N'PV đạt, giữ chỗ chờ SV xác nhận'),(7,N'SV xác nhận, chờ Khoa duyệt'),(8,N'PV không đạt có căn cứ'),(9,N'Vắng PV có căn cứ'),(10,N'SV tự rút hồ sơ'),
(11,N'Hết 3 lượt toàn đợt'),(12,N'PV xếp lại giữ buổi cũ'),(13,N'Tự tìm chờ duyệt'),(14,N'Tự tìm bị từ chối'),(15,N'Tự tìm được công nhận'),
(16,N'Bố trí trực tiếp chưa có GV'),(17,N'Vị trí đầy tổng còn'),(18,N'Tổng chỉ tiêu DN đầy'),(19,N'Đã hủy nơi và đã bố trí lại'),(20,N'Quá hạn xác nhận còn giữ chỗ'),
(21,N'Tiến độ đủ 4 trạng thái'),(22,N'Quá hạn chưa nộp'),(23,N'Mở hạn bổ sung còn hiệu lực'),(24,N'Hết hạn bổ sung'),(25,N'Chưa lập phiếu điểm'),
(26,N'Chỉ có điểm DN'),(27,N'Chỉ có điểm GV'),(28,N'Đủ điểm CLO đạt'),(29,N'Đủ điểm CLO không đạt'),(30,N'Đủ điểm toàn bộ bằng 0'),
(31,N'Tổng điểm cũ nhưng thiếu tiêu chí'),(32,N'Phiếu chưa có chi tiết'),(33,N'Có nơi chưa có GV'),(34,N'Giảng viên đầu mối hết tải'),(35,N'Ngày riêng sau khi đợt bắt đầu bị khóa'),
(36,N'Tự tìm đã công nhận, thời gian riêng'),(37,N'Hồ sơ năng lực tối giản'),(38,N'Tài khoản bị khóa'),(39,N'Tài khoản chưa kích hoạt'),(40,N'Đã có GV, chặn sửa qua PV'),
(41,N'Hết lịch còn thiếu điểm chặn chốt'),(42,N'Không hoàn tất có căn cứ'),(43,N'Hết lịch đủ điểm chờ Khoa chốt'),(44,N'Hết lịch chưa có nơi chưa xác nhận'),(45,N'Đợt đã khóa'),
(46,N'Đợt đang mở lại'),(47,N'Hết hạn mở lại'),(48,N'Danh sách chính thức trước đợt'),(49,N'Danh sách dự kiến có phản hồi'),(50,N'Đã rút khỏi danh sách đợt');
INSERT INTO SINHVIEN (maSV,hoTen,lop,khoaHoc,gpa,kyNang,chuyenNganh,congNghe,duAnDaThucHien)
SELECT CONCAT('WX',RIGHT(CONCAT('000',N),3)),CONCAT(N'Test ',RIGHT(CONCAT('00',N),2),N' — ',Scenario),
 CASE WHEN N%2=0 THEN '14DHTH01' ELSE '14DHTH02' END,'2023-2027',CASE WHEN N=37 THEN NULL ELSE 3.2 END,
 CASE WHEN N IN (1,37) THEN NULL ELSE N'C#, SQL, JavaScript, Python, làm việc nhóm' END,N'Công nghệ phần mềm',
 CASE WHEN N IN (1,37) THEN NULL ELSE N'ASP.NET Core, React, SQL Server, Git' END,
 CASE WHEN N IN (1,37) THEN NULL ELSE N'Xây dựng API và website quản lý thư viện' END FROM @students;
INSERT INTO TAIKHOAN (maTaiKhoan,tenDangNhap,matKhau,trangThai,maVaiTro,maSV,email)
SELECT CONCAT('WTK_SV',RIGHT(CONCAT('00',N),2)),CONCAT('testsv',RIGHT(CONCAT('00',N),2)),
 (SELECT matKhau FROM TAIKHOAN WHERE maTaiKhoan='TK001'),CASE N WHEN 38 THEN 'BiKhoa' WHEN 39 THEN 'ChuaKichHoat' ELSE 'HoatDong' END,
 'VT04',CONCAT('WX',RIGHT(CONCAT('000',N),3)),CONCAT('testsv',N,'@example.test') FROM @students;
INSERT INTO HOSONANGLUC (maHoSo,NDHoSo,ngayCapNhat,maSV)
SELECT CONCAT('WHS',RIGHT(CONCAT('000',N),3)),CASE WHEN N=37 THEN N'Sinh viên CNTT' ELSE N'C#, ASP.NET Core, React, SQL Server, Python. Dự án API quản lý thư viện, Git, kiểm thử đơn vị.' END,@today,CONCAT('WX',RIGHT(CONCAT('000',N),3)) FROM @students WHERE N<>1;
INSERT INTO SVTHAMGIADOT (MaDot,MaSV,DangThamGia,NgayThem,NguoiThem,NgayCapNhat,NguoiCapNhat)
SELECT CASE WHEN N=20 THEN 'TEST_HAN' WHEN N<=19 THEN 'TEST_MOI' WHEN N<=40 THEN 'TEST_DANG'
 WHEN N<=44 THEN 'TEST_KT' WHEN N=45 THEN 'TEST_KHOA' WHEN N=46 THEN 'TEST_MOLAI' WHEN N=47 THEN 'TEST_HETMO'
 WHEN N=48 THEN 'TEST_CHOTDS' WHEN N=49 THEN 'TEST_DUKIEN' ELSE 'TEST_MOI' END,
 CONCAT('WX',RIGHT(CONCAT('000',N),3)),CASE WHEN N=50 THEN 0 ELSE 1 END,DATEADD(DAY,-10,@now),'TK002',@now,'TK002' FROM @students;
INSERT INTO SVTHAMGIADOT (MaDot,MaSV,NgayThem,NguoiThem,NgayCapNhat,NguoiCapNhat) VALUES
('TEST_CHUACHAM','WX021',@now,'TK002',@now,'TK002'),('TEST_HETCHAM','WX021',@now,'TK002',@now,'TK002');

INSERT INTO CONGTYTHEODOT (MaCongTy,MaDot,ViTriTuyen,YeuCau,SoLuongNhan,MoDangKy,HanDangKy,HoatDong,MaGVGioiThieu)
SELECT c.maCongTy,r.maSo,c.viTriTuyen,c.yeuCau,CASE c.maCongTy WHEN 'WCT02' THEN 10 WHEN 'WCT03' THEN 1 ELSE 30 END,
 CASE WHEN c.maCongTy='WCT06' THEN DATEADD(DAY,3,@now) ELSE DATEADD(DAY,-10,@now) END,
 CASE WHEN c.maCongTy='WCT05' THEN DATEADD(DAY,-1,@now) ELSE DATEADD(DAY,10,@now) END,
 CASE WHEN c.maCongTy='WCT04' THEN 0 ELSE 1 END,
 CASE WHEN c.maCongTy='WCT01' THEN 'WGV01' WHEN c.maCongTy='WCT02' THEN 'WGV02' ELSE NULL END
FROM CONGTY c CROSS JOIN DOTTHUCTAP r WHERE c.maCongTy BETWEEN 'WCT01' AND 'WCT06' AND r.maSo LIKE 'TEST_%' AND r.maSo<>'TEST_RONG';
INSERT INTO VITRITHEODOT (MaViTri,MaCongTy,MaDot,TenViTri,YeuCau,SoLuongNhan,HoatDong)
SELECT CONCAT(MaDot,'_',MaCongTy,'_A'),MaCongTy,MaDot,
 CASE WHEN MaCongTy='WCT01' THEN N'Backend .NET Intern' ELSE ViTriTuyen END,
 CASE WHEN MaCongTy='WCT01' THEN N'C#, ASP.NET Core, SQL Server, REST API, Git, unit test' ELSE YeuCau END,
 CASE WHEN MaCongTy IN ('WCT02','WCT03') THEN 1 ELSE 30 END,1 FROM CONGTYTHEODOT WHERE MaDot LIKE 'TEST_%';
INSERT INTO VITRITHEODOT (MaViTri,MaCongTy,MaDot,TenViTri,YeuCau,SoLuongNhan,HoatDong) VALUES
('TEST_MOI_WCT01_B','WCT01','TEST_MOI',N'Frontend React Intern',N'React, JavaScript, HTML, CSS, API, Git',2,1),
('TEST_MOI_WCT01_OFF','WCT01','TEST_MOI',N'Vị trí đã ngừng',N'Không nhận mới',3,0),
('TEST_MOI_WCT03_B','WCT03','TEST_MOI',N'Vị trí còn nhưng tổng đầy',N'React',5,1);

-- Đơn, PV và kết quả có audit, đủ 3 lượt gồm rớt/rút; không chế tạo điểm AI.
INSERT INTO DANGKYTHUCTAP (maDK,ngayDangKy,thuTuUuTien,trangThai,maSV,maCongTy,maDot,MaViTri,ViTriDangKy,YeuCauDangKy,LyDoKetThuc)
SELECT CONCAT('WDK',RIGHT(CONCAT('000',s.N),3)),DATEADD(DAY,-5,@today),1,
 CASE WHEN s.N IN (8,9,10,11) THEN 'TuChoi' WHEN s.N=3 THEN 'ChoDuyet' ELSE 'DaDuyet' END,
 CONCAT('WX',RIGHT(CONCAT('000',s.N),3)),'WCT01','TEST_MOI',v.MaViTri,v.TenViTri,v.YeuCau,
 CASE s.N WHEN 8 THEN N'Phỏng vấn không đạt: Chưa đáp ứng kỹ năng SQL; biên bản test PV08'
 WHEN 9 THEN N'Vắng/bỏ phỏng vấn: DN xác minh không tham dự; biên bản test PV09'
 WHEN 10 THEN N'Sinh viên chủ động rút hồ sơ, đơn test R10' WHEN 11 THEN N'Không đạt PV lần 1, biên bản test R11' ELSE NULL END
FROM @students s JOIN VITRITHEODOT v ON v.MaViTri='TEST_MOI_WCT01_A' WHERE s.N BETWEEN 3 AND 12;
INSERT INTO DANGKYTHUCTAP (maDK,ngayDangKy,thuTuUuTien,trangThai,maSV,maCongTy,maDot,MaViTri,ViTriDangKy,YeuCauDangKy,LyDoKetThuc)
SELECT CONCAT('WDK011_',RIGHT(c.MaCongTy,2)),DATEADD(DAY,-4,@today),CASE c.MaCongTy WHEN 'WCT02' THEN 2 ELSE 3 END,'TuChoi','WX011',c.MaCongTy,c.MaDot,v.MaViTri,v.TenViTri,v.YeuCau,N'Đã rút/không đạt theo hồ sơ kiểm thử'
FROM CONGTYTHEODOT c JOIN VITRITHEODOT v ON v.MaCongTy=c.MaCongTy AND v.MaDot=c.MaDot WHERE c.MaDot='TEST_MOI' AND c.MaCongTy IN ('WCT02','WCT04');
INSERT INTO PHONGVAN (maPV,hinhThuc,ngayPV,ketQua,maDaiDien,maSV,MaDK,LyDoKetQua,NguonKetQua,NguoiGhiKetQua,ThoiDiemKetQua)
SELECT CONCAT('WPV',RIGHT(CONCAT('000',s.N),3)),N'Trực tuyến',CASE WHEN s.N=4 THEN DATEADD(DAY,2,@local) ELSE DATEADD(DAY,-2,@local) END,
 CASE WHEN s.N IN (4,5) THEN 'ChuaCoKetQua' WHEN s.N IN (6,7) THEN 'Dat' WHEN s.N=9 THEN 'Vang' ELSE 'KhongDat' END,
 'WDD01',CONCAT('WX',RIGHT(CONCAT('000',s.N),3)),CONCAT('WDK',RIGHT(CONCAT('000',s.N),3)),
 CASE WHEN s.N=9 THEN N'DN xác minh không tham dự; biên bản test PV09' WHEN s.N IN (8,11,12) THEN N'Chưa đáp ứng kỹ năng SQL; biên bản test PV08' WHEN s.N IN (6,7) THEN N'Đạt phỏng vấn, DN xác nhận tiếp nhận' ELSE NULL END,
 CASE WHEN s.N IN (4,5) THEN NULL ELSE 'DoanhNghiep' END,CASE WHEN s.N IN (4,5) THEN NULL ELSE 'WTK_WDD01' END,
 CASE WHEN s.N IN (4,5) THEN NULL ELSE DATEADD(DAY,-1,@now) END
FROM @students s WHERE s.N BETWEEN 4 AND 12 AND s.N<>10;
INSERT INTO NHATKYPHONGVAN (MaNhatKy,MaPV,MaDK,KetQuaCu,KetQuaMoi,LyDo,Nguon,NguoiThucHien,ThoiDiem)
SELECT CONCAT('WNK_',maPV),maPV,MaDK,'ChuaCoKetQua',ketQua,LyDoKetQua,NguonKetQua,NguoiGhiKetQua,ThoiDiemKetQua FROM PHONGVAN WHERE maPV LIKE 'WPV%' AND ketQua<>'ChuaCoKetQua';
UPDATE d SET MaPVKetThuc=p.maPV FROM DANGKYTHUCTAP d JOIN PHONGVAN p ON p.MaDK=d.maDK WHERE d.maDK IN ('WDK008','WDK009','WDK011');
INSERT INTO PHONGVAN (maPV,hinhThuc,ngayPV,ketQua,maDaiDien,maSV,MaDK,MaPVTruoc)
VALUES ('WPV012_NEW',N'Trực tuyến',DATEADD(DAY,2,@local),'ChuaCoKetQua','WDD01','WX012','WDK012','WPV012');
INSERT INTO NHATKYPHONGVAN (MaNhatKy,MaPV,MaDK,KetQuaCu,KetQuaMoi,LyDo,Nguon,NguoiThucHien,ThoiDiem,Loai,MaPVMoi,NoiDungCu,NoiDungMoi)
VALUES ('WNK_RESCHEDULE','WPV012','WDK012','KhongDat','ChuaCoKetQua',N'Xếp lại theo xác minh DN: lỗi kết nối buổi cũ','DoanhNghiep','WTK_WDD01',@now,'XepLai','WPV012_NEW',N'{"MaPV":"WPV012"}',N'{"MaPV":"WPV012_NEW"}');

-- Phân bổ tạm, chờ duyệt, chính thức, đã hủy và nối nơi cũ; ngoài không ép JD.
INSERT INTO PHANBOTHUCTAP (maPB,ngayPhanBo,trangThai,maDot,maCongTy,maSV,MaViTri,daDuocKhoaDuyet,ngaySVXacNhan,ngayKhoaDuyet,nguoiKhoaDuyet,NguonPhanBo)
SELECT CONCAT('WPB',RIGHT(CONCAT('000',s.N),3),CASE r.MaDot WHEN 'TEST_CHUACHAM' THEN '_CC' WHEN 'TEST_HETCHAM' THEN '_HC' ELSE '' END),DATEADD(DAY,-1,@today),
 CASE s.N WHEN 6 THEN 'ChuaNhanViec' WHEN 7 THEN 'ChoKhoaDuyet' WHEN 20 THEN 'ChuaNhanViec' ELSE 'DangThucTap' END,r.MaDot,
 CASE WHEN s.N IN (15,36) THEN 'WCT07' WHEN s.N=17 THEN 'WCT02' WHEN s.N=18 THEN 'WCT03' ELSE 'WCT01' END,r.MaSV,
 CASE WHEN s.N IN (15,16,19,36) THEN NULL ELSE CONCAT(r.MaDot,'_',CASE s.N WHEN 17 THEN 'WCT02' WHEN 18 THEN 'WCT03' ELSE 'WCT01' END,'_A') END,
 CASE WHEN s.N IN (6,7,20) THEN 0 ELSE 1 END,CASE WHEN s.N IN (6,20) THEN NULL ELSE DATEADD(DAY,-1,@local) END,
 CASE WHEN s.N IN (6,7,20) THEN NULL ELSE DATEADD(DAY,-1,@local) END,CASE WHEN s.N IN (6,7,20) THEN NULL ELSE 'TK002' END,
 CASE WHEN s.N IN (15,36) THEN 'TiepNhanBenNgoai' WHEN s.N IN (16,19) THEN 'KhoaBoTri' ELSE 'DangKyOnline' END
FROM @students s JOIN SVTHAMGIADOT r ON r.MaSV=CONCAT('WX',RIGHT(CONCAT('000',s.N),3))
WHERE s.N IN (6,7,15,16,17,18,19,20) OR (s.N BETWEEN 21 AND 49 AND s.N NOT IN (42,44));
-- Các phân bổ của WX021 ở 3 đợt có hậu tố _CC/_HC riêng.
UPDATE p SET ngayPhanBo=DATEADD(DAY,-2,d.thoiGianBD),ngaySVXacNhan=DATEADD(DAY,-2,d.thoiGianBD),ngayKhoaDuyet=DATEADD(DAY,-2,d.thoiGianBD)
FROM PHANBOTHUCTAP p JOIN DOTTHUCTAP d ON d.maSo=p.maDot WHERE p.maPB LIKE 'WPB%' AND d.thoiGianBD<@today;
INSERT INTO PHANBOTHUCTAP (maPB,ngayPhanBo,trangThai,maDot,maCongTy,maSV,daDuocKhoaDuyet,NguonPhanBo,LyDoHuy,CanCuHuy,NguoiHuy,NgayHuy,TrangThaiXuLyLai)
VALUES ('WPB019_OLD',DATEADD(DAY,-5,@today),'Huy','TEST_MOI','WCT04','WX019',1,'KhoaBoTri',N'DN dừng tiếp nhận',N'Biên bản kiểm thử DC19','TK002',DATEADD(DAY,-2,@now),'CanBoTriLai');
UPDATE PHANBOTHUCTAP SET MaPhanBoTruoc='WPB019_OLD' WHERE maPB='WPB019';
INSERT INTO NHATKYDIEUCHINHTHUCTAP (MaNhatKy,MaDot,MaSV,MaPhanBo,Loai,LyDo,CanCu,NoiDung,NguoiThucHien,ThoiDiem) VALUES
('WDC019_OLD','TEST_MOI','WX019','WPB019_OLD','Huy',N'DN dừng tiếp nhận',N'Biên bản kiểm thử DC19',N'Hủy nơi cũ, giữ lịch sử','TK002',DATEADD(DAY,-2,@now)),
('WDC019_NEW','TEST_MOI','WX019','WPB019','PhanBoLai',N'Khoa đã tìm nơi thay thế',N'Biên bản kiểm thử DC19B',N'Bố trí lại WCT01, liên kết WPB019_OLD','TK002',@now);
UPDATE PHANBOTHUCTAP SET NgayBatDauThucTap=DATEADD(DAY,-20,@today),NgayKetThucThucTap=DATEADD(DAY,70,@today) WHERE maPB IN ('WPB035','WPB036');
INSERT INTO DEXUATTHUCTAPTUTIM (MaHoSo,MaSV,MaDot,MaCongTy,TenCongTy,DiaChi,ViTri,NguoiLienHe,LienHe,NgayBatDau,NgayKetThuc,TrangThai,NgayGui,NgayDuyet,NguoiDuyet,LyDo,MaPhanBo)
SELECT CONCAT('WTT',RIGHT(s.maSV,3)),s.maSV,r.MaDot,CASE WHEN s.maSV='WX013' THEN NULL ELSE 'WCT07' END,
 N'Doanh nghiệp tiếp nhận ngoài test',N'123 Đường Thử Nghiệm, TP.HCM',N'Thực tập lập trình',N'Nguyễn Đầu Mối','daumoi@example.test',
 CASE WHEN s.maSV='WX036' THEN DATEADD(DAY,-20,@today) ELSE d.thoiGianBD END,
 CASE WHEN s.maSV='WX036' THEN DATEADD(DAY,70,@today) ELSE d.thoiGianKT END,
 CASE s.maSV WHEN 'WX013' THEN 'ChoDuyet' WHEN 'WX014' THEN 'TuChoi' ELSE 'DaDuyet' END,DATEADD(DAY,-5,@local),
 CASE WHEN s.maSV='WX013' THEN NULL ELSE DATEADD(DAY,-1,@local) END,CASE WHEN s.maSV='WX013' THEN NULL ELSE 'TK002' END,
 CASE WHEN s.maSV='WX014' THEN N'Thiếu xác nhận tiếp nhận từ DN; cần bổ sung hồ sơ' WHEN s.maSV IN ('WX015','WX036') THEN N'Khoa đã xác minh theo giấy tiếp nhận mẫu test' ELSE NULL END,
 CASE s.maSV WHEN 'WX015' THEN 'WPB015' WHEN 'WX036' THEN 'WPB036' ELSE NULL END
FROM SINHVIEN s JOIN SVTHAMGIADOT r ON r.MaSV=s.maSV JOIN DOTTHUCTAP d ON d.maSo=r.MaDot WHERE s.maSV IN ('WX013','WX014','WX015','WX036');
INSERT INTO GVHUONGDAN (maSo,ngayPC,trangThai,maGV,maSV,maDot)
SELECT CONCAT('WHD',RIGHT(p.maSV,3),CASE p.maDot WHEN 'TEST_CHUACHAM' THEN '_CC' WHEN 'TEST_HETCHAM' THEN '_HC' ELSE '' END),p.ngayPhanBo,'DangHuongDan',
 CASE WHEN p.maSV='WX034' THEN 'WGV02' ELSE 'WGV01' END,p.maSV,p.maDot
FROM PHANBOTHUCTAP p WHERE p.maPB LIKE 'WPB%' AND p.trangThai<>'Huy' AND p.maSV NOT IN ('WX006','WX007','WX015','WX016','WX017','WX018','WX019','WX020','WX033');
INSERT INTO HUONGDANDOANHNGHIEP (maSo,ngayBD,vaiTro,maPB,maDaiDien)
SELECT CONCAT('WDN',RIGHT(p.maSV,3),CASE p.maDot WHEN 'TEST_CHUACHAM' THEN '_CC' WHEN 'TEST_HETCHAM' THEN '_HC' ELSE '' END),p.ngayPhanBo,N'Người hướng dẫn thực tập',p.maPB,
 CONCAT('WDD',RIGHT(p.maCongTy,2)) FROM PHANBOTHUCTAP p WHERE p.maPB LIKE 'WPB%' AND p.trangThai='DangThucTap';

-- Báo cáo đang mở, đã nộp/duyệt/yêu cầu sửa, quá hạn và bổ sung riêng có audit.
INSERT INTO TIENDOTHUCTAP (maTienDo,mocThoiGian,noiDungBaoCao,ngayNop,trangThaiDuyet,nhanXetGV,maDot,maSV,NopTre,HanNopBoSung) VALUES
('WTD021_A',DATEADD(DAY,3,@today),NULL,NULL,'ChuaNop',NULL,'TEST_DANG','WX021',NULL,NULL),
('WTD021_B',DATEADD(DAY,-1,@today),N'Hoàn thành API đăng nhập và kiểm thử.',DATEADD(DAY,-2,@local),'DaNop',NULL,'TEST_DANG','WX021',0,NULL),
('WTD021_C',DATEADD(DAY,-8,@today),N'Phân tích yêu cầu, thiết kế CSDL.',DATEADD(DAY,-9,@local),'DaDuyet',N'Đạt yêu cầu tuần.','TEST_DANG','WX021',0,NULL),
('WTD021_D',DATEADD(DAY,2,@today),N'Bản nháp báo cáo tuần cần bổ sung.',DATEADD(DAY,-1,@local),'YeuCauSua',N'Bổ sung kết quả test và nhật ký công việc.','TEST_DANG','WX021',0,NULL),
('WTD022',DATEADD(DAY,-3,@today),NULL,NULL,'ChuaNop',NULL,'TEST_DANG','WX022',NULL,NULL),
('WTD023',DATEADD(DAY,-3,@today),NULL,NULL,'ChuaNop',NULL,'TEST_DANG','WX023',NULL,DATEADD(DAY,2,@now)),
('WTD024',DATEADD(DAY,-5,@today),NULL,NULL,'ChuaNop',NULL,'TEST_DANG','WX024',NULL,DATEADD(DAY,-1,@now)),
('WTD019_OLD',DATEADD(DAY,-2,@today),N'Báo cáo nơi cũ được lưu nguyên lịch sử.',DATEADD(DAY,-3,@local),'DaNop',NULL,'TEST_MOI','WX019',0,NULL),
('WTD045',DATEADD(DAY,-12,@today),N'Báo cáo đã lưu trước chốt.',DATEADD(DAY,-13,@local),'DaDuyet',N'Đã duyệt.','TEST_KHOA','WX045',0,NULL),
('WTD046',DATEADD(DAY,-12,@today),N'Báo cáo cần sửa khi mở lại.',DATEADD(DAY,-13,@local),'YeuCauSua',N'Bổ sung kết luận.','TEST_MOLAI','WX046',0,DATEADD(DAY,2,@now)),
('WTD047',DATEADD(DAY,-12,@today),N'Báo cáo giữ nguyên khi hết mở lại.',DATEADD(DAY,-13,@local),'DaDuyet',N'Đã duyệt.','TEST_HETMO','WX047',0,NULL);
UPDATE TIENDOTHUCTAP SET MaPhanBoLuuTru='WPB019_OLD' WHERE maTienDo='WTD019_OLD';
INSERT INTO NHATKYTHOIHAN (MaNhatKy,MaDot,Loai,Truoc,Sau,LyDo,NguoiThucHien,ThoiDiem) VALUES
('WTH023','TEST_DANG','HanNopBoSung',N'{"MaTienDo":"WTD023","HanNopBoSung":null}',
 (SELECT 'WTD023' MaTienDo,DATEADD(DAY,2,@now) HanNopBoSung FOR JSON PATH,WITHOUT_ARRAY_WRAPPER),N'SV đã trình bày trực tiếp, Khoa chấp thuận theo biên bản test BS23','TK002',@now),
('WTH024','TEST_DANG','HanNopBoSung',N'{"MaTienDo":"WTD024","HanNopBoSung":null}',
 (SELECT 'WTD024' MaTienDo,DATEADD(DAY,-1,@now) HanNopBoSung FOR JSON PATH,WITHOUT_ARRAY_WRAPPER),N'Gia hạn cá biệt theo biên bản test BS24, nay đã hết hạn','TK002',DATEADD(DAY,-3,@now));

-- CLO: đủ 11, chỉ DN, chỉ GV, thiếu 1 có TongDiem cũ, trống và 0 nhập rõ.
INSERT INTO PHIEUCHAMDIEM (maPhieu,tongDiem,ngayCham,maDot,maSV,maHuongDanDN,maGVHuongDan,nhanXetGV,nhanXetDN,daDoiChieuPhieuDN)
SELECT CONCAT('WPC',RIGHT(p.maSV,3)),CASE WHEN p.maSV='WX031' THEN 9 ELSE NULL END,@today,p.maDot,p.maSV,
 dn.maDaiDien,hd.maSo,N'Nhận xét GV mẫu kiểm thử',N'Nhận xét DN mẫu kiểm thử',0
FROM PHANBOTHUCTAP p JOIN GVHUONGDAN hd ON hd.maSV=p.maSV AND hd.maDot=p.maDot
JOIN HUONGDANDOANHNGHIEP dn ON dn.maPB=p.maPB
WHERE p.maSV IN ('WX026','WX027','WX028','WX029','WX030','WX031','WX032','WX041','WX043','WX045','WX046','WX047');
INSERT INTO CHITIETCHAMDIEM (maSo,diemCham,maPhieu,maTieuChi)
SELECT CONCAT('WCD',RIGHT(p.maSV,3),'_',t.maTieuChi),
 CASE WHEN p.maSV='WX030' THEN 0 WHEN p.maSV='WX029' THEN ROUND(t.diemToiDa*0.3,2) ELSE t.diemToiDa END,p.maPhieu,t.maTieuChi
FROM PHIEUCHAMDIEM p JOIN DOTTHUCTAP d ON d.maSo=p.maDot JOIN TIEUCHI t ON t.maRubric=d.maRubric
WHERE p.maPhieu LIKE 'WPC%' AND p.maSV<>'WX032'
 AND (p.maSV<>'WX026' OR t.nhomDanhGia='DN') AND (p.maSV NOT IN ('WX027','WX041') OR t.nhomDanhGia='GV')
 AND (p.maSV<>'WX031' OR t.maTieuChi<>'CLO4.2');
UPDATE p SET tongDiem=(SELECT SUM(c.diemCham) FROM CHITIETCHAMDIEM c WHERE c.maPhieu=p.maPhieu)
FROM PHIEUCHAMDIEM p WHERE p.maPhieu LIKE 'WPC%' AND p.maSV<>'WX031';
INSERT INTO KHONGHOANTATDOT (MaDot,MaSV,HieuLuc,LyDo,CanCu,NguoiXacNhan,NgayXacNhan)
VALUES ('TEST_KT','WX042',1,N'SV xin dừng thực tập vì lý do cá nhân',N'Đơn xác nhận kiểm thử KHT42','TK002',@now);
INSERT INTO CHOTDOTTHUCTAP (MaDot,TrangThai,PhienBan,HanMoLai,NguoiCapNhat,NgayCapNhat,LyDo) VALUES
('TEST_KHOA','DaChot',1,NULL,'TK002',DATEADD(DAY,-3,@now),N'Đợt mẫu đã đủ điểm, Khoa chốt để test khóa ghi'),
('TEST_MOLAI','MoLai',2,DATEADD(DAY,3,@now),'TK002',DATEADD(DAY,-1,@now),N'Mở lại sửa sai theo biên bản kiểm thử'),
('TEST_HETMO','MoLai',2,DATEADD(DAY,-1,@now),'TK002',DATEADD(DAY,-3,@now),N'Hạn mở lại kiểm thử đã hết');
INSERT INTO NHATKYCHOTDOT (MaNhatKy,MaDot,PhienBan,Loai,NguoiThucHien,ThoiDiem,LyDo,NoiDung)
SELECT CONCAT('WCHOT_',p.maDot),p.maDot,1,'Chot','TK002',DATEADD(DAY,-5,@now),N'Quyết định mẫu test, không phải quyết định thật',
 (SELECT s.maSV MaSV,s.hoTen HoTen,p.tongDiem TongDiem FROM SINHVIEN s WHERE s.maSV=p.maSV FOR JSON PATH)
FROM PHIEUCHAMDIEM p WHERE p.maDot IN ('TEST_KHOA','TEST_MOLAI','TEST_HETMO');
INSERT INTO NHATKYCHOTDOT (MaNhatKy,MaDot,PhienBan,Loai,NguoiThucHien,ThoiDiem,LyDo,NoiDung)
SELECT CONCAT('WOPEN_',MaDot),MaDot,2,'MoLai','TK002',NgayCapNhat,LyDo,(SELECT HanMoLai FOR JSON PATH,WITHOUT_ARRAY_WRAPPER) FROM CHOTDOTTHUCTAP WHERE TrangThai='MoLai';

-- Hồ sơ PV đã có học vụ: dùng testsv40 để thử chặn sửa qua luồng phỏng vấn.
INSERT INTO DANGKYTHUCTAP (maDK,ngayDangKy,thuTuUuTien,trangThai,maSV,maCongTy,maDot,MaViTri,ViTriDangKy,YeuCauDangKy)
SELECT 'WDK040',DATEADD(DAY,-35,@today),1,'DaDuyet','WX040','WCT01','TEST_DANG',MaViTri,TenViTri,YeuCau FROM VITRITHEODOT WHERE MaViTri='TEST_DANG_WCT01_A';
INSERT INTO PHONGVAN (maPV,hinhThuc,ngayPV,ketQua,maDaiDien,maSV,MaDK,LyDoKetQua,NguonKetQua,NguoiGhiKetQua,ThoiDiemKetQua)
VALUES ('WPV040',N'Trực tuyến',DATEADD(DAY,-34,@local),'Dat','WDD01','WX040','WDK040',N'DN đã xác nhận tiếp nhận, sau đó Khoa phân GV','DoanhNghiep','WTK_WDD01',DATEADD(DAY,-33,@now));
INSERT INTO NHATKYPHONGVAN (MaNhatKy,MaPV,MaDK,KetQuaCu,KetQuaMoi,LyDo,Nguon,NguoiThucHien,ThoiDiem)
VALUES ('WNK_WPV040','WPV040','WDK040','ChuaCoKetQua','Dat',N'DN đã xác nhận tiếp nhận','DoanhNghiep','WTK_WDD01',DATEADD(DAY,-33,@now));
INSERT INTO NHATKYDIEUCHINHTHUCTAP (MaNhatKy,MaDot,MaSV,MaPhanBo,Loai,LyDo,CanCu,NoiDung,NguoiThucHien,ThoiDiem)
VALUES ('WDC035_TIME','TEST_DANG','WX035','WPB035','ThoiGian',N'SV cá biệt lệch lịch đợt, đã điều chỉnh trước khi bắt đầu',N'Biên bản kiểm thử TG35',N'Ngày riêng bắt đầu muộn hơn khung đợt 10 ngày','TK002',DATEADD(DAY,-35,@now));

-- Công bố dự kiến, phản hồi chờ xử lý và danh sách chính thức có snapshot đúng DTO.
DECLARE @snap NVARCHAR(MAX);
SELECT @snap=(SELECT s.maSV MaSV,s.hoTen HoTen,s.lop Lop,CAST(1 AS BIT) CoNoiThucTap,p.maPB MaPhanBo,
 p.maCongTy MaCongTy,c.tenCongTy TenCongTy,N'Backend .NET Intern' ViTri,d.thoiGianBD NgayBatDau,d.thoiGianKT NgayKetThuc,N'Đã có nơi thực tập' TinhTrang
 FROM PHANBOTHUCTAP p JOIN SINHVIEN s ON s.maSV=p.maSV JOIN CONGTY c ON c.maCongTy=p.maCongTy JOIN DOTTHUCTAP d ON d.maSo=p.maDot WHERE p.maPB='WPB049' FOR JSON PATH);
INSERT INTO CONGBODANHSACHTHUCTAP (MaCongBo,MaDot,PhienBan,TieuDe,NoiDung,HanPhanHoi,NgayCongBo,NguoiCongBo,DanhSachJson) VALUES
('WCB_DUKIEN','TEST_DUKIEN',1,N'[TEST] Danh sách dự kiến',N'Sinh viên kiểm tra và phản hồi thông tin.',DATEADD(DAY,5,@now),DATEADD(DAY,-1,@now),'TK002',@snap);
INSERT INTO PHANHOIDANHSACHTHUCTAP (MaPhanHoi,MaDot,MaCongBo,MaSV,LanPhanHoi,ThongTinDung,NoiDung,NguoiGui,NgayGui,ThongTinCuJson,ThongTinMoiJson)
VALUES ('WPH049','TEST_DUKIEN','WCB_DUKIEN','WX049',1,0,N'Đề nghị bổ sung địa chỉ công ty theo giấy tiếp nhận.','WTK_SV49',@now,
 JSON_QUERY(@snap,'$[0]'),N'{"TenCongTy":"[TEST] Công nghệ Sao Việt","DiaChi":"123 Đường Thử Nghiệm, TP.HCM","MaSoThue":""}');
UPDATE DOTTHUCTAP SET TrangThaiDanhSachNoi='DuKien' WHERE maSo='TEST_DUKIEN';
SELECT @snap=(SELECT s.maSV MaSV,s.hoTen HoTen,s.lop Lop,CAST(1 AS BIT) CoNoiThucTap,p.maPB MaPhanBo,
 p.maCongTy MaCongTy,c.tenCongTy TenCongTy,N'Backend .NET Intern' ViTri,d.thoiGianBD NgayBatDau,d.thoiGianKT NgayKetThuc,N'Đã có nơi thực tập' TinhTrang
 FROM PHANBOTHUCTAP p JOIN SINHVIEN s ON s.maSV=p.maSV JOIN CONGTY c ON c.maCongTy=p.maCongTy JOIN DOTTHUCTAP d ON d.maSo=p.maDot WHERE p.maPB='WPB048' FOR JSON PATH);
INSERT INTO CONGBODANHSACHTHUCTAP (MaCongBo,MaDot,PhienBan,TieuDe,NoiDung,HanPhanHoi,NgayCongBo,NguoiCongBo,DanhSachJson) VALUES
('WCB_CHOTDS','TEST_CHOTDS',1,N'[TEST] Danh sách đã rà soát',N'Danh sách mẫu kiểm thử chốt chính thức.',DATEADD(DAY,-1,@now),DATEADD(DAY,-3,@now),'TK002',@snap);
INSERT INTO DANHSACHTHUCTAPCHINHTHUC (MaDot,MaCongBo,PhienBanRaSoat,DanhSachJson,LyDo,NguoiChot,NgayChot)
VALUES ('TEST_CHOTDS','WCB_CHOTDS',0,@snap,N'Khoa đã rà soát theo biên bản kiểm thử DS48','TK002',@now);
UPDATE DOTTHUCTAP SET TrangThaiDanhSachNoi='ChinhThuc' WHERE maSo='TEST_CHOTDS';
INSERT INTO LANHOTROTHUCTAP (MaLan,MaDot,TenLan,NgayHoTro,TrangThai,PhienBan,DanhSachJson,NhatKyJson)
SELECT 'WLAN01','TEST_MOI',N'[TEST] Hỗ trợ SV hết lượt/chưa có nơi',DATEADD(DAY,1,@local),'Nhap',0,
 (SELECT maSV MaSV,hoTen HoTen,lop Lop,'ChuaGhiNhan' KetQua,N'' GhiChu FROM SINHVIEN WHERE maSV IN ('WX001','WX002','WX011') FOR JSON PATH),N'[]';

-- Bản đồ tài khoản và kịch bản truy vấn ngay trong SSMS.
CREATE TABLE WEBTEST_KICHBAN (
 MaKichBan NVARCHAR(20) NOT NULL PRIMARY KEY,MaSV NVARCHAR(20) NOT NULL,
 TenDangNhap NVARCHAR(50) NOT NULL,MaDot NVARCHAR(20) NOT NULL,MoTa NVARCHAR(200) NOT NULL,
 NgayTao DATETIMEOFFSET NOT NULL,CONSTRAINT FK_WEBTEST_SV FOREIGN KEY (MaSV) REFERENCES SINHVIEN(maSV),
 CONSTRAINT FK_WEBTEST_DOT FOREIGN KEY (MaDot) REFERENCES DOTTHUCTAP(maSo)
);
INSERT INTO WEBTEST_KICHBAN
SELECT CONCAT('DATA-',RIGHT(CONCAT('00',s.N),2)),r.MaSV,CONCAT('testsv',RIGHT(CONCAT('00',s.N),2)),r.MaDot,s.Scenario,@now
FROM @students s JOIN SVTHAMGIADOT r ON r.MaSV=CONCAT('WX',RIGHT(CONCAT('000',s.N),3)) WHERE r.MaDot NOT IN ('TEST_CHUACHAM','TEST_HETCHAM');
INSERT INTO THONGBAO (maThongBao,tieuDe,noiDung,ngayTao,maNguoiGui,nguoiGui,doiTuong,maDot,ghim) VALUES
('WTB_ALL',N'[TEST] Hướng dẫn thực tập Khoa CNTT',N'Thông báo thử hiển thị chung; không phải thông báo chính thức.',@local,'TK002',N'Khoa CNTT','ALL',NULL,1),
('WTB_SV',N'[TEST] Sinh viên đăng ký và xác nhận nơi',N'Thông báo dành cho sinh viên đúng đợt TEST_MOI.',@local,'TK002',N'Khoa CNTT','SinhVien','TEST_MOI',0),
('WTB_GV',N'[TEST] Giảng viên theo dõi tiến độ',N'Thông báo dành cho giảng viên đợt TEST_DANG.',@local,'TK002',N'Khoa CNTT','GiangVien','TEST_DANG',0);
-- Không seed STORED_DOCUMENT Ready giả, URL CV giả hay kết quả LTR/TF-IDF giả.
COMMIT TRANSACTION;
GO
PRINT N'Đã tạo schema hiện hành và dữ liệu test. Mật khẩu mẫu: 123456. Xem WEBTEST_KICHBAN và database/README_WEB_TEST.md.';
GO
-- END GENERATED WEB TEST DATA
