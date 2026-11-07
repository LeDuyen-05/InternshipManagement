"""Gán nhãn cho dữ liệu hệ thống (src/common/data_pipeline/dataset_builder.py)."""
import unittest

import pandas as pd

from data_pipeline.dataset_builder import interaction_labels, weak_label


class InteractionLabelTests(unittest.TestCase):
    def test_nhan_tuong_tac(self):
        dk = pd.DataFrame([
            {"maSV": "SV1", "maCongTy": "A", "trangThai": "DaDuyet"},
            {"maSV": "SV1", "maCongTy": "B", "trangThai": "ChoDuyet"},
            {"maSV": "SV2", "maCongTy": "A", "trangThai": "TuChoi"},
        ])
        pv = pd.DataFrame([{"maSV": "SV2", "maCongTy": "B", "ketQua": "KhongDat"}])
        pb = pd.DataFrame([{"maSV": "SV1", "maCongTy": "A", "trangThai": "DangThucTap"}])
        labels = interaction_labels(dk, pv, pb)
        self.assertEqual(labels[("SV1", "A")], 3)
        self.assertEqual(labels[("SV1", "B")], 1)
        self.assertEqual(labels[("SV2", "A")], 0)
        self.assertEqual(labels[("SV2", "B")], 0)

    def test_nhan_yeu(self):
        self.assertEqual(weak_label({"react", "redux"}, {"web_frontend"}, {"react", "redux"}, {"web_frontend"}, True), 3)
        self.assertEqual(weak_label({"react"}, {"web_frontend"}, {"react"}, {"web_frontend"}, False), 0)
        self.assertEqual(weak_label({"python"}, set(), {"python", "sql"}, {"data"}, True), 1)


if __name__ == "__main__":
    unittest.main()
