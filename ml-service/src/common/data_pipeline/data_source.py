"""Nạp dữ liệu thô từ SQL Server (hoặc từ thư mục CSV đã export để làm việc offline)."""
from __future__ import annotations

from pathlib import Path

import pandas as pd

QUERIES: dict[str, str] = {
    "sinhvien": """
        SELECT sv.maSV, sv.hoTen, sv.lop, sv.gpa, sv.kyNang, sv.chuyenNganh, sv.congNghe, sv.duAnDaThucHien,
               hs.maHoSo, hs.NDHoSo
        FROM SINHVIEN sv LEFT JOIN HOSONANGLUC hs ON hs.maSV = sv.maSV""",
    "congty": """
        SELECT maCongTy, tenCongTy, viTriTuyen, soLuongNhan, yeuCau, trangThai FROM CONGTY""",
    "dangky": """
        SELECT maDK, maSV, maCongTy, maDot, thuTuUuTien, trangThai FROM DANGKYTHUCTAP""",
    "phongvan": """
        SELECT pv.maPV, pv.maSV, dd.maCongTy, pv.ketQua
        FROM PHONGVAN pv JOIN DAIDIENDOANHNGHIEP dd ON dd.maSo = pv.maDaiDien""",
    "phanbo": """
        SELECT maPB, maSV, maCongTy, maDot, trangThai FROM PHANBOTHUCTAP""",
}


def load_from_db() -> dict[str, pd.DataFrame]:
    from db.connection import get_engine  # import trễ: chế độ CSV không cần pyodbc

    engine = get_engine()
    return {name: pd.read_sql(sql, engine) for name, sql in QUERIES.items()}


def load_from_csv(folder: Path) -> dict[str, pd.DataFrame]:
    return {name: pd.read_csv(folder / f"{name}.csv", dtype=str, keep_default_na=False) for name in QUERIES}


def export_csv(data: dict[str, pd.DataFrame], folder: Path) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    for name, df in data.items():
        df.to_csv(folder / f"{name}.csv", index=False, encoding="utf-8-sig")
