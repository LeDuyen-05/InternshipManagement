"""Biểu diễn vector (TF-IDF) cho hồ sơ SV và yêu cầu tuyển dụng.

Vectorizer được fit trên toàn bộ văn bản đã tiền xử lý (hồ sơ + JD) và lưu ra file để
Người 1 (huấn luyện) và Người 3 (API gợi ý) dùng lại đúng cùng một không gian đặc trưng.
"""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def _identity(tokens):
    return tokens


class TfidfEmbedder:
    def __init__(self, min_df: int = 1, ngram_range: tuple[int, int] = (1, 2)):
        # Đầu vào là list token đã tiền xử lý → tắt tokenizer/preprocessor mặc định
        self.vectorizer = TfidfVectorizer(
            analyzer="word", tokenizer=_identity, preprocessor=_identity, token_pattern=None,
            lowercase=False, min_df=min_df, ngram_range=ngram_range, sublinear_tf=True,
        )

    def fit(self, token_docs: list[list[str]]) -> "TfidfEmbedder":
        self.vectorizer.fit(token_docs)
        return self

    def transform(self, token_docs: list[list[str]]):
        return self.vectorizer.transform(token_docs)

    @staticmethod
    def cosine(a, b) -> np.ndarray:
        return cosine_similarity(a, b)

    def to_sparse_json(self, row, top_n: int = 30) -> str:
        """Vector thưa → JSON {term: weight} (top_n trọng số lớn nhất) để lưu cột embedding trong CSDL."""
        vocab = self.vectorizer.get_feature_names_out()
        row = row.tocoo()
        pairs = sorted(zip(row.col, row.data), key=lambda x: -x[1])[:top_n]
        return json.dumps({vocab[i]: round(float(w), 5) for i, w in pairs}, ensure_ascii=False)

    def save(self, path: Path) -> None:
        joblib.dump(self.vectorizer, path)

    @classmethod
    def load(cls, path: Path) -> "TfidfEmbedder":
        obj = cls()
        obj.vectorizer = joblib.load(path)
        return obj
