"""Sinh hồ sơ sinh viên ảo (đã thống nhất với GVHD: được dùng dữ liệu ảo) để tăng cỡ mẫu huấn luyện.

Mỗi SV ảo được gán một lĩnh vực chính, lấy ngẫu nhiên kỹ năng của lĩnh vực đó và vài kỹ năng nhiễu.
Hồ sơ ảo KHÔNG có nhãn tương tác — chỉ có nhãn yếu (label_nguon = "noi_dung"), mã SV bắt đầu bằng "SYN".
"""
from __future__ import annotations

import random

import pandas as pd

POOLS = {
    "Web Frontend": ["ReactJS", "Redux", "TypeScript", "Tailwind CSS", "Vue.js", "HTML CSS", "Figma"],
    "Web Backend": ["Node.js", "Express", "Java", "Spring Boot", "RESTful API", "SQL Server", "MongoDB", "Docker"],
    "AI/ML": ["Python", "Machine Learning", "PyTorch", "TensorFlow", "NLP", "Computer Vision", "scikit-learn"],
    "Dữ liệu": ["Python", "SQL", "Pandas", "ETL", "Airflow", "Phân tích dữ liệu", "Data warehouse"],
    "Mobile": ["Flutter", "Dart", "Kotlin", "Android", "Firebase", "Swift"],
    "DevOps/Cloud": ["Docker", "Kubernetes", "CI/CD", "AWS", "Linux"],
    "An toàn thông tin": ["Linux", "Wireshark", "Pentest", "BurpSuite", "Network", "Splunk"],
    "Kiểm thử": ["Kiểm thử phần mềm", "Selenium", "Postman", "Cypress", "Jest", "Test case"],
}
HO = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Võ", "Đặng", "Bùi", "Đỗ", "Ngô"]
DEM = ["Văn", "Thị", "Minh", "Quốc", "Thanh", "Gia", "Hoài", "Ngọc"]
TEN = ["An", "Bình", "Châu", "Dũng", "Giang", "Hải", "Khoa", "Linh", "Nam", "Phúc", "Quân", "Trang", "Vy"]


def generate(n: int, seed: int = 2026) -> pd.DataFrame:
    rnd = random.Random(seed)
    rows = []
    domains = list(POOLS)
    for i in range(1, n + 1):
        dom = rnd.choice(domains)
        skills = rnd.sample(POOLS[dom], k=min(len(POOLS[dom]), rnd.randint(3, 5)))
        noise = rnd.sample(POOLS[rnd.choice(domains)], k=1)
        cong_nghe = ", ".join(dict.fromkeys(skills + noise))
        rows.append({
            "maSV": f"SYN{i:04d}",
            "hoTen": f"{rnd.choice(HO)} {rnd.choice(DEM)} {rnd.choice(TEN)}",
            "lop": "SYN",
            "gpa": round(rnd.uniform(2.4, 3.9), 2),
            "kyNang": dom,
            "chuyenNganh": "Công nghệ thông tin",
            "congNghe": cong_nghe,
            "duAnDaThucHien": f"Dự án {dom.lower()} sử dụng {skills[0]}",
            "maHoSo": None,
            "NDHoSo": f"Có kiến thức {cong_nghe}, mong muốn thực tập vị trí {dom}.",
        })
    return pd.DataFrame(rows)
