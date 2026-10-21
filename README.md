# Internship Management — Quản lý thực tập + AI gợi ý công ty

## Phạm vi đã chốt

### A. Quản lý hệ thống
- Đăng nhập / đăng xuất.
- Phân quyền theo 5 vai trò trong SQL: QuanTriVien, Khoa, GiangVien, SinhVien, DaiDienDN.
- Quản trị tài khoản: xem, khóa/mở khóa.
- Đổi mật khẩu.
- Đăng ký công khai chỉ dành cho SinhVien.

### B. Quản lý Khoa
- Danh mục Sinh viên.
- Danh mục Giảng viên.
- Danh mục Công ty.
- Xét duyệt Công ty: ChoDuyet → DaDuyet / TuChoi / DongBang.
- Danh mục Đợt thực tập.

### C. AI — B Mô hình
Chỉ sử dụng:

`Hồ sơ SV → TF-IDF → Cosine Similarity → Ranking → Top-K`

Không dùng embedding, BERT, Transformer, collaborative filtering hay `DEXUATCONGTY`.

### D. Đánh giá
- DCG.
- IDCG.
- NDCG@K.
- Ground truth lấy từ đăng ký đã duyệt và phân bổ thực tập trong CSDL.

## Database

Toàn bộ T-SQL ban đầu được nhúng vào `backend/src/InternshipManagement.DAL/Database/EmbeddedDatabaseScript.cs`.
Không cần giữ một file `.sql` riêng để khởi tạo ứng dụng.

Khi API khởi động, `DatabaseInitializer`:
1. kiểm tra database `QuanLyThucTap`;
2. nếu chưa có thì tạo database;
3. chạy script nhúng một lần;
4. nếu bảng `TAIKHOAN` đã tồn tại thì không reset dữ liệu.

## Chạy

### Backend
```bash
cd backend/src/InternshipManagement.API
dotnet restore
dotnet run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Tài khoản mẫu: `admin`, `khoa01`, `sv001` — mật khẩu `123456`.

## Công thức AI

### TF-IDF
`TF-IDF(t,d) = TF(t,d) × IDF(t)`

### Cosine Similarity
`cos(A,B) = (A·B) / (||A|| × ||B||)`

### Ranking
Điểm xếp hạng của công ty chính là Cosine Similarity giữa vector TF-IDF của hồ sơ sinh viên và vector TF-IDF của yêu cầu công ty. Các công ty được sắp xếp giảm dần theo điểm này để lấy Top-K.

### NDCG@K
Relevance được lấy từ dữ liệu nghiệp vụ:
- Công ty đã phân bổ cho sinh viên: relevance = 3.
- Đăng ký thực tập đã được duyệt: relevance = 2.
- Công ty còn lại: relevance = 0.

`NDCG@K = DCG@K / IDCG@K`.
