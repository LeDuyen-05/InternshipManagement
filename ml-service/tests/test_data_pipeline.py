"""Chạy: venv\\Scripts\\python -m unittest discover -s tests"""
import unittest

from data_pipeline.external_dataset import gan_nhan
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
    # 03/11/2026: pipeline hiện hành dùng kỹ năng/vị trí và nhãn luật;
    # không khôi phục cách gán nhãn từ trạng thái đăng ký/phỏng vấn/phân bổ đã loại bỏ.
    def test_nhan_ky_nang_phai_xet_dung_vi_tri(self):
        self.assertEqual(gan_nhan({"react", "redux"}, {"react", "redux"}, True), 3)
        self.assertEqual(gan_nhan({"react", "redux"}, {"react", "redux"}, False), 2)

    def test_nhan_yeu(self):
        self.assertEqual(gan_nhan({"python"}, {"react"}, True), 0)
        self.assertEqual(gan_nhan({"python"}, {"python", "sql"}, True), 2)
        self.assertEqual(gan_nhan({"git", "teamwork"}, {"git", "agile"}, True), 1)


if __name__ == "__main__":
    unittest.main()
