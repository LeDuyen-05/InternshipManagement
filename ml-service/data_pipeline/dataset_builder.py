"""Tạo tập dữ liệu huấn luyện xếp hạng (SV, Công ty) có nhãn mức độ phù hợp.

Nhãn tương tác (label_tuong_tac, thang 0–3) lấy từ quy trình thực tập thật:
    3  được doanh nghiệp tiếp nhận (PHANBOTHUCTAP còn hiệu lực)
    2  phỏng vấn Đạt hoặc nguyện vọng được duyệt nhưng chưa phân bổ
    1  SV chủ động đăng ký nguyện vọng (đang chờ duyệt)
    0  bị từ chối / phỏng vấn không đạt
   NaN chưa có tương tác
Nhãn yếu (label_yeu, 0–3) suy từ nội dung khi chưa có tương tác:
    3  cùng lĩnh vực + trùng ≥ 30% kỹ năng JD + đạt GPA;  2  cùng lĩnh vực + đạt GPA
    1  có kỹ năng trùng;  0  không liên quan hoặc không đạt GPA
label = nhãn tương tác nếu có, ngược lại là nhãn yếu (cột label_nguon ghi nguồn).
Lưu ý cho Người 1: nhãn yếu được suy từ cùng thông tin với các đặc trưng skill_*/domain_*,
nên khi đánh giá NDCG@K nên báo cáo riêng trên các cặp label_nguon == "tuong_tac".
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .embedder import TfidfEmbedder
from .preprocessor import (build_jd_text, build_profile_text, clean_tokens, detect_domains,
                           extract_skills, parse_gpa_requirement)


def preprocess_profiles(sv: pd.DataFrame) -> pd.DataFrame:
    df = sv.copy()
    df["gpa"] = pd.to_numeric(df["gpa"], errors="coerce")
    df["raw_text"] = [build_profile_text(r) for r in df.to_dict("records")]
    df["tokens"] = df["raw_text"].map(clean_tokens)
    df["clean_text"] = df["tokens"].map(" ".join)
    df["skills"] = df["raw_text"].map(extract_skills)
    df["domains"] = df["skills"].map(detect_domains)
    return df


def preprocess_jds(ct: pd.DataFrame) -> pd.DataFrame:
    df = ct.copy()
    df["raw_text"] = [build_jd_text(r) for r in df.to_dict("records")]
    df["tokens"] = df["raw_text"].map(clean_tokens)
    df["clean_text"] = df["tokens"].map(" ".join)
    df["skills"] = df["raw_text"].map(extract_skills)
    df["domains"] = df["skills"].map(detect_domains)
    df["gpa_toi_thieu"] = df["yeuCau"].map(parse_gpa_requirement)
    return df


def interaction_labels(dangky: pd.DataFrame, phongvan: pd.DataFrame, phanbo: pd.DataFrame) -> dict[tuple[str, str], int]:
    labels: dict[tuple[str, str], int] = {}
    for r in dangky.itertuples():
        key = (r.maSV, r.maCongTy)
        labels[key] = max(labels.get(key, -1), {"ChoDuyet": 1, "DaDuyet": 2, "TuChoi": 0}.get(r.trangThai, 1))
    for r in phongvan.itertuples():
        key = (r.maSV, r.maCongTy)
        if r.ketQua == "Dat":
            labels[key] = max(labels.get(key, -1), 2)
        elif r.ketQua == "KhongDat":
            labels[key] = 0
    for r in phanbo.itertuples():
        if r.trangThai != "Huy":
            labels[(r.maSV, r.maCongTy)] = 3
    return labels


def weak_label(sv_skills: set, sv_domains: set, jd_skills: set, jd_domains: set, gpa_ok: bool) -> int:
    if not gpa_ok:
        return 0
    overlap = len(sv_skills & jd_skills) / len(jd_skills) if jd_skills else 0.0
    same_domain = bool(sv_domains & jd_domains)
    if same_domain and overlap >= 0.3:
        return 3
    if same_domain:
        return 2
    return 1 if overlap > 0 else 0


def build_pairs(profiles: pd.DataFrame, jds: pd.DataFrame, embedder: TfidfEmbedder,
                labels: dict[tuple[str, str], int], test_size: float = 0.2, seed: int = 42) -> pd.DataFrame:
    sim = embedder.cosine(embedder.transform(profiles["tokens"].tolist()), embedder.transform(jds["tokens"].tolist()))

    rng = np.random.default_rng(seed)
    students = profiles["maSV"].tolist()
    test_students = set(rng.choice(students, size=max(1, int(round(len(students) * test_size))), replace=False))

    rows = []
    for i, sv in enumerate(profiles.itertuples()):
        for j, jd in enumerate(jds.itertuples()):
            gpa_req = jd.gpa_toi_thieu
            gpa_ok = gpa_req is None or pd.isna(sv.gpa) or float(sv.gpa) >= float(gpa_req)
            inter = labels.get((sv.maSV, jd.maCongTy))
            weak = weak_label(sv.skills, sv.domains, jd.skills, jd.domains, gpa_ok)
            common = sv.skills & jd.skills
            union = sv.skills | jd.skills
            rows.append({
                "maSV": sv.maSV,
                "maHoSo": sv.maHoSo if isinstance(sv.maHoSo, str) and sv.maHoSo else None,
                "maCongTy": jd.maCongTy,
                "tfidf_cosine": round(float(sim[i, j]), 6),
                "skill_overlap": len(common),
                "skill_jaccard": round(len(common) / len(union), 6) if union else 0.0,
                "skill_coverage_jd": round(len(common) / len(jd.skills), 6) if jd.skills else 0.0,
                "domain_match": int(bool(sv.domains & jd.domains)),
                "gpa_ok": int(gpa_ok),
                "gpa_margin": round(float(sv.gpa) - float(gpa_req), 2) if gpa_req is not None and not pd.isna(sv.gpa) else 0.0,
                "skills_chung": ";".join(sorted(common)),
                "label_tuong_tac": inter,
                "label_yeu": weak,
                "label": inter if inter is not None else weak,
                "label_nguon": "tuong_tac" if inter is not None else "noi_dung",
                "split": "test" if sv.maSV in test_students else "train",
            })
    return pd.DataFrame(rows)
