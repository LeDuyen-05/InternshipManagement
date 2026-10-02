# Database — InternshipManagementDb (SQL Server)

## Thứ tự chạy script
1. `01_create_database.sql` — tạo database
2. `02_create_tables.sql` — tạo 18 bảng (PK)
3. `03_create_constraints.sql` — khóa ngoại (FK)
4. `04_create_indexes.sql` — index cho cột FK hay truy vấn
5. `05_seed_data.sql` — dữ liệu mẫu để test (không phải dữ liệu thật)
6. `06_create_views.sql` — view thống kê (module BaoCao)
7. `07_create_stored_procedures.sql` — SP minh họa

## Ghi chú các quyết định thiết kế (đã xác nhận với nhóm)
- `DANGKYTHUCTAP`: khóa chính riêng `maDangKy` (không dùng khóa phức hợp).
- `CHITIETCHAMDIEM`: khóa phức hợp `(maPhieuCham, maTieuChi)`.
- `PHANBOTHUCTAP`: bổ sung `maSinhVien` để xác định trực tiếp sinh viên được phân bổ.
- `DEXUATCONGTY`: giữ lại theo xác nhận, thuộc tính theo bộ đã thống nhất trước đó.

## ĐỀ XUẤT — chưa được nhóm xác nhận chính thức
- `GOIYCONGTY`: dùng khóa phức hợp `(maHoSo, maCongTy)` vì sơ đồ không có mã riêng.
  Nếu hệ thống cần lưu nhiều lần gợi ý theo thời gian cho cùng 1 cặp, cần bổ sung
  tiêu chí phân biệt — đề nghị nhóm xác nhận lại trước khi triển khai chính thức.
- `GIOITHIEU`: bổ sung `ngayGioiThieu`, `trangThaiKetNoi` vì ảnh sơ đồ mới nhất có
  thể đã bị cắt bớt thuộc tính hiển thị — đề nghị đối chiếu lại file sơ đồ lớp gốc.

## Kết nối
Connection string mặc định (khớp `appsettings.json` của backend):
```
Server=localhost;Database=InternshipManagementDb;Trusted_Connection=True;TrustServerCertificate=True;
```
