"""Tiền xử lý bộ dữ liệu huấn luyện thu thập ngoài hệ thống (du-lieu-train):

    ho_so_sv_an_danh.csv  ma_ho_so, nhom (BE/FE/BA), ky_nang, hoc_van, gpa, text_an_danh
    jd_tong_hop.csv       ma_jd, tieu_de, cong_ty, ky_nang_yeu_cau, nguon, technical_skills, mo_ta
    nhan_0_3.csv          ma_ho_so, ma_jd, nhan (0-3), ti_le_trung_ky_nang, so_ky_nang_trung, gpa_chuan_hoa, khop_chuyen_nganh

Vấn đề đã kiểm chứng trên dữ liệu gốc và cách xử lý:
1. Ẩn danh chưa triệt để (còn số điện thoại, ngày sinh, mảnh họ tên cạnh [TEN]) → lọc lại trước khi lưu.
2. Danh sách kỹ năng JD bị gán nhầm do khớp chuỗi con: "go" (62/63 JD không hề yêu cầu Go), "net"
   (Network), "erp", "nan" → trích lại kỹ năng từ văn bản bằng từ điển chuẩn hóa; kỹ năng mơ hồ trong
   danh sách gốc chỉ giữ khi văn bản có bằng chứng.
3. Kỹ năng hai phía viết khác nhau ("spring boot" vs "springboot", "node.js" vs "nodejs") → chuẩn hóa chung.
4. Nhãn gốc được sinh bằng luật trên tỉ lệ trùng kỹ năng (cây quyết định độ sâu 4 tái tạo 98.5%)
   → tính lại nhãn với kỹ năng đã làm sạch (cùng luật để so sánh được), giữ nhãn gốc ở cột nhan_goc.
"""
from __future__ import annotations

import ast
import re
from pathlib import Path

import numpy as np
import pandas as pd

from .preprocessor import DOMAINS, SKILL_SYNONYMS, clean_tokens, extract_skills, normalize

# ------------------------------------------------------------------ Ẩn danh bổ sung

_PII_PATTERNS = [
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), "[EMAIL]"),
    (re.compile(r"(?:https?://|www\.)\S+|\b(?:linkedin|github|facebook)\.com/\S*", re.I), "[URL]"),
    # Số điện thoại VN: 0xx / +84 với khoảng trắng, chấm, gạch
    (re.compile(r"(?<![\w\d])(?:\+?84|0)(?:[\s.\-]?\d){8,10}(?![\w\d])"), "[SDT]"),
    # Ngày sinh / ngày tháng đầy đủ
    (re.compile(r"\b\d{1,2}[/\-.]\d{1,2}[/\-.](?:19|20)\d{2}\b"), "[NGAY]"),
]
_CHU_HOA = r"[A-ZĐÀ-Ỹ][\wÀ-ỹ]*"
# Các mảnh họ tên còn sót quanh nhãn [TEN] (vd. "Nguyễn Nhật [TEN] Đức [TEN]")
_TEN_CANH = re.compile(rf"(?:{_CHU_HOA}\s+){{1,3}}\[TEN\]|\[TEN\](?:\s+{_CHU_HOA}){{1,3}}(?=\s*(?:\[TEN\]|[-|•✉]|$))")


def an_danh(text: str | None) -> str:
    if not isinstance(text, str):
        return ""
    for rx, nhan in _PII_PATTERNS:
        text = rx.sub(nhan, text)
    for _ in range(3):
        text = _TEN_CANH.sub("[TEN]", text)
    text = re.sub(r"(?:\[TEN\][\s\-|]*){2,}", "[TEN] ", text)
    return text


def con_pii(text: str) -> bool:
    return any(rx.search(text) for rx, _ in _PII_PATTERNS[2:])


# ------------------------------------------------------------------ Kỹ năng

# Kỹ năng trong danh sách gốc dễ bị gán nhầm → chỉ giữ nếu văn bản có bằng chứng
_MO_HO = {"go", "net", "erp", "nan", "r", "c", "ml", "ai", "api"}
_ALIAS = {v: k for k, vs in SKILL_SYNONYMS.items() for v in vs}
_ALIAS.update({"machinelearning": "machine_learning", "dataanalysis": "data_analysis", "springboot": "spring_boot",
               "restapi": "rest_api", "reactnative": "react_native", "sqlserver": "sql", "aspnet": "dotnet",
               "usecase": "ba_modeling", "testcase": "testing", "aftereffects": "video_editing",
               "nodejs": "nodejs", "node.js": "nodejs", "c++": "cpp"})


def chuan_hoa_danh_sach(ds: str | None, van_ban: str) -> set[str]:
    """Danh sách kỹ năng gốc ("a|b|c") → tập kỹ năng chuẩn, bỏ mục mơ hồ không có bằng chứng."""
    out: set[str] = set()
    tu_van_ban = extract_skills(van_ban)
    for raw in str(ds or "").split("|"):
        k = raw.strip().lower()
        if not k or k == "nan":
            continue
        canon = _ALIAS.get(k)
        if canon is None and k in _MO_HO:
            continue
        if canon is None:
            canon = next(iter(extract_skills(k)), None)
        if canon is None:
            continue
        if k in _MO_HO and canon not in tu_van_ban:
            continue
        out.add(canon)
    return out


# ------------------------------------------------------------------ Vị trí công việc (role)

NHOM_SV = {"BE": "web_backend", "FE": "web_frontend", "BA": "ba"}

_ROLE_JD = [
    ("testing", r"tester|\bqa\b|\bqc\b|kiểm thử|kiem thu|\btest\b|quality assurance"),
    ("ba", r"business analyst|\bba\b|phân tích nghiệp vụ|phan tich nghiep vu|nghiệp vụ|nghiep vu|\berp\b|consultant"),
    ("web_frontend", r"front[\s-]?end|reactjs|\breact\b|\bvue\b|angular|ui developer"),
    ("web_backend", r"back[\s-]?end|\bjava\b|\.net|\bphp\b|node|golang|\bc#|spring"),
    ("fullstack", r"full[\s-]?stack"),
    ("mobile", r"mobile|android|\bios\b|flutter|react native"),
    ("data", r"\bdata\b|dữ liệu|du lieu|\bbi\b|analytics"),
    ("ai_ml", r"\bai\b|machine learning|trí tuệ nhân tạo|deep learning|\bml\b"),
    ("devops_cloud", r"devops|cloud|system admin|network|quản trị mạng|infrastructure"),
    ("security", r"security|bảo mật|bao mat|an toàn thông tin|pentest|\bsoc\b"),
    ("design", r"designer|thiết kế|thiet ke|đồ họa|do hoa|graphic|video|editor|ui/ux|\bux\b"),
    ("game", r"\bgame\b|unity|unreal"),
]
# Tiêu đề lập trình chung chung (không nêu rõ front/back) → phù hợp cả hai vị trí web
_DEV_CHUNG = r"developer|\bdev\b|lập trình|lap trinh|software|phần mềm|phan mem|kỹ sư|ky su|engineer|\bit\b"


def role_jd(tieu_de: str, ky_nang: set[str]) -> set[str]:
    t = normalize(tieu_de)
    roles = {r for r, p in _ROLE_JD if re.search(p, t)}
    if "fullstack" in roles:
        roles = (roles - {"fullstack"}) | {"web_frontend", "web_backend"}
    # Chỉ suy ra "lập trình web chung" khi tiêu đề không nêu vị trí cụ thể nào (vd. "IT BA Intern" vẫn là BA)
    if not roles and re.search(_DEV_CHUNG, t):
        roles = {"web_frontend", "web_backend"}
    if not roles:  # tiêu đề không nói rõ ("Thực tập sinh") → suy từ kỹ năng
        roles = {d for d, keys in DOMAINS.items() if (ky_nang & keys) - {"python", "sql", "linux"}}
    return roles


# ------------------------------------------------------------------ Nạp & tiền xử lý

def _ds_technical(v) -> str:
    if not isinstance(v, str) or not v.strip():
        return ""
    try:
        items = ast.literal_eval(v)
        return " . ".join(map(str, items)) if isinstance(items, (list, tuple)) else v
    except (ValueError, SyntaxError):
        return v


def nap(folder: Path) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    rd = lambda f: pd.read_csv(folder / f, encoding="utf-8-sig")  # noqa: E731
    return rd("ho_so_sv_an_danh.csv"), rd("jd_tong_hop.csv"), rd("nhan_0_3.csv")


def xu_ly_ho_so(hs: pd.DataFrame) -> pd.DataFrame:
    df = hs.copy()
    df["pii_con_sot_goc"] = df["text_an_danh"].fillna("").map(con_pii)
    df["text"] = df["text_an_danh"].map(an_danh)
    df["pii_con_sot"] = df["text"].map(con_pii)
    df = df[df["text"].str.len() > 0].reset_index(drop=True)
    df["skills"] = [chuan_hoa_danh_sach(ds, t) | extract_skills(t) for ds, t in zip(df["ky_nang"], df["text"])]
    df["role"] = df["nhom"].map(NHOM_SV)
    df["tokens"] = df["text"].map(clean_tokens)
    df["gpa"] = pd.to_numeric(df["gpa"], errors="coerce")
    return df


def xu_ly_jd(jd: pd.DataFrame) -> pd.DataFrame:
    df = jd.copy()
    df["text"] = [
        an_danh(" . ".join(x for x in (str(t or ""), _ds_technical(ts), str(m or "")) if x and x != "nan"))
        for t, ts, m in zip(df["tieu_de"], df["technical_skills"], df["mo_ta"])
    ]
    df["co_mo_ta"] = df["mo_ta"].notna()
    df["skills_goc"] = df["ky_nang_yeu_cau"].fillna("")
    df["skills"] = [chuan_hoa_danh_sach(ds, t) | extract_skills(t) for ds, t in zip(df["ky_nang_yeu_cau"], df["text"])]
    df["roles"] = [role_jd(t, s) for t, s in zip(df["tieu_de"].fillna(""), df["skills"])]
    # Token gồm cả kỹ năng chuẩn để JD chỉ có danh sách kỹ năng vẫn có biểu diễn
    df["tokens"] = [clean_tokens(t) + sorted(s) for t, s in zip(df["text"], df["skills"])]
    return df


# ------------------------------------------------------------------ Nhãn

# Kỹ năng chung/kỹ năng mềm gần như hồ sơ nào cũng ghi (git có ở >80% CV) → không phân biệt được mức phù hợp,
# loại khỏi tập kỹ năng dùng để gán nhãn (vẫn giữ trong cột skills để tham khảo)
KY_NANG_CHUNG = frozenset({"teamwork", "git", "agile"})


def ky_nang_cot_loi(skills: set[str]) -> set[str]:
    return set(skills) - KY_NANG_CHUNG


def gan_nhan(sv_skills: set[str], jd_skills: set[str], khop_role: bool) -> int:
    """Cùng luật với nhãn gốc nhưng trên kỹ năng cốt lõi đã chuẩn hóa:
    tỉ lệ JD được đáp ứng = 0 → 0; < 0.3 → 1; < 0.6 → 2; ≥ 0.6 → 3 nếu đúng vị trí, ngược lại 2.
    JD không có kỹ năng cụ thể: đúng vị trí → 1, ngược lại 0."""
    sv_skills, jd_skills = ky_nang_cot_loi(sv_skills), ky_nang_cot_loi(jd_skills)
    if not jd_skills:
        return 1 if khop_role else 0
    ti_le = len(sv_skills & jd_skills) / len(jd_skills)
    if ti_le == 0:
        return 0
    if ti_le < 0.3:
        return 1
    if ti_le < 0.6:
        return 2
    return 3 if khop_role else 2


def chia_theo_sinh_vien(hs: pd.DataFrame, seed: int = 42, val: float = 0.15, test: float = 0.15) -> dict[str, str]:
    """Chia train/val/test theo hồ sơ (không rò rỉ cùng SV), phân tầng theo nhóm BE/FE/BA."""
    rng = np.random.default_rng(seed)
    split: dict[str, str] = {}
    for _, g in hs.groupby("nhom"):
        ids = g["ma_ho_so"].tolist()
        rng.shuffle(ids)
        n_test, n_val = round(len(ids) * test), round(len(ids) * val)
        for i, m in enumerate(ids):
            split[m] = "test" if i < n_test else "val" if i < n_test + n_val else "train"
    return split
