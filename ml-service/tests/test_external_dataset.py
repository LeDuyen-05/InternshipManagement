"""Kiểm thử tiền xử lý bộ dữ liệu ngoài (du-lieu-train)."""
import unittest

import pandas as pd

from data_pipeline import external_dataset as ext


class AnDanhTests(unittest.TestCase):
    def test_xoa_sdt_ngay_email(self):
        t = ext.an_danh("[TEN] 12/05/2003 0912 345 678 a.b@gmail.com github.com/abc")
        self.assertNotIn("0912", t)
        self.assertNotIn("2003", t)
        self.assertNotIn("gmail", t)
        self.assertIn("[SDT]", t)
        self.assertFalse(ext.con_pii(t))

    def test_gop_manh_ho_ten_canh_nhan_ten(self):
        t = ext.an_danh("Nguyễn Nhật [TEN] Đức [TEN] - Backend Developer")
        self.assertNotIn("Nguyễn", t)
        self.assertNotIn("Đức", t)
        self.assertIn("Backend Developer", t)


class KyNangTests(unittest.TestCase):
    def test_bo_go_net_khi_van_ban_khong_co_bang_chung(self):
        s = ext.chuan_hoa_danh_sach("go|net|java|nan", "Thực tập Java, hiểu Network cơ bản")
        self.assertIn("java", s)
        self.assertNotIn("golang", s)
        self.assertNotIn("dotnet", s)

    def test_chuan_hoa_cach_viet_khac_nhau(self):
        self.assertEqual(ext.chuan_hoa_danh_sach("springboot|node.js", ""), {"spring_boot", "nodejs"})


class ViTriTests(unittest.TestCase):
    def test_ba_khong_bi_gan_them_lap_trinh(self):
        self.assertEqual(ext.role_jd("IT BA Intern", {"sql"}), {"ba"})

    def test_tieu_de_lap_trinh_chung_phu_hop_ca_fe_be(self):
        self.assertEqual(ext.role_jd("Thực tập sinh lập trình", set()), {"web_frontend", "web_backend"})

    def test_fullstack(self):
        self.assertTrue({"web_frontend", "web_backend"} <= ext.role_jd("Fullstack Intern", set()))


class NhanTests(unittest.TestCase):
    def test_nguong_nhan(self):
        jd = {"java", "sql", "spring_boot", "docker", "rest_api"}
        self.assertEqual(ext.gan_nhan({"python"}, jd, True), 0)
        self.assertEqual(ext.gan_nhan({"java"}, jd, True), 1)
        self.assertEqual(ext.gan_nhan({"java", "sql"}, jd, True), 2)
        self.assertEqual(ext.gan_nhan({"java", "sql", "spring_boot"}, jd, True), 3)
        self.assertEqual(ext.gan_nhan({"java", "sql", "spring_boot"}, jd, False), 2)

    def test_ky_nang_chung_khong_tinh_vao_nhan(self):
        self.assertEqual(ext.gan_nhan({"git", "teamwork"}, {"git", "teamwork", "java"}, True), 0)
        self.assertEqual(ext.gan_nhan({"git"}, {"git", "agile"}, True), 1)  # coi như JD không có kỹ năng cụ thể

    def test_chia_theo_sinh_vien_khong_trung(self):
        hs = pd.DataFrame({"ma_ho_so": [f"SV{i}" for i in range(40)], "nhom": ["BE", "FE"] * 20})
        split = ext.chia_theo_sinh_vien(hs)
        self.assertEqual(len(split), 40)
        self.assertEqual(set(split.values()), {"train", "val", "test"})


if __name__ == "__main__":
    unittest.main()
