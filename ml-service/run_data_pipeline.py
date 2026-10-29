"""Pipeline dữ liệu AI – Phần A (Người 2): tiền xử lý → embedding TF-IDF → tập nhãn huấn luyện.

Ví dụ:
    python run_data_pipeline.py                         # đọc SQL Server, ghi output/
    python run_data_pipeline.py --export-csv data_raw   # đồng thời lưu dữ liệu thô ra CSV
    python run_data_pipeline.py --source csv --csv-dir data_raw   # chạy offline từ CSV
    python run_data_pipeline.py --synthetic 300         # thêm 300 hồ sơ SV ảo
    python run_data_pipeline.py --write-db              # ghi embedding vào HOSONANGLUC/CONGTY

Đầu ra (thư mục output/), bàn giao cho Người 1 (huấn luyện xếp hạng) và Người 3 (API Top-K):
    processed_profiles.csv, processed_jds.csv   văn bản đã làm sạch + kỹ năng + lĩnh vực
    training_pairs.csv / training_dataset.json  cặp (SV, công ty) + đặc trưng + nhãn + split
    tfidf_vectorizer.joblib                     vectorizer dùng chung
    pipeline_report.json                        thống kê nhanh để kiểm tra dữ liệu
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

from data_pipeline import data_source, synthetic
from data_pipeline.dataset_builder import build_pairs, interaction_labels, preprocess_jds, preprocess_profiles
from data_pipeline.embedder import TfidfEmbedder

ROOT = Path(__file__).resolve().parent


def write_embeddings_to_db(profiles: pd.DataFrame, jds: pd.DataFrame, embedder: TfidfEmbedder) -> None:
    from sqlalchemy import text
    from db.connection import get_engine

    prof = profiles[profiles["maHoSo"].notna() & (profiles["maHoSo"] != "")]
    pv = embedder.transform(prof["tokens"].tolist())
    jv = embedder.transform(jds["tokens"].tolist())
    with get_engine().begin() as conn:
        for k, ma in enumerate(prof["maHoSo"]):
            conn.execute(text("UPDATE HOSONANGLUC SET embeddingHoSo = :e WHERE maHoSo = :m"),
                         {"e": embedder.to_sparse_json(pv[k]), "m": ma})
        for k, ma in enumerate(jds["maCongTy"]):
            conn.execute(text("UPDATE CONGTY SET embeddingYeuCau = :e WHERE maCongTy = :m"),
                         {"e": embedder.to_sparse_json(jv[k]), "m": ma})
    print(f"Đã ghi embedding cho {len(prof)} hồ sơ và {len(jds)} công ty vào CSDL.")


def main(argv: list[str] | None = None) -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", choices=["db", "csv"], default="db")
    ap.add_argument("--csv-dir", type=Path, default=ROOT / "data_raw")
    ap.add_argument("--export-csv", type=Path, help="Lưu dữ liệu thô đọc từ CSDL ra thư mục CSV")
    ap.add_argument("--out", type=Path, default=ROOT / "output")
    ap.add_argument("--synthetic", type=int, default=0, help="Số hồ sơ SV ảo bổ sung")
    ap.add_argument("--test-size", type=float, default=0.2)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--all-companies", action="store_true", help="Gồm cả công ty chưa được Khoa duyệt")
    ap.add_argument("--write-db", action="store_true", help="Ghi vector (JSON) vào embeddingHoSo / embeddingYeuCau")
    args = ap.parse_args(argv)

    raw = data_source.load_from_db() if args.source == "db" else data_source.load_from_csv(args.csv_dir)
    if args.export_csv:
        data_source.export_csv(raw, args.export_csv)
        print(f"Đã export dữ liệu thô ra {args.export_csv}")

    sv = raw["sinhvien"]
    if args.synthetic > 0:
        sv = pd.concat([sv, synthetic.generate(args.synthetic, seed=args.seed)], ignore_index=True)
    ct = raw["congty"] if args.all_companies else raw["congty"][raw["congty"]["trangThai"] == "DaDuyet"]
    if sv.empty or ct.empty:
        print("Chưa đủ dữ liệu (hồ sơ SV hoặc công ty).")
        return 1

    profiles = preprocess_profiles(sv)
    jds = preprocess_jds(ct.reset_index(drop=True))
    embedder = TfidfEmbedder().fit(profiles["tokens"].tolist() + jds["tokens"].tolist())
    labels = interaction_labels(raw["dangky"], raw["phongvan"], raw["phanbo"])
    pairs = build_pairs(profiles, jds, embedder, labels, test_size=args.test_size, seed=args.seed)

    out = args.out
    out.mkdir(parents=True, exist_ok=True)
    as_list = lambda s: ";".join(sorted(s))  # noqa: E731
    profiles.assign(skills=profiles["skills"].map(as_list), domains=profiles["domains"].map(as_list)) \
        .drop(columns=["tokens"]).to_csv(out / "processed_profiles.csv", index=False, encoding="utf-8-sig")
    jds.assign(skills=jds["skills"].map(as_list), domains=jds["domains"].map(as_list)) \
        .drop(columns=["tokens"]).to_csv(out / "processed_jds.csv", index=False, encoding="utf-8-sig")
    pairs.to_csv(out / "training_pairs.csv", index=False, encoding="utf-8-sig")
    pairs.to_json(out / "training_dataset.json", orient="records", force_ascii=False, indent=1)
    embedder.save(out / "tfidf_vectorizer.joblib")

    report = {
        "so_sinh_vien": int(len(profiles)),
        "so_sinh_vien_ao": int(args.synthetic),
        "so_cong_ty": int(len(jds)),
        "so_cap": int(len(pairs)),
        "so_cap_co_nhan_tuong_tac": int((pairs["label_nguon"] == "tuong_tac").sum()),
        "phan_bo_nhan": {str(k): int(v) for k, v in pairs["label"].value_counts().sort_index().items()},
        "train_test": {k: int(v) for k, v in pairs["split"].value_counts().items()},
        "so_tu_vung_tfidf": int(len(embedder.vectorizer.vocabulary_)),
        "sv_khong_nhan_dien_duoc_ky_nang": profiles.loc[profiles["skills"].map(len) == 0, "maSV"].tolist(),
        "cong_ty_khong_nhan_dien_duoc_ky_nang": jds.loc[jds["skills"].map(len) == 0, "maCongTy"].tolist(),
    }
    (out / "pipeline_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))

    if args.write_db:
        write_embeddings_to_db(profiles[~profiles["maSV"].str.startswith("SYN")], jds, embedder)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
