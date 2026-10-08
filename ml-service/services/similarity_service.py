"""TF-IDF baseline + Cosine Similarity + ranking + NDCG@K."""
from math import log2
from typing import Dict, List, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def xep_hang_tfidf_cosine(noi_dung_ho_so: str, danh_sach_jd: List[Tuple[str, str]], top_k: int = 5):
    if not danh_sach_jd:
        return []
    ids = [x[0] for x in danh_sach_jd]
    corpus = [noi_dung_ho_so or ""] + [x[1] or "" for x in danh_sach_jd]
    vectorizer = TfidfVectorizer(lowercase=True, token_pattern=r"(?u)\b\w+\b")
    matrix = vectorizer.fit_transform(corpus)
    scores = cosine_similarity(matrix[0:1], matrix[1:])[0]
    ranked = sorted(zip(ids, scores.tolist()), key=lambda x: (-x[1], x[0]))
    return ranked[:top_k]


def dcg(relevances: List[float]) -> float:
    return sum((2 ** rel - 1) / log2(i + 2) for i, rel in enumerate(relevances))


def ndcg_at_k(ranked_ids: List[str], relevance: Dict[str, float], k: int = 5) -> float:
    predicted = [relevance.get(x, 0.0) for x in ranked_ids[:k]]
    ideal = sorted(relevance.values(), reverse=True)[:k]
    idcg = dcg(ideal)
    return 0.0 if idcg == 0 else dcg(predicted) / idcg

# Tương thích tên hàm cũ.
def tinh_do_tuong_dong(noi_dung_ho_so: str, danh_sach_jd: List[Tuple[str, str]], top_k: int = 5):
    return xep_hang_tfidf_cosine(noi_dung_ho_so, danh_sach_jd, top_k)
