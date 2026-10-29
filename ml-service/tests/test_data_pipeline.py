"""Chạy: venv\\Scripts\\python -m unittest discover -s tests"""
import unittest

import pandas as pd

from data_pipeline.dataset_builder import interaction_labels, weak_label
from data_pipeline.preprocessor import clean_tokens, detect_domains, extract_skills, parse_gpa_requirement


class PreprocessorTests(unittest.TestCase):
    def test_chuan_hoa_ky_nang_va_cum_tu(self):
        skills = extract_skills("Thành thạo ReactJS, Node.js và Spring Boot; học máy cơ bản")
        self.assertEqual(skills, {"react", "nodejs", "spring_boot", "machine_learning"})

    def test_khong_khop_spring_hai_lan(self):
        self.assertNotIn("spring", clean_tokens("Spring Boot"))
        self.assertIn("spring_boot", clean_tokens("Spring Boot"))

    def test_bo_stopword(self):
        tokens = clean_tokens("Biết Python và có kinh nghiệm làm dự án nhóm")
        self.assertIn("python", tokens)
        self.assertNotIn("và", tokens)
        self.assertNotIn("biết", tokens)

    def test_gpa(self):
        self.assertEqual(parse_gpa_requirement("Biết SQL, GPA >= 3.0"), 3.0)
        self.assertEqual(parse_gpa_requirement("GPA ≥ 2,8"), 2.8)
        self.assertIsNone(parse_gpa_requirement("Theo thỏa thuận"))

    def test_linh_vuc(self):
        self.assertEqual(detect_domains({"python"}), set())
        self.assertIn("ai_ml", detect_domains({"python", "deep_learning"}))


class LabelTests(unittest.TestCase):
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
