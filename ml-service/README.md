# ML Service — Gợi ý công ty thực tập (chạy dạng script offline)

Gồm 2 phần:

| Phần | Script | Phụ trách |
|---|---|---|
| A – Dữ liệu: tiền xử lý, embedding, tạo tập nhãn | `run_data_pipeline.py`, `data_pipeline/` | Người 2 |
| B/C – Huấn luyện xếp hạng, ghi `GOIYCONGTY` | `generate_recommendations.py`, `services/` | Người 1, Người 3 |

## Cài đặt (Python 3.11–3.13)
```bash
cd ml-service
python -m venv venv
venv\Scripts\activate          # Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
```
Cần **ODBC Driver 17 hoặc 18 for SQL Server** (script tự chọn driver mới nhất có trên máy).
Mặc định kết nối `localhost\SQLEXPRESS`, CSDL `QuanLyThucTap`; đổi bằng biến môi trường:
```bash
set ML_ODBC_CONNECTION=DRIVER={ODBC Driver 18 for SQL Server};SERVER=localhost\SQLEXPRESS;DATABASE=QuanLyThucTap;Trusted_Connection=yes;TrustServerCertificate=yes
```

## Phần A — Pipeline dữ liệu
```bash
python run_data_pipeline.py                          # đọc SQL Server → output/
python run_data_pipeline.py --export-csv data_raw    # lưu thêm dữ liệu thô ra CSV (gửi cho thành viên khác)
python run_data_pipeline.py --source csv --csv-dir data_raw   # chạy offline, không cần SQL Server
python run_data_pipeline.py --synthetic 300          # thêm 300 hồ sơ SV ảo để tăng cỡ mẫu
python run_data_pipeline.py --write-db               # ghi vector vào HOSONANGLUC.embeddingHoSo / CONGTY.embeddingYeuCau
python -m unittest discover -s tests                 # kiểm thử tiền xử lý & gán nhãn
```

### Các bước
1. **Tiền xử lý** (`preprocessor.py`): chuẩn hóa Unicode/chữ thường, chuẩn hóa từ khóa CNTT về một dạng
   (ReactJS/React.js → `react`, "học máy" → `machine_learning`, giữ cụm như `spring_boot`), bỏ stopword,
   trích kỹ năng chuẩn, lĩnh vực (web, AI, dữ liệu, mobile, DevOps, ATTT, kiểm thử) và GPA tối thiểu của JD.
   Hồ sơ SV = `NDHoSo` + kỹ năng + công nghệ + dự án + chuyên ngành; JD = vị trí + yêu cầu.
2. **Embedding** (`embedder.py`): TF-IDF (unigram + bigram, sublinear tf) fit chung trên hồ sơ và JD,
   lưu `tfidf_vectorizer.joblib` để mọi người dùng cùng một không gian vector.
3. **Tạo nhãn** (`dataset_builder.py`): mỗi cặp (SV, công ty đã duyệt) một dòng.

### Đầu ra `output/` — bàn giao
| File | Nội dung |
|---|---|
| `training_pairs.csv`, `training_dataset.json` | cặp `maSV, maHoSo, maCongTy` + đặc trưng + nhãn + `split` |
| `processed_profiles.csv`, `processed_jds.csv` | văn bản đã làm sạch, kỹ năng, lĩnh vực |
| `tfidf_vectorizer.joblib` | vectorizer (nạp bằng `TfidfEmbedder.load`) |
| `pipeline_report.json` | số lượng, phân bố nhãn, SV/công ty không nhận diện được kỹ năng |

Đặc trưng: `tfidf_cosine`, `skill_overlap`, `skill_jaccard`, `skill_coverage_jd`, `domain_match`, `gpa_ok`, `gpa_margin`.

Nhãn (thang 0–3, dùng trực tiếp làm relevance cho NDCG@K):

| `label_tuong_tac` (từ quy trình thật) | |
|---|---|
| 3 | được doanh nghiệp tiếp nhận (phân bổ còn hiệu lực) |
| 2 | phỏng vấn Đạt / nguyện vọng được duyệt |
| 1 | SV đăng ký nguyện vọng, đang chờ |
| 0 | bị từ chối / phỏng vấn không đạt |

`label_yeu` suy từ nội dung (cùng lĩnh vực, tỉ lệ kỹ năng trùng, GPA) cho các cặp chưa có tương tác.
`label` = nhãn tương tác nếu có, ngược lại nhãn yếu; `label_nguon` ∈ {`tuong_tac`, `noi_dung`}.

**Lưu ý cho Người 1 khi huấn luyện/đánh giá**
- `split` chia theo **sinh viên** (không rò rỉ cùng SV giữa train/test), seed cố định.
- Nhãn yếu dùng chung thông tin với đặc trưng `skill_*`/`domain_match` → báo cáo NDCG@K riêng trên
  `label_nguon == "tuong_tac"` để kết quả không bị lạc quan giả.
- Hồ sơ ảo (`maSV` bắt đầu bằng `SYN`) chỉ có nhãn yếu; không ghi vào CSDL.

## Phần B/C — Gợi ý Top-K
```bash
python generate_recommendations.py   # TF-IDF + cosine → ghi bảng GOIYCONGTY
```
Backend C# (`RecommendationService`) tính gợi ý trực tiếp lúc chạy; script này dùng để batch/đánh giá offline.
