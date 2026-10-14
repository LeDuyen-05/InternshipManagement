"""
Script chạy khi cần cập nhật gợi ý công ty thực tập cho sinh viên.
KHÔNG chạy như 1 service sống — chạy thủ công hoặc lên lịch (cron/Task Scheduler)
mỗi khi có sinh viên/công ty mới. Đây là lựa chọn có chủ đích để demo bảo vệ
đơn giản, ít rủi ro hơn so với chạy 1 service FastAPI song song.

Luồng: đọc HOSONANGLUC + CONGTY từ SQL Server → tính TF-IDF/Cosine Similarity
→ ghi kết quả (upsert) vào bảng GOIYCONGTY.
"""
import uuid
from datetime import date
import pandas as pd
from sqlalchemy import text, bindparam
from db.connection import get_engine
from services.similarity_service import xep_hang_batch

TOP_K = 5


def load_du_lieu(engine):
    ho_so_df = pd.read_sql("SELECT maHoSo, NDHoSo FROM HOSONANGLUC", engine).fillna({"NDHoSo": ""})
    cong_ty_df = pd.read_sql("SELECT maCongTy, tenCongTy, yeuCau FROM CONGTY WHERE trangThai = 'DaDuyet'", engine).fillna({"yeuCau": ""})
    return ho_so_df, cong_ty_df


def ghi_ket_qua(engine, ket_qua_rows):
    """ket_qua_rows: list dict {maSo, maHoSo, maCongTy, tyLeTuongThich, ngayGoiY}"""
    if not ket_qua_rows:
        print("Không có gợi ý nào để ghi.")
        return

    df = pd.DataFrame(ket_qua_rows)
    with engine.begin() as conn:
        ma_ho_so_list = df["maHoSo"].unique().tolist()
        stmt = text("DELETE FROM GOIYCONGTY WHERE maHoSo IN :ids").bindparams(bindparam("ids", expanding=True))
        conn.execute(stmt, {"ids": ma_ho_so_list})
        df.to_sql("GOIYCONGTY", conn, if_exists="append", index=False)

    print(f"Đã ghi {len(df)} dòng gợi ý vào bảng GOIYCONGTY.")


def main():
    engine = get_engine()
    ho_so_df, cong_ty_df = load_du_lieu(engine)

    if ho_so_df.empty or cong_ty_df.empty:
        print("Chưa đủ dữ liệu (hồ sơ SV hoặc công ty) để tính gợi ý.")
        return

    ho_so_dict = dict(zip(ho_so_df["maHoSo"], ho_so_df["NDHoSo"]))
    danh_sach_jd = list(zip(cong_ty_df["maCongTy"], cong_ty_df["yeuCau"]))

    batch_results = xep_hang_batch(ho_so_dict, danh_sach_jd, top_k=TOP_K)

    ket_qua_rows = []
    for ma_ho_so, ranked in batch_results.items():
        for ma_ct, diem in ranked:
            ket_qua_rows.append({
                "maSo": "GY" + uuid.uuid4().hex[:18],
                "maHoSo": ma_ho_so,
                "maCongTy": ma_ct,
                "tyLeTuongThich": round(float(diem) * 100, 2),
                "ngayGoiY": date.today()
            })

    ghi_ket_qua(engine, ket_qua_rows)


if __name__ == "__main__":
    main()
