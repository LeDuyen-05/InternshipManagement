"""
Tính độ tương đồng giữa hồ sơ sinh viên và JD công ty bằng TF-IDF + Cosine Similarity.
Đúng theo hướng đã thống nhất với GVHD (18/9): dữ liệu ảo, không cần chạy service sống —
script này chạy khi cần cập nhật gợi ý, kết quả ghi thẳng vào bảng GOIYCONGTY.
"""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Tuple


def tinh_do_tuong_dong(noi_dung_ho_so: str, danh_sach_jd: List[Tuple[str, str]], top_k: int = 5):
    """
    noi_dung_ho_so: văn bản mô tả năng lực 1 sinh viên (gộp kỹ năng + đồ án + GPA)
    danh_sach_jd: list các tuple (maCongTy, noiDungJD)
    Trả về top_k (maCongTy, điểm tương đồng) cao nhất.
    """
    if not danh_sach_jd:
        return []

    ma_cong_ty_list = [item[0] for item in danh_sach_jd]
    corpus = [noi_dung_ho_so] + [item[1] for item in danh_sach_jd]

    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(corpus)
    scores = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]

    ranked = sorted(zip(ma_cong_ty_list, scores), key=lambda x: x[1], reverse=True)
    return ranked[:top_k]
