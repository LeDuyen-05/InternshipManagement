"""Tiền xử lý văn bản tiếng Việt cho hồ sơ năng lực SV và yêu cầu tuyển dụng (JD).

- Chuẩn hóa Unicode (NFC), chữ thường, gộp khoảng trắng.
- Chuẩn hóa từ khóa CNTT về một dạng chuẩn (ReactJS / React.js / react → react; "học máy" → machine_learning …)
  và giữ cụm nhiều từ thành một token (nối bằng "_") để TF-IDF không tách rời "spring boot", "machine learning".
- Loại stopword tiếng Việt thông dụng trong CV/JD.
- Trích xuất tập kỹ năng chuẩn + lĩnh vực (domain) + yêu cầu GPA tối thiểu.
"""
from __future__ import annotations

import re
import unicodedata

# Dạng chuẩn ← các biến thể. Cụm dài được so khớp trước.
SKILL_SYNONYMS: dict[str, list[str]] = {
    "react": ["reactjs", "react.js", "react js", "react"],
    "redux": ["redux"],
    "vue": ["vuejs", "vue.js", "vue"],
    "angular": ["angularjs", "angular"],
    "nodejs": ["node.js", "nodejs", "node js", "node"],
    "express": ["expressjs", "express"],
    "typescript": ["typescript", "ts"],
    "javascript": ["javascript", "js"],
    "html_css": ["html", "css", "tailwind css", "tailwind", "bootstrap"],
    "php": ["php", "laravel"],
    "java": ["java"],
    "spring_boot": ["spring boot", "springboot", "spring"],
    "golang": ["golang", "go"],
    "dotnet": [".net", "asp.net", "dotnet", "c#", "csharp"],
    "python": ["python"],
    "rest_api": ["restful api", "rest api", "restful", "api"],
    "microservices": ["microservices", "microservice"],
    "sql": ["sql server", "mysql", "postgresql", "sqlite", "sql", "cơ sở dữ liệu"],
    "nosql": ["mongodb", "redis", "firebase", "cơ sở dữ liệu phân tán"],
    "machine_learning": ["machine learning", "học máy", "ml", "scikit-learn", "sklearn"],
    "deep_learning": ["deep learning", "học sâu", "pytorch", "tensorflow", "keras"],
    "nlp": ["xử lý ngôn ngữ tự nhiên", "natural language processing", "nlp", "bert", "llm", "huggingface"],
    "computer_vision": ["thị giác máy", "computer vision", "phân loại ảnh", "opencv"],
    "data_engineering": ["data engineering", "etl", "airflow", "data warehouse", "pipeline etl"],
    "data_analysis": ["phân tích dữ liệu", "data analysis", "pandas", "khoa học dữ liệu"],
    "flutter": ["flutter", "dart"],
    "android": ["android", "kotlin"],
    "ios": ["ios", "swift"],
    "mobile": ["di động", "mobile"],
    "docker": ["docker", "container"],
    "kubernetes": ["kubernetes", "k8s"],
    "cicd": ["ci/cd", "cicd", "ci cd"],
    "cloud": ["aws", "azure", "gcp", "cloud"],
    "linux": ["linux", "kali linux"],
    "network": ["network", "mạng máy tính", "mạng"],
    "security": ["an toàn thông tin", "bảo mật", "security", "kiểm thử thâm nhập", "pentest", "soc",
                 "wireshark", "burpsuite", "splunk", "rà quét lỗ hổng", "phát hiện xâm nhập"],
    "testing": ["kiểm thử phần mềm", "kiểm thử", "testing", "qa", "qc", "test case", "kịch bản test"],
    "automation_test": ["automation testing", "automation", "selenium", "cypress", "jest", "postman"],
    "ui_ux": ["ui/ux", "ui ux", "figma", "responsive"],
    "teamwork": ["làm việc nhóm", "teamwork", "dự án nhóm"],
}

# Lĩnh vực → kỹ năng đặc trưng (dùng cho đặc trưng domain_match và nhãn yếu)
DOMAINS: dict[str, set[str]] = {
    "web_frontend": {"react", "redux", "vue", "angular", "typescript", "javascript", "html_css", "ui_ux"},
    "web_backend": {"nodejs", "express", "java", "spring_boot", "php", "dotnet", "golang", "rest_api", "microservices", "sql", "nosql"},
    "ai_ml": {"machine_learning", "deep_learning", "nlp", "computer_vision", "python"},
    "data": {"data_engineering", "data_analysis", "sql", "python"},
    "mobile": {"flutter", "android", "ios", "mobile"},
    "devops_cloud": {"docker", "kubernetes", "cicd", "cloud", "linux"},
    "security": {"security", "network", "linux"},
    "testing": {"testing", "automation_test"},
}

STOPWORDS = {
    "và", "hoặc", "của", "các", "những", "một", "có", "là", "được", "với", "cho", "trong", "theo", "để",
    "đã", "đang", "sẽ", "về", "từ", "tại", "khi", "như", "này", "đó", "thì", "mà", "nên", "cũng", "rất",
    "biết", "hiểu", "nắm", "thành", "thạo", "kinh", "nghiệm", "mong", "muốn", "thực", "tập", "vị", "trí",
    "kỹ", "năng", "sinh", "viên", "làm", "dự", "án", "hệ", "thống", "nền", "tảng", "cơ", "bản", "tốt",
    "gpa", "yêu", "cầu", "ứng", "dụng", "công", "ty", "ngành", "chuyên",
}

_GPA_RE = re.compile(r"gpa\s*(?:>=|≥|>|từ|tối thiểu)?\s*(\d+(?:[.,]\d+)?)", re.IGNORECASE)
_TOKEN_RE = re.compile(r"[\w#+./]+", re.UNICODE)

# Bảng so khớp: (biến thể, dạng chuẩn) sắp xếp cụm dài trước
_PATTERNS = sorted(
    ((v, k) for k, vs in SKILL_SYNONYMS.items() for v in vs),
    key=lambda x: -len(x[0]),
)
_COMPILED = [
    (re.compile(r"(?<![\w#+.])" + re.escape(v) + r"(?![\w#+])", re.IGNORECASE), k) for v, k in _PATTERNS
]


def normalize(text: str | None) -> str:
    if not text:
        return ""
    text = unicodedata.normalize("NFC", str(text)).lower()
    return re.sub(r"\s+", " ", text).strip()


def extract_skills(text: str | None) -> set[str]:
    t = normalize(text)
    found: set[str] = set()
    for rx, canon in _COMPILED:
        if rx.search(t):
            found.add(canon)
            t = rx.sub(" ", t)  # tránh khớp lặp ("spring boot" rồi lại "spring")
    return found


def detect_domains(skills: set[str]) -> set[str]:
    """Một lĩnh vực được nhận khi có ≥1 kỹ năng đặc trưng (python đơn lẻ không đủ để gán ai_ml/data)."""
    out = set()
    for dom, keys in DOMAINS.items():
        hits = skills & keys
        if hits and hits != {"python"} and hits != {"sql"} and hits != {"linux"}:
            out.add(dom)
    return out


def parse_gpa_requirement(text: str | None) -> float | None:
    m = _GPA_RE.search(normalize(text))
    return float(m.group(1).replace(",", ".")) if m else None


def clean_tokens(text: str | None) -> list[str]:
    """Token cho TF-IDF: kỹ năng chuẩn (giữ nguyên cụm) + từ còn lại sau khi bỏ stopword."""
    t = normalize(text)
    skills = []
    for rx, canon in _COMPILED:
        if rx.search(t):
            skills.append(canon)
            t = rx.sub(" ", t)
    words = [w.strip("./") for w in _TOKEN_RE.findall(t)]
    words = [w for w in words if len(w) > 1 and w not in STOPWORDS and not w.replace(".", "").isdigit()]
    return skills + words


def clean_text(text: str | None) -> str:
    return " ".join(clean_tokens(text))


def build_profile_text(row: dict) -> str:
    """Ghép hồ sơ năng lực + kỹ năng + công nghệ + dự án + chuyên ngành thành một văn bản."""
    parts = [row.get(k) for k in ("NDHoSo", "kyNang", "congNghe", "duAnDaThucHien", "chuyenNganh")]
    return " . ".join(str(p) for p in parts if p and str(p).strip())


def build_jd_text(row: dict) -> str:
    parts = [row.get(k) for k in ("viTriTuyen", "yeuCau")]
    return " . ".join(str(p) for p in parts if p and str(p).strip())
