# ML Service — Gợi ý công ty thực tập (chạy dạng script, không phải service sống)

## Hướng đã thống nhất với GVHD (18/9) + điều chỉnh để đơn giản hóa demo
- Dữ liệu ảo: JD thu thập thực tế (Google/trang tuyển dụng CNTT) + hồ sơ SV mẫu.
- Thay vì chạy 1 service Python sống song song lúc demo (rủi ro quên bật/bị lỗi),
  script này chạy **offline**, đọc dữ liệu từ SQL Server, tính TF-IDF + Cosine
  Similarity, rồi **ghi thẳng kết quả vào bảng `GOIYCONGTY`**.
- Backend C# và giao diện web chỉ cần **đọc dữ liệu có sẵn** trong bảng đó —
  không gọi API Python lúc runtime.

## Cấu hình kết nối Database
Mặc định kết nối tới database `QuanLyThucTap` trên `localhost\SQLEXPRESS`. Có thể cấu hình chuỗi kết nối qua biến môi trường `ML_ODBC_CONNECTION`:
```bash
set ML_ODBC_CONNECTION=DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost\SQLEXPRESS;DATABASE=QuanLyThucTap;Trusted_Connection=yes;TrustServerCertificate=yes
```
Lưu ý: Giao diện web và backend runtime sử dụng trực tiếp C# `RecommendationService` để tính toán gợi ý trực tiếp. Bộ script Python này được dùng làm công cụ batch offline và đánh giá offline.

## Cài đặt
```bash
cd ml-service
python -m venv venv
venv\Scripts\activate          # Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
```
Cần cài thêm **ODBC Driver 17 for SQL Server** trên máy.

## Chạy
```bash
python generate_recommendations.py
```
Chạy lại mỗi khi cần tính toán batch lại gợi ý cho toàn bộ sinh viên vào bảng `GOIYCONGTY`.

## Việc cần làm tiếp (chưa có trong skeleton này)
- Thu thập JD thật, nạp vào bảng `CONGTY.yeuCau`
- Tạo hồ sơ sinh viên mẫu, nạp vào bảng `HOSONANGLUC.NDHoSo`
- Thử nghiệm trước trong Jupyter Notebook (tự tạo thư mục `notebooks/` nếu cần) trước khi chạy chính thức
