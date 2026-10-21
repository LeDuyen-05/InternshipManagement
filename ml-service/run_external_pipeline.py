"""Pipeline dữ liệu AI – Phần A cho bộ dữ liệu thu thập ngoài (du-lieu-train).

    python run_external_pipeline.py --data-dir data_raw/du-lieu-train --out output/external

Đầu ra (bàn giao cho Người 1 huấn luyện xếp hạng, Người 3 tích hợp gợi ý):
    ho_so_da_xu_ly.csv / jd_da_xu_ly.csv   văn bản đã ẩn danh lại + kỹ năng chuẩn + vị trí (role)
    cap_huan_luyen.csv / .parquet-less json  cặp (hồ sơ, JD) + đặc trưng + nhan_goc + nhan + split
    emb_ho_so.npy, emb_jd.npy (+ *_ids.csv) embedding LSA 256 chiều (TF-IDF → TruncatedSVD, chuẩn hóa L2)
    tfidf_vectorizer.joblib, lsa_svd.joblib  để biến đổi hồ sơ / JD mới vào cùng không gian
    bo_mau_gan_nhan_tay.csv                 mẫu để GVHD/nhóm gán nhãn tay (tập đánh giá vàng)
    bao_cao_du_lieu.json / .md              thống kê chất lượng dữ liệu, so sánh nhãn, baseline NDCG@K
"""
from __future__ import annotations

import argparse
import json
import sys
from math import log2
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy.sparse import vstack as sparse_vstack
from sklearn.decomposition import TruncatedSVD
from sklearn.preprocessing import normalize as l2

from data_pipeline import external_dataset as ext
from data_pipeline.embedder import TfidfEmbedder

ROOT = Path(__file__).resolve().parent

# Các cột trực tiếp định nghĩa nhãn (luật gán nhãn) – không dùng làm đặc trưng khi huấn luyện trên "nhan"
COT_DINH_NGHIA_NHAN = ["ti_le_dap_ung_jd", "so_ky_nang_trung", "jaccard_ky_nang", "khop_vi_tri",
                       "ti_le_trung_ky_nang", "so_ky_nang_trung_goc", "khop_chuyen_nganh"]


def ndcg_at_k(pairs: pd.DataFrame, score_col: str, label_col: str, k: int) -> float:
    vals = []
    for _, g in pairs.groupby("ma_ho_so"):
        rel = g.sort_values(score_col, ascending=False)[label_col].to_numpy()[:k]
        ideal = np.sort(g[label_col].to_numpy())[::-1][:k]
        dcg = sum((2 ** r - 1) / log2(i + 2) for i, r in enumerate(rel))
        idcg = sum((2 ** r - 1) / log2(i + 2) for i, r in enumerate(ideal))
        if idcg > 0:
            vals.append(dcg / idcg)
    return round(float(np.mean(vals)), 4) if vals else 0.0


def main(argv: list[str] | None = None) -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data-dir", type=Path, default=ROOT / "data_raw" / "du-lieu-train")
    ap.add_argument("--out", type=Path, default=ROOT / "output" / "external")
    ap.add_argument("--lsa-dim", type=int, default=256)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args(argv)
    out: Path = args.out
    out.mkdir(parents=True, exist_ok=True)

    hs_raw, jd_raw, nhan_raw = ext.nap(args.data_dir)
    hs = ext.xu_ly_ho_so(hs_raw)
    jd = ext.xu_ly_jd(jd_raw)

    # ---------------- Embedding: TF-IDF (không dùng nhãn) → LSA dày, chuẩn hóa L2
    embedder = TfidfEmbedder(min_df=2).fit(hs["tokens"].tolist() + jd["tokens"].tolist())
    x_hs = embedder.transform(hs["tokens"].tolist())
    x_jd = embedder.transform(jd["tokens"].tolist())
    dim = min(args.lsa_dim, min(x_hs.shape[0] + x_jd.shape[0], x_hs.shape[1]) - 1)
    svd = TruncatedSVD(n_components=dim, random_state=args.seed).fit(sparse_vstack([x_hs, x_jd]))
    e_hs = l2(svd.transform(x_hs))
    e_jd = l2(svd.transform(x_jd))
    tfidf_cos = embedder.cosine(x_hs, x_jd)
    lsa_cos = e_hs @ e_jd.T

    # ---------------- Cặp huấn luyện + nhãn
    split = ext.chia_theo_sinh_vien(hs, seed=args.seed)
    hs_idx = {m: i for i, m in enumerate(hs["ma_ho_so"])}
    jd_idx = {m: i for i, m in enumerate(jd["ma_jd"])}
    goc = nhan_raw.set_index(["ma_ho_so", "ma_jd"])

    rows = []
    for sv in hs.itertuples():
        i = hs_idx[sv.ma_ho_so]
        for j_row in jd.itertuples():
            j = jd_idx[j_row.ma_jd]
            sv_cl, jd_cl = ext.ky_nang_cot_loi(sv.skills), ext.ky_nang_cot_loi(j_row.skills)
            chung = sv_cl & jd_cl
            hop = sv_cl | jd_cl
            khop = sv.role in j_row.roles
            key = (sv.ma_ho_so, j_row.ma_jd)
            g = goc.loc[key] if key in goc.index else None
            rows.append({
                "ma_ho_so": sv.ma_ho_so,
                "ma_jd": j_row.ma_jd,
                "nhom_sv": sv.nhom,
                "tfidf_cosine": round(float(tfidf_cos[i, j]), 6),
                "lsa_cosine": round(float(lsa_cos[i, j]), 6),
                "so_ky_nang_trung": len(chung),
                "ti_le_dap_ung_jd": round(len(chung) / len(jd_cl), 4) if jd_cl else 0.0,
                "jaccard_ky_nang": round(len(chung) / len(hop), 4) if hop else 0.0,
                "khop_vi_tri": int(khop),
                "gpa": sv.gpa,
                "thieu_gpa": int(pd.isna(sv.gpa)),
                "jd_co_mo_ta": int(j_row.co_mo_ta),
                "ky_nang_chung": ";".join(sorted(chung)),
                "nhan_goc": int(g["nhan"]) if g is not None else None,
                "ti_le_trung_ky_nang": float(g["ti_le_trung_ky_nang"]) if g is not None else None,
                "so_ky_nang_trung_goc": int(g["so_ky_nang_trung"]) if g is not None else None,
                "khop_chuyen_nganh": int(g["khop_chuyen_nganh"]) if g is not None else None,
                "nhan": ext.gan_nhan(sv.skills, j_row.skills, khop),
                "split": split[sv.ma_ho_so],
            })
    pairs = pd.DataFrame(rows)

    # ---------------- Lưu
    as_str = lambda s: ";".join(sorted(s))  # noqa: E731
    hs.assign(skills=hs["skills"].map(as_str), split=hs["ma_ho_so"].map(split)) \
        .drop(columns=["tokens", "text_an_danh"]).to_csv(out / "ho_so_da_xu_ly.csv", index=False, encoding="utf-8-sig")
    jd.assign(skills=jd["skills"].map(as_str), roles=jd["roles"].map(as_str)) \
        .drop(columns=["tokens"]).to_csv(out / "jd_da_xu_ly.csv", index=False, encoding="utf-8-sig")
    pairs.to_csv(out / "cap_huan_luyen.csv", index=False, encoding="utf-8-sig")
    pairs.to_json(out / "cap_huan_luyen.json", orient="records", force_ascii=False)
    np.save(out / "emb_ho_so.npy", e_hs.astype(np.float32))
    np.save(out / "emb_jd.npy", e_jd.astype(np.float32))
    hs[["ma_ho_so"]].to_csv(out / "emb_ho_so_ids.csv", index=False)
    jd[["ma_jd"]].to_csv(out / "emb_jd_ids.csv", index=False)
    embedder.save(out / "tfidf_vectorizer.joblib")
    joblib.dump(svd, out / "lsa_svd.joblib")

    # ---------------- Bộ mẫu gán nhãn tay (tập vàng): 20 SV test × (8 JD gần nhất + 4 ngẫu nhiên)
    rng = np.random.default_rng(args.seed)
    test_sv = pairs.loc[pairs["split"] == "test", "ma_ho_so"].drop_duplicates()
    chon = test_sv.sample(min(20, len(test_sv)), random_state=args.seed)
    mau = []
    for m in chon:
        g = pairs[pairs["ma_ho_so"] == m].sort_values("lsa_cosine", ascending=False)
        top, rest = g.head(8), g.iloc[8:]
        mau.append(pd.concat([top, rest.sample(min(4, len(rest)), random_state=int(rng.integers(1e9)))]))
    mau = pd.concat(mau)[["ma_ho_so", "ma_jd", "nhom_sv"]].merge(jd[["ma_jd", "tieu_de"]], on="ma_jd")
    mau = mau.sample(frac=1, random_state=args.seed)  # xáo để người gán không bị ảnh hưởng thứ tự
    mau["nhan_tay_0_3"] = ""
    mau.to_csv(out / "bo_mau_gan_nhan_tay.csv", index=False, encoding="utf-8-sig")

    # ---------------- Báo cáo
    so_go_goc = int(jd_raw["ky_nang_yeu_cau"].fillna("").str.split("|").map(lambda x: "go" in x).sum())
    so_go_moi = int(jd["skills"].map(lambda s: "golang" in s).sum())
    test = pairs[pairs["split"] == "test"]
    bao_cao = {
        "so_ho_so": int(len(hs)), "so_jd": int(len(jd)), "so_cap": int(len(pairs)),
        "nhom_sv": hs["nhom"].value_counts().to_dict(),
        "an_danh": {
            "ho_so_con_pii_truoc": int(hs["pii_con_sot_goc"].sum()),
            "ho_so_con_pii_sau": int(hs["pii_con_sot"].sum()),
        },
        "ky_nang": {
            "jd_gan_go_goc": so_go_goc, "jd_yeu_cau_golang_sau_lam_sach": so_go_moi,
            "jd_khong_con_ky_nang": int((jd["skills"].map(len) == 0).sum()),
            "tb_ky_nang_ho_so": round(float(hs["skills"].map(len).mean()), 2),
            "tb_ky_nang_jd": round(float(jd["skills"].map(len).mean()), 2),
        },
        "vi_tri_jd": pd.Series([r for rs in jd["roles"] for r in rs]).value_counts().to_dict(),
        "phan_bo_nhan_goc": pairs["nhan_goc"].value_counts().sort_index().to_dict(),
        "phan_bo_nhan_moi": pairs["nhan"].value_counts().sort_index().to_dict(),
        "ti_le_cap_doi_nhan": round(float((pairs["nhan"] != pairs["nhan_goc"]).mean()), 4),
        "ma_tran_goc_x_moi": pd.crosstab(pairs["nhan_goc"], pairs["nhan"]).to_dict(),
        "split_ho_so": pd.Series(split).value_counts().to_dict(),
        "cosine_tb_theo_nhan": {
            "tfidf": pairs.groupby("nhan")["tfidf_cosine"].mean().round(4).to_dict(),
            "lsa": pairs.groupby("nhan")["lsa_cosine"].mean().round(4).to_dict(),
        },
        "baseline_tap_test": {
            f"ndcg@{k}_{s}_{lab}": ndcg_at_k(test, s, lab, k)
            for k in (5, 10) for s in ("tfidf_cosine", "lsa_cosine") for lab in ("nhan", "nhan_goc")
        },
        "cot_dinh_nghia_nhan_khong_dung_lam_dac_trung": COT_DINH_NGHIA_NHAN,
        "lsa_dim": int(dim),
        "tfidf_vocab": int(len(embedder.vectorizer.vocabulary_)),
    }
    (out / "bao_cao_du_lieu.json").write_text(json.dumps(bao_cao, ensure_ascii=False, indent=2, default=int), encoding="utf-8")
    print(json.dumps(bao_cao, ensure_ascii=False, indent=2, default=int))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
