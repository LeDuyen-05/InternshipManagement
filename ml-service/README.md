# ML Service — Gợi ý công ty thực tập (chạy dạng script, không phải service sống)

## Hướng đã thống nhất với GVHD (18/9) + điều chỉnh để đơn giản hóa demo
- Dữ liệu ảo: JD thu thập thực tế (Google/trang tuyển dụng CNTT) + hồ sơ SV mẫu.
- Thay vì chạy 1 service Python sống song song lúc demo (rủi ro quên bật/bị lỗi),
  script này chạy **offline**, đọc dữ liệu từ SQL Server, tính TF-IDF + Cosine
  Similarity, rồi **ghi thẳng kết quả vào bảng `GOIYCONGTY`**.
- Backend C# và giao diện web chỉ cần **đọc dữ liệu có sẵn** trong bảng đó —
  không gọi API Python lúc runtime.

## Cài đặt
```bash
cd ml-service
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```
Cần cài thêm **ODBC Driver 17 for SQL Server** trên máy (driver kết nối, không phải package Python).

## Chạy
```bash
python generate_recommendations.py
```
Chạy lại mỗi khi có sinh viên/công ty mới cần tính gợi ý (thủ công, hoặc đặt lịch chạy định kỳ bằng Task Scheduler/cron nếu muốn).

## Việc cần làm tiếp (chưa có trong skeleton này)
- Thu thập JD thật, nạp vào bảng `CONGTY.yeuCau`
- Tạo hồ sơ sinh viên mẫu, nạp vào bảng `HOSONANGLUC.NDHoSo`
- Thử nghiệm trước trong Jupyter Notebook (tự tạo thư mục `notebooks/` nếu cần) trước khi chạy chính thức
