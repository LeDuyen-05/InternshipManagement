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

### Bộ dữ liệu thu thập ngoài (`du-lieu-train`)
Giải nén vào `data_raw/du-lieu-train/` (gồm `ho_so_sv_an_danh.csv`, `jd_tong_hop.csv`, `nhan_0_3.csv`;
thư mục này không đưa lên git), rồi chạy:
```bash
python run_external_pipeline.py      # → output/external/
```
Tiền xử lý (`data_pipeline/external_dataset.py`):
- **Ẩn danh lại**: 72/237 hồ sơ gốc còn số điện thoại, ngày sinh, mảnh họ tên cạnh `[TEN]` → thay bằng
  `[SDT]`, `[NGAY]`, `[EMAIL]`, `[URL]`, `[TEN]` (còn 0). Bỏ 1 hồ sơ rỗng.
- **Làm sạch kỹ năng JD**: danh sách gốc gán nhầm do khớp chuỗi con (`go` ở 63 JD nhưng chỉ 1 JD thật sự
  yêu cầu Golang; `net` ← "Network"; `nan`, `erp`) → kỹ năng mơ hồ chỉ giữ khi văn bản có bằng chứng, bổ sung
  kỹ năng trích từ tiêu đề + `technical_skills` + mô tả; chuẩn hóa cách viết hai phía (springboot/spring boot…).
- **Vị trí JD** suy từ tiêu đề (backend, frontend, BA, tester, design, game…); vị trí SV từ nhóm BE/FE/BA.
- **Embedding**: TF-IDF fit chung CV + JD → LSA (TruncatedSVD 256 chiều, chuẩn hóa L2).
- **Nhãn** `nhan` tính lại theo cùng luật với nhãn gốc (tỉ lệ kỹ năng JD được đáp ứng: 0 → 0; <0.3 → 1;
  <0.6 → 2; ≥0.6 → 3 nếu đúng vị trí, ngược lại 2) nhưng trên kỹ năng đã làm sạch và **không tính kỹ năng chung**
  (`git`, `teamwork`, `agile`); nhãn gốc giữ ở `nhan_goc`.
- `split` theo hồ sơ (70/15/15, phân tầng theo nhóm, seed 42).

| File `output/external/` | Nội dung |
|---|---|
| `cap_huan_luyen.csv` / `.json` | 42 008 cặp (hồ sơ × JD) + đặc trưng + `nhan_goc` + `nhan` + `split` |
| `ho_so_da_xu_ly.csv`, `jd_da_xu_ly.csv` | văn bản đã ẩn danh lại, kỹ năng chuẩn, vị trí |
| `emb_ho_so.npy`, `emb_jd.npy` (+ `*_ids.csv`) | embedding LSA, cùng thứ tự với file id |
| `tfidf_vectorizer.joblib`, `lsa_svd.joblib` | để biến đổi hồ sơ/JD mới vào cùng không gian |
| `bo_mau_gan_nhan_tay.csv` | 20 SV tập test × 12 JD, cột `nhan_tay_0_3` để trống cho GVHD/nhóm gán tay |
| `bao_cao_du_lieu.json` | thống kê làm sạch, phân bố nhãn, ma trận nhãn gốc × mới, baseline NDCG@K |

**Lưu ý khi huấn luyện:** cả `nhan` lẫn `nhan_goc` đều sinh bằng luật trên độ trùng kỹ năng (cây quyết định
độ sâu 4 tái tạo nhãn gốc 98,5%), nên **không** đưa các cột trong `cot_dinh_nghia_nhan_khong_dung_lam_dac_trung`
(`ti_le_dap_ung_jd`, `so_ky_nang_trung`, `jaccard_ky_nang`, `khop_vi_tri`, …) vào mô hình — nếu không mô hình chỉ
học lại luật và NDCG cao giả. Dùng embedding/`tfidf_cosine`/`lsa_cosine`/GPA, và đánh giá cuối trên tập gán tay.

## Phần B/C — Gợi ý Top-K
```bash
python generate_recommendations.py   # TF-IDF + cosine → ghi bảng GOIYCONGTY
```
Backend C# (`RecommendationService`) tính gợi ý trực tiếp lúc chạy; script này dùng để batch/đánh giá offline.
