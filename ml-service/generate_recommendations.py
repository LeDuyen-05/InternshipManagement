"""
Script chạy khi cần cập nhật gợi ý công ty thực tập cho sinh viên.
KHÔNG chạy như 1 service sống — chạy thủ công hoặc lên lịch (cron/Task Scheduler)
mỗi khi có sinh viên/công ty mới. Đây là lựa chọn có chủ đích để demo bảo vệ
đơn giản, ít rủi ro hơn so với chạy 1 service FastAPI song song.

Luồng: đọc HOSONANGLUC + CONGTY từ SQL Server → tính TF-IDF/Cosine Similarity
→ ghi kết quả (upsert) vào bảng GOIYCONGTY.
"""
import pandas as pd
from datetime import datetime
from db.connection import get_engine
from services.similarity_service import tinh_do_tuong_dong

TOP_K = 5


def load_du_lieu(engine):
    ho_so_df = pd.read_sql("SELECT maHoSo, maSinhVien, NDHoSo FROM HOSONANGLUC", engine)
    cong_ty_df = pd.read_sql("SELECT maCongTy, tenCongTy, yeuCau FROM CONGTY WHERE trangThai = 'DaDuyet'", engine)
    return ho_so_df, cong_ty_df


def ghi_ket_qua(engine, ket_qua_rows):
    """ket_qua_rows: list dict {maHoSo, maCongTy, tiLeTuongThich, ngayGoiY}"""
    if not ket_qua_rows:
        print("Không có gợi ý nào để ghi.")
        return

    df = pd.DataFrame(ket_qua_rows)
    with engine.begin() as conn:
        # Xóa gợi ý cũ của các hồ sơ được tính lại, rồi ghi mới — tránh trùng khóa (maHoSo, maCongTy)
        ma_ho_so_list = df["maHoSo"].unique().tolist()
        placeholders = ",".join(f"'{m}'" for m in ma_ho_so_list)
        conn.exec_driver_sql(f"DELETE FROM GOIYCONGTY WHERE maHoSo IN ({placeholders})")
        df.to_sql("GOIYCONGTY", conn, if_exists="append", index=False)

    print(f"Đã ghi {len(df)} dòng gợi ý vào bảng GOIYCONGTY.")


def main():
    engine = get_engine()
    ho_so_df, cong_ty_df = load_du_lieu(engine)

    if ho_so_df.empty or cong_ty_df.empty:
        print("Chưa đủ dữ liệu (hồ sơ SV hoặc công ty) để tính gợi ý.")
        return

    danh_sach_jd = list(zip(cong_ty_df["maCongTy"], cong_ty_df["yeuCau"].fillna("")))

    ket_qua_rows = []
    for _, row in ho_so_df.iterrows():
        top_k = tinh_do_tuong_dong(row["NDHoSo"] or "", danh_sach_jd, top_k=TOP_K)
        for ma_cong_ty, diem in top_k:
            ket_qua_rows.append({
                "maHoSo": row["maHoSo"],
                "maCongTy": ma_cong_ty,
                "tiLeTuongThich": round(float(diem) * 100, 2),
                "ngayGoiY": datetime.now(),
            })

    ghi_ket_qua(engine, ket_qua_rows)


if __name__ == "__main__":
    main()
