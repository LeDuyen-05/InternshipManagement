# Tích hợp LambdaMART v3 vào backend

**Vận hành local mới nhất 28/10:** backend `http://localhost:5100` đang dùng **CSDL bản sao** `QuanLyThucTap_GVHD_Test_20261023_101930`, scorer cổng 5210, API thật đã xác nhận TrainedModel. Xem quản lý backend copy và nguồn JD (tài liệu cũ đã xóa); đây không phải deploy/CSDL gốc hoặc nghiệm thu trình duyệt.

**Môi trường local đã chuẩn bị 28/10:** cấu hình riêng trên máy đã bật, scorer đang chạy nền Ready đúng model, có công cụ Setup/Start/Status/Stop; backend chưa được restart trong lượt chuẩn bị. Xem môi trường, audit và kết quả chấm mẫu AI (tài liệu cũ đã xóa). Mặc định tắt trong code/mẫu cấu hình vẫn được giữ cho môi trường khác.

Cập nhật 28/10/2026. Hai API gợi ý dùng chung `RecommendationService`: LTR khi dịch vụ cục bộ đã được cấu hình và trả kết quả đúng hợp đồng; TF-IDF/cosine khi tắt/lỗi/timeout. Không tạo đăng ký, hồ sơ, điểm, phân bổ hoặc lưu bảng GOIYCONGTY từ gợi ý. Không có migration mới.

## Luồng dữ liệu và quyền

1. Controller kiểm quyền hồ sơ/đợt bằng ResourceAccess. SV chỉ xem mình; GVHD theo phân công đúng đợt; DN bị chặn; Khoa/QTV theo quyền hiện có. Sau khi chờ scorer, controller kiểm lại quyền trước khi trả kết quả.
2. Backend lấy JD từ kế hoạch DN–đợt được duyệt, đang nhận, đúng cửa sổ thời gian, không chỉ tiếp nhận bên ngoài, còn chỉ tiêu vị trí và tổng DN–đợt. Chỗ tiếp nhận/chờ xác nhận tính quota; hủy và đợt khác không tính. Mở lại điểm không mở nhận mới.
3. Chỉ gửi văn bản năng lực, GPA thang 4 theo validator hiện hành và JD hiện tại sang loopback. Không gửi họ tên/mã SV/lớp hoặc ID công ty thật; ID vị trí trong request là chỉ số ánh xạ riêng của lần gọi. Dịch vụ không đọc CSDL hoặc ghi nội dung request ra log/file. Văn bản tự do vẫn có thể có thông tin cá nhân do người nhập; bộ lọc `an_danh` chỉ xử lý các dạng nhận diện đã biết, không bảo đảm ẩn danh tuyệt đối.
4. Python dùng đúng artifact/snapshot đã đối chiếu; kỹ năng JD được trích bằng từ điển chuẩn, `has_description=true` vì backend chỉ gửi JD có nội dung mô tả. Dùng nguyên GPA 0..4; null dùng median/cờ thiếu. Không đoán hoặc chuyển thang GPA.
5. Sau khi chờ, backend đọc lại điều kiện DN/đợt/hạn/quota. Vị trí vừa đóng bị loại. Hồ sơ/GPA/JD thay đổi hoặc có ứng viên mới chưa được chấm làm kết quả LTR không còn đồng bộ: tính baseline từ dữ liệu mới, ghi `InputChanged`. Mỗi công ty giữ vị trí điểm cao nhất rồi lấy Top-K, giữ hợp đồng danh sách công ty trước đây. Đăng ký thật vẫn kiểm lại điều kiện trong luồng nộp.

## Hợp đồng và fallback

- Python: `POST http://127.0.0.1:5210/v1/score`, schema `web-v3-1`, bearer token bí mật riêng. `GET /health` cũng cần token. Chỉ bind loopback, không CORS/cổng công khai. Không tự chạy service từ request .NET.
- Khi khởi động, scorer kiểm báo cáo parity `passed` đúng model hash, inference script hash, encoder revision/hash/phiên bản, 42.008 cặp và Top-5/10 35/35. Không dùng report cũ cho encoder/runtime khác.
- Timeout mặc định **5.000 ms** (cấu hình 100–15.000 ms), gồm gửi và đọc body; không retry. Request hủy từ client không bị đổi thành fallback thành công. HTTP client không theo redirect hoặc proxy.
- Request tối đa 2 MiB/500 vị trí; vượt giới hạn dùng baseline toàn tập hợp lệ, không cắt ứng viên để model chọn trên một tập giả. Response tối đa 256 KiB, phải đủ/đúng/không trùng ID, điểm hữu hạn, đúng model/revision/schema/loại điểm; thiếu score không tự thành 0.
- Scorer chỉ chạy một suy luận đồng thời, bận trả 503 để backend fallback thay vì xếp hàng kéo dài. Request timeout có thể đã bắt đầu chạy ở Python; model hoàn tất lượt đó rồi giải phóng, không khẳng định .NET hủy được tính toán CPU đang chạy.

| Metadata API | Ý nghĩa |
|---|---|
| `TrainedModel`, `daSuDungModelTrain=true` | Đã dùng đúng LambdaMART; có `modelVersion` SHA-256; điểm `rankingScore`, `tiLeTuongThich=null` |
| `BaselineOnly` / `Disabled` | Chưa bật cấu hình LTR; dùng cosine |
| `BaselineFallback` / `Timeout`, `Unavailable`, `InvalidResponse`, `InputNotSupported`, `InputChanged` | Dùng baseline thực và công bố lý do dạng mã; không trả token/exception riêng ra frontend |
| `NotApplicable` | Không có hồ sơ nội dung/JD hợp lệ hoặc đợt không cho nhận mới; không gọi model cho dữ liệu đó |

LTR giữ điểm âm/0/dương, không clamp hoặc nhân 100; TF-IDF cosine kèm theo chỉ là thông tin thành phần. Hai màn hình AI/SV hiện đúng nhãn “Điểm xếp hạng”, không thanh % cho LTR. Baseline vẫn hiện độ tương đồng %. Từ khóa chung chỉ mô tả giao nhau của nội dung, không phải giải thích nhân quả của cây model. Endpoint evaluate giữ NDCG/DCG null, trạng thái `OfflineWeakLabelEvaluation`; không tạo số đo từ SV đang xem.

## Cấu hình tại máy / môi trường bàn giao

Gói kết quả train mới nhất của Chi được copy vào `ml-service/output/KET_QUA_CHI_MOI_NHAT/`; `RETURN_MANIFEST.json` có 27 checksum artifact và đã đối chiếu đúng parity/model hash. Cấu hình private local `LtrLocalRuntime:Package` hiện trỏ vào thư mục này; `Manage-LtrRuntime.ps1 -Mode Setup` cũng mặc định lấy gói tại đây. `ml-service/output/` bị Git bỏ qua để không đưa artifact và prediction/dữ liệu đánh giá vào commit; khi chuyển sang máy khác phải bàn giao/copy gói riêng và xác minh lại checksum. Không sửa thư mục Downloads nguồn.

Backend mặc định `Enabled=false`; sao chép [mẫu cấu hình](../../backend/src/InternshipManagement.API/appsettings.Inference.example.json) sang `appsettings.Inference.private.json` tại API hoặc cấu hình biến môi trường tương ứng. File riêng được Git bỏ qua, có thể copy khi build local và **không mang theo publish**. Environment/CLI ghi đè file riêng. Chỉ bật khi đã có scorer; khởi động lại backend bản mới và nạp frontend mới. Không triển khai SmarterASP trong lượt này.

Tạo token ngẫu nhiên riêng ít nhất 32 ký tự, cùng giá trị cho `Inference:Token` ở backend và `IM_INFERENCE_TOKEN` trong tiến trình Python. Không đưa token vào URL, CLI argument, Git, frontend hoặc tài liệu. `Endpoint` chỉ chấp nhận `http://127.0.0.1:<port>/v1/score`. Dịch vụ từ xa cần thiết kế HTTPS/quyền/vận hành riêng, chưa được hỗ trợ bằng cách đổi URL.

Từ `ml-service`, trong môi trường suy luận văn bản v3 (tài liệu cũ đã xóa), sau khi đã nạp biến môi trường token vào tiến trình:

```powershell
$env:PYTHONPATH = (Resolve-Path src).Path + [IO.Path]::PathSeparator + (Resolve-Path src/common).Path
.venv/Scripts/python.exe -m inference.serve_inference_v3 --package 'output/KET_QUA_CHI_MOI_NHAT' --encoder-snapshot 'C:\Users\Admin\.cache\huggingface\hub\models--sentence-transformers--paraphrase-multilingual-MiniLM-L12-v2\snapshots\e8f8c211226b894fcb81acc59f3b34ba3efd5f42' --encoder-revision e8f8c211226b894fcb81acc59f3b34ba3efd5f42 --parity-report reports/inference_layout_20261029/parity.json --port 5210
```

Giữ gói/model/encoder ngoài Git công khai; scorer cần tiến trình riêng còn chạy. Không lấy baseline đang hoạt động làm bằng chứng LTR đang bật. Kiểm `modelStatus` và `modelVersion` ở response, không chỉ kiểm HTTP 200.

## Kiểm chứng và giới hạn

Kết quả kiểm tra mới, fixture CSDL bản sao, build/test và lỗi đã xử lý được ghi trong [checklist](../CHECKLIST_DA_FIX.md). [10 case AIL](../test-cases/AI_TICH_HOP_LTR.md) và các case AIG hiện có đều **Chưa chạy thủ công/người dùng**. Kiểm thử HTTP/SQL không thay nghiệm thu trình duyệt.

Chất lượng học máy vẫn dựa nhãn luật; chưa có nhãn người chấm, audit gần trùng hoàn tất hoặc thử nghiệm riêng JD mới/nhóm ngoài BA-BE-FE. Parity và tích hợp chạy đúng không chứng minh chất lượng tuyển dụng thực tế. Không train lại, sửa artifact nguồn hoặc đưa toàn bộ 178 JD nghiên cứu vào danh mục web.
