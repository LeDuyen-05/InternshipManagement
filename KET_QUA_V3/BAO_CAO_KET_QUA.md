# Kết quả train v3 do notebook của Chi tạo

Báo cáo tự động từ các file kết quả thực tế của lần chạy này. Nhãn là nhãn yếu theo luật; chưa có đánh giá chuyên gia hoặc người chấm độc lập.

## 1. Dữ liệu và phương pháp

- Hồ sơ: 236; JD: 178; cặp: 42008.
- Cặp train/val/test: 29548 / 6230 / 6230.
- Hash manifest nguồn: `fdf9964e9e44dcb81645d40254df17337ac9b501eec73e526521afb6df9f84b8`.
- Phạm vi fit: unseen students, known 178-job catalogue; fit train profiles + known jobs only.
- TF-IDF/LSA đã chuẩn bị trước trên hồ sơ train và danh mục JD đã biết. SBERT pretrained cố định; không fine-tune encoder.
- Ba cấu hình định trước; chọn theo validation NDCG@5; test chỉ được chấm sau khi chốt model.
- Model chọn: `six_features_wide`, 21 vòng; feature: tfidf_cosine, lsa_cosine, sbert_cosine, gpa_chuan_hoa, thieu_gpa, jd_co_mo_ta.
- GPA thiếu được điền median train 3.2800; vẫn giữ cờ thiếu.

## 2. Validation

| Phương pháp | NDCG@5 | NDCG@10 |
|---|---:|---:|
| tfidf_cosine | 0.5161 | 0.5072 |
| lsa_cosine | 0.5238 | 0.5123 |
| sbert_cosine | 0.4173 | 0.4065 |
| semantic | 0.5898 | 0.5447 |
| six_features | 0.6358 | 0.5769 |
| six_features_wide | 0.6384 | 0.5779 |

## 3. Test trên nhãn yếu

| Phương pháp | NDCG@5 | NDCG@10 | Recall@5 | Recall@10 |
|---|---:|---:|---:|---:|
| tfidf_cosine | 0.5173 | 0.5076 | 0.0502 | 0.0950 |
| lsa_cosine | 0.5201 | 0.5065 | 0.0504 | 0.0953 |
| sbert_cosine | 0.4340 | 0.4111 | 0.0414 | 0.0730 |
| LambdaMART | 0.6205 | 0.5799 | 0.0590 | 0.1085 |

NDCG dùng gain 2^nhãn−1; Recall coi nhãn ≥2 là relevant. Mẫu số Recall là toàn bộ relevant trong danh mục ứng viên của hồ sơ.

NDCG@5 tính trên 35/35 query; Recall@5 trên 35 query. Query không có relevant được loại khỏi trung bình tương ứng và công bố số lượng.

| Nhóm hồ sơ | Query NDCG@5 | LTR NDCG@5 | LTR NDCG@10 |
|---|---:|---:|---:|
| BA | 9 | 0.5094 | 0.5146 |
| BE | 18 | 0.6876 | 0.6179 |
| FE | 8 | 0.5944 | 0.5680 |

## 4. Nhận xét tự động

- NDCG@5: LTR cao hơn baseline tốt nhất `lsa_cosine`; chênh lệch +0.1004 điểm NDCG. Không coi đây là kiểm định ý nghĩa thống kê.
- NDCG@10: LTR cao hơn baseline tốt nhất `tfidf_cosine`; chênh lệch +0.0724 điểm NDCG. Không coi đây là kiểm định ý nghĩa thống kê.

Kết quả chỉ phản ánh benchmark nhãn luật này. Không suy ra xác suất được tuyển hoặc chất lượng trên toàn khoa. Không thay model theo bảng test rồi gọi cùng bảng đó là đánh giá độc lập.

## 5. Giới hạn và trạng thái bàn giao

- Hồ sơ hiện phủ BA/BE/FE; chưa có đánh giá đủ cho bảo mật, AI/Data và các nhóm khác.
- Có JD thiếu mô tả; GPA nguồn quy tuyến tính; SBERT mặc định cắt 128 token.
- Chưa có nhãn người thật, chưa kiểm định với kết quả tuyển dụng. Nhãn AI tham khảo không được dùng để thay nhãn người.
- Model đã train và kiểm tra nạp lại trên feature. Việc tạo feature cho văn bản mới, xác nhận revision SBERT và nối API/web là bước tiếp theo.
- `score` là điểm xếp hạng, không phải % tương thích. Không nhân score với 100 để gọi xác suất.

## 6. Bằng chứng tái lập

- Model hash: `6dc17b7ad73ef449be9f8cb6154d90b011f540ef71086af03fbe3b9c992b4471`.
- Prepared checksum manifest: `f690fe8bcb608a378d21c0d23b5b628ca3189b4120c55bc38fb8e81f48ab057e`.
- Xem `RUN_PLAN.json`, `environment.json`, `requirements-lock.txt`, `model/model_meta.json` và `RETURN_MANIFEST.json` trong gói.
- File dự đoán từng hồ sơ chỉ dùng nội bộ; không đưa toàn bộ lên repo công khai.
