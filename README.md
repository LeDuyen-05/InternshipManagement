# Hệ thống Quản lý công tác thực tập tốt nghiệp — Khoa CNTT

Đồ án tốt nghiệp — CNTT-KLCN189.


## Kiến trúc: 3 lớp (API → BLL → DAL)

```
backend/
├── InternshipManagement.sln
├── src/
│   ├── InternshipManagement.API/     ← Controllers, Program.cs
│   ├── InternshipManagement.BLL/     ← Services, DTOs, Validators (business logic)
│   └── InternshipManagement.DAL/     ← Entities, AppDbContext, Repositories (dữ liệu)
└── tests/InternshipManagement.UnitTests/

frontend/        ← ReactJS + Vite + Tailwind
ml-service/      ← Script Python (TF-IDF + Cosine Similarity), chạy offline
database/        ← Script SQL Server, chạy tuần tự 01 → 07
docs/            ← UML, đặc tả, thiết kế giao diện
```

**Quy tắc phụ thuộc**: `API → BLL → DAL` — một chiều duy nhất, dễ nhớ.

## PHÂN CÔNG MODULE — đọc kỹ để tránh code chồng lên nhau

| Người | Module phụ trách | Thư mục chính |
|---|---|---|
| | Admin, Đăng nhập/Phân quyền + tổng hợp/kiểm thử chung | `*/Admin/`, review toàn bộ PR trước khi merge |
|| Sinh viên, Công ty, Khoa/Ban doanh nghiệp | `*/SinhVien/`, `*/CongTy/`, `*/DangKyThucTap/` |
|| Giảng viên, Đại diện doanh nghiệp, AI | `*/GiangVien/`, `*/HuongDan/`, `ml-service/` |

**3 file dùng chung — chỉ  được sửa, người khác cần thì nhắn thêm giúp:**
- `DAL/AppDbContext.cs`
- `API/Program.cs`
- Các file `.csproj` (khi cần thêm NuGet package mới)

## Module mẫu (pattern) đã dựng sẵn hoàn chỉnh: SinhVien

Dùng đúng khuôn mẫu này khi code module mới:
```
DAL/Entities/SinhVien.cs
DAL/Repositories/ISinhVienRepository.cs + SinhVienRepository.cs
BLL/DTOs/SinhVien/*.cs
BLL/Validators/SinhVien/CreateSinhVienValidator.cs
BLL/Services/SinhVien/ISinhVienService.cs + SinhVienService.cs
API/Controllers/SinhVienController.cs
frontend/src/pages/SinhVien/SinhVienListPage.jsx
```

## Bắt đầu nhanh

### 1. Database
Mở SQL Server Management Studio, chạy tuần tự các file trong `database/` (01 → 07).

### 2. Backend
```bash
cd backend
dotnet restore
dotnet build
dotnet run --project src/InternshipManagement.API
# Swagger: http://localhost:5100/swagger
```
Chỉnh connection string trong `backend/src/InternshipManagement.API/appsettings.json` nếu cần.

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# http://localhost:5173
```

### 4. ML Service (chạy khi cần cập nhật gợi ý, không cần chạy lúc demo)
```bash
cd ml-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python generate_recommendations.py
```

### 5. Test
```bash
cd backend
dotnet test
```

## Đưa lên GitHub

```bash
git init
git add .
git commit -m "Khởi tạo cấu trúc project"
git branch -M main
git remote add origin <link-repo-github-cua-nhom>
git push -u origin main
```

Sau đó mỗi người:
```bash
git checkout -b feature/<ten>-<module>     # vd: feature/chi-dangky
# ... code ...
git add .
git commit -m "Mô tả ngắn gọn đã làm gì"
git push origin feature/<ten>-<module>
# Rồi tạo Pull Request trên GitHub, nhờ  review + merge vào main
```

**Quan trọng**: pull code mới nhất từ `main` về nhánh của mình **mỗi ngày** trước khi code tiếp, tránh để lâu dễ bị conflict lớn.

## ⚠️ Điểm cần xác nhận thêm với GVHD (xem comment "ĐỀ XUẤT"/"GHI CHÚ" trong code)
- `GoiYCongTy`: khóa phức hợp (maHoSo, maCongTy) — đề xuất, chưa xác nhận chính thức.
- `GioiThieu`: thuộc tính `ngayGioiThieu`, `trangThaiKetNoi` — cần đối chiếu lại sơ đồ lớp mới nhất.
- `PhanBoThucTap`: đã thêm `maSinhVien` theo yêu cầu — cần đối chiếu lại multiplicity trong sơ đồ lớp phân tích.
