"""Local, experimental text inference for Chi's v3 handoff. No SQL or web writes.

Only load the internally reviewed KET_QUA package. A checksum is an integrity
check, not a substitute for trusting the producer of serialized joblib objects.
"""
from __future__ import annotations

import argparse
import importlib.metadata
import json
import math
import os
from pathlib import Path
import re

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.preprocessing import normalize

from data_pipeline.preprocessor import clean_tokens
from common.layout import SERVICE_ROOT
from training.ranking_pipeline_v3 import FEATURES, audit, read, sha, verify_prepared

MODEL_SHA256 = "6dc17b7ad73ef449be9f8cb6154d90b011f540ef71086af03fbe3b9c992b4471"
MANIFEST_SHA256 = "1c733af3e683a91095a5445100505c8958af7f9608a7ab43a91fb170a28b16f4"
ENCODER_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
FEATURE_TOLERANCE = 5e-6
SCORE_TOLERANCE = 1e-6


def checked_file(root: Path, name: str) -> Path:
    path = (root / name).resolve()
    path.relative_to(root.resolve())
    if not path.is_file():
        raise ValueError(f"Missing artifact: {name}")
    return path


def verify_package(root: Path) -> dict:
    """Verify reviewed bytes before deserializing any transformers."""
    if sha(root / "RETURN_MANIFEST.json") != MANIFEST_SHA256:
        raise ValueError("Not the reviewed Chi v3 handoff manifest")
    manifest = read(root / "RETURN_MANIFEST.json")["sha256"]
    required = {"model/model.txt", "model/model_meta.json", "model/preparation.json",
                "model/model_checksums.json", "model/tfidf_vectorizer.joblib",
                "model/lsa_svd.joblib", "code/data_pipeline/preprocessor.py",
                "code/data_pipeline/embedder.py"}
    if not required <= manifest.keys() or manifest["model/model.txt"] != MODEL_SHA256:
        raise ValueError("Not the reviewed Chi v3 handoff")
    for name, expected in manifest.items():
        if sha(checked_file(root, name)) != expected:
            raise ValueError(f"Handoff checksum mismatch: {name}")
    for name in ("preprocessor.py", "embedder.py"):
        if sha(SERVICE_ROOT / "src/common/data_pipeline" / name) != manifest[f"code/data_pipeline/{name}"]:
            raise ValueError(f"Local preprocessing differs from handoff: {name}")
    meta = read(root / "model/model_meta.json")
    prep = read(root / "model/preparation.json")
    if meta["feature_order"] != FEATURES or prep["features"] != FEATURES:
        raise ValueError("Unexpected feature order")
    if prep["sbert_metadata"]["model"] != ENCODER_NAME:
        raise ValueError("Unexpected SBERT encoder")
    for package, expected in meta["versions"].items():
        if importlib.metadata.version(package) != expected:
            raise ValueError(f"Use handoff version {package}=={expected}")
    for name, expected in read(root / "model/model_checksums.json").items():
        if sha(checked_file(root / "model", name)) != expected:
            raise ValueError(f"Model checksum mismatch: {name}")
    return meta


class LocalEncoder:
    """Pinned cached snapshot; never downloads or executes remote model code."""
    def __init__(self, snapshot: Path, revision: str):
        if not re.fullmatch(r"[0-9a-f]{40}", revision) or snapshot.name != revision:
            raise ValueError("Supply a cached snapshot directory named by its full commit revision")
        files = ("model.safetensors", "config.json", "modules.json", "tokenizer.json",
                 "tokenizer_config.json", "special_tokens_map.json",
                 "sentence_bert_config.json", "config_sentence_transformers.json",
                 "1_Pooling/config.json")
        # HF snapshots may use symlinks into the same hub cache's blobs directory.
        self.identity = {"model": ENCODER_NAME, "revision": revision,
                         "files": {name: sha(snapshot / name) for name in files}}
        modules = read(snapshot / "modules.json")
        if [(m["type"], m["path"]) for m in modules] != [
            ("sentence_transformers.models.Transformer", ""),
            ("sentence_transformers.models.Pooling", "1_Pooling")]:
            raise ValueError("Unexpected encoder modules")
        # Keep incidental HF/Transformers bookkeeping inside ignored project output.
        runtime_cache = SERVICE_ROOT / "output/inference_runtime_cache"
        runtime_cache.mkdir(parents=True, exist_ok=True)
        os.environ["HF_HOME"] = str(runtime_cache)
        os.environ["HF_HUB_CACHE"] = str(runtime_cache / "hub")
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"
        from sentence_transformers import SentenceTransformer
        import torch
        torch.set_num_threads(2)
        self.model = SentenceTransformer(str(snapshot), device="cpu", local_files_only=True,
                                         trust_remote_code=False,
                                         model_kwargs={"use_safetensors": True})
        if self.model.max_seq_length != 128 or self.model.get_sentence_embedding_dimension() != 384:
            raise ValueError("Expected original 128-token / 384-dimensional encoder")
        self.identity.update(max_seq_length=128, dimension=384, device="cpu",
                             versions={p: importlib.metadata.version(p) for p in
                                       ("sentence-transformers", "transformers", "torch")})

    def encode(self, texts: list[str]) -> np.ndarray:
        return self.model.encode(texts, batch_size=32, normalize_embeddings=True,
                                 convert_to_numpy=True, show_progress_bar=False)


def embeddings(encoder, texts: list[str]) -> np.ndarray:
    result = np.asarray(encoder.encode(texts))
    if result.shape != (len(texts), 384) or not np.isfinite(result).all():
        raise ValueError("Invalid SBERT output")
    if not np.allclose(np.linalg.norm(result, axis=1), 1, atol=1e-4):
        raise ValueError("Expected normalized SBERT output")
    return result


def validate_records(profiles: list[dict], jobs: list[dict]):
    if not profiles or not jobs:
        raise ValueError("Nonempty profiles and jobs are required")
    for records in (profiles, jobs):
        ids = [r.get("id") for r in records]
        if any(not isinstance(i, str) or not i.strip() for i in ids) or len(set(ids)) != len(ids):
            raise ValueError("IDs must be nonempty unique strings")
        for record in records:
            text = record.get("text")
            if not isinstance(text, str) or not text.strip() or len(text) > 50000:
                raise ValueError("Text must contain 1..50000 characters")
            if not clean_tokens(text):
                raise ValueError("Text has no usable profile/JD content")
    for profile in profiles:
        gpa = profile.get("gpa")
        if gpa is not None and (isinstance(gpa, bool) or not isinstance(gpa, (int, float))
                                or not math.isfinite(gpa) or not 0 <= gpa <= 4):
            raise ValueError("GPA must be null or an explicit finite 0..4 value; no automatic conversion")
    for job in jobs:
        if not isinstance(job.get("has_description"), bool):
            raise ValueError("JD has_description must be explicit, not guessed from text length")
        skills = job.get("skills")
        if not isinstance(skills, list) or any(not isinstance(s, str) or
                not re.fullmatch(r"[a-z][a-z0-9_+#./-]*", s) for s in skills):
            raise ValueError("JD skills must be a list of canonical skill tokens")


class TextRanker:
    def __init__(self, package: Path, encoder):
        self.meta = verify_package(package)
        self.model_hash = sha(package / "model/model.txt")
        self.encoder = encoder
        self.vectorizer = joblib.load(package / "model/tfidf_vectorizer.joblib")
        self.svd = joblib.load(package / "model/lsa_svd.joblib")
        self.booster = lgb.Booster(model_file=str(package / "model/model.txt"))
        if self.booster.feature_name() != FEATURES or self.booster.num_feature() != 6:
            raise ValueError("Model feature schema mismatch")

    def features(self, profiles: list[dict], jobs: list[dict]) -> pd.DataFrame:
        validate_records(profiles, jobs)
        hp = [clean_tokens(p["text"]) for p in profiles]
        jt = [clean_tokens(j["text"]) + sorted(set(j["skills"])) for j in jobs]
        xh, xj = self.vectorizer.transform(hp), self.vectorizer.transform(jt)
        tfidf = (xh @ xj.T).toarray()
        lsa = normalize(self.svd.transform(xh)) @ normalize(self.svd.transform(xj)).T
        # Encoder receives source text, not the token list used by TF-IDF.
        semantic = embeddings(self.encoder, [p["text"] for p in profiles]) @ embeddings(
            self.encoder, [j["text"] for j in jobs]).T
        rows = []
        for a, profile in enumerate(profiles):
            gpa = profile.get("gpa")
            for b, job in enumerate(jobs):
                rows.append([profile["id"], job["id"], float(tfidf[a,b]), float(lsa[a,b]),
                             float(semantic[a,b]), self.meta["train_gpa_median"] if gpa is None else gpa,
                             int(gpa is None), int(job["has_description"])])
        frame = pd.DataFrame(rows, columns=["ma_ho_so", "ma_jd"] + FEATURES)
        if not np.isfinite(frame[FEATURES].to_numpy(dtype=float)).all():
            raise ValueError("Non-finite features")
        return frame

    def score(self, frame: pd.DataFrame) -> np.ndarray:
        scores = self.booster.predict(frame[FEATURES], num_iteration=self.meta["best_iteration"], num_threads=2)
        if not np.isfinite(scores).all():
            raise ValueError("Non-finite model score")
        return scores

    def rank(self, profile: dict, jobs: list[dict], k: int = 5) -> dict:
        if isinstance(k, bool) or not isinstance(k, int) or not 1 <= k <= 20:
            raise ValueError("k must be an integer from 1 to 20")
        frame = self.features([profile], jobs)
        frame["ranking_score"] = self.score(frame)
        ranked = frame.sort_values(["ranking_score", "ma_jd"], ascending=[False, True]).head(k)
        return {"status": "ExperimentalLocalTextInference", "model_sha256": self.model_hash,
                "inference_script_sha256": sha(Path(__file__)),
                "score_kind": "ranking_score_not_probability", "label_type": "weak_rule",
                "business_eligibility_checked": False,
                "items": [{"id": row.ma_jd, "rank": i + 1, "ranking_score": row.ranking_score}
                          for i, row in enumerate(ranked.itertuples())]}


def verify_source(ranker: TextRanker, data: Path, package: Path, prepared: Path) -> dict:
    """Full catalogue parity, without re-fitting, training, or selecting a model."""
    report, _, h, j = audit(data)
    if report["source_manifest_sha256"] != read(package / "source_audit.json")["source_manifest_sha256"]:
        raise ValueError("Different source dataset")
    verify_prepared(prepared)
    if sha(prepared / "prepared_checksums.json") != ranker.meta["source_prepared_checksums_sha256"]:
        raise ValueError("Prepared reference is not the input used by Chi")
    # Linear GPA conversion is reproduced only for the historical dataset audit.
    # The new-text contract accepts explicit 0..4 GPA and never guesses a scale.
    profiles = [{"id": r.ma_ho_so, "text": r.text, "gpa": None if pd.isna(r.gpa) else
                 float(r.gpa) * (0.4 if r.gpa > 4 else 1)}
                for r in h.itertuples()]
    jobs = [{"id": r.ma_jd, "text": r.text, "skills": [] if pd.isna(r.skills) else
             sorted(set(str(r.skills).split(";")) - {"", "nan"}), "has_description": bool(r.co_mo_ta)}
            for r in j.itertuples()]
    actual = ranker.features(profiles, jobs)
    # Prepared by Chi with train-only TF-IDF/LSA; don't compare to old source TF-IDF.
    expected = pd.concat([pd.read_csv(prepared / f"{s}.csv") for s in ("train", "val", "test")])
    actual = actual.set_index(["ma_ho_so", "ma_jd"]).sort_index()
    expected = expected.set_index(["ma_ho_so", "ma_jd"]).sort_index()
    if not actual.index.equals(expected.index):
        raise ValueError("Candidate pair mismatch")
    expected["gpa_chuan_hoa"] = expected.gpa_chuan_hoa.fillna(ranker.meta["train_gpa_median"])
    errors = {name: float(np.max(np.abs(actual[name] - expected[name]))) for name in FEATURES}
    # Also compare supplied encoder arrays directly, with ID alignment.
    encoder_errors = {}
    for label, records, key in (("ho_so", profiles, "ma_ho_so"), ("jd", jobs, "ma_jd")):
        ids = pd.read_csv(data / f"model_objects/sbert_emb_{label}_ids.csv")[key].tolist()
        source = np.load(data / f"model_objects/sbert_emb_{label}.npy", allow_pickle=False)
        new = embeddings(ranker.encoder, [r["text"] for r in records])
        mapping = {r["id"]: vector for r, vector in zip(records, new)}
        encoder_errors[label] = float(np.max(np.abs(np.asarray([mapping[i] for i in ids]) - source)))
    predicted = actual.reset_index()
    predicted["score"] = ranker.score(predicted)
    reference = pd.read_csv(package / "evaluation/test_predictions.csv")
    compared = reference.merge(predicted[["ma_ho_so", "ma_jd", "score"]], on=["ma_ho_so", "ma_jd"],
                               suffixes=("_reference", "_new"), validate="one_to_one")
    score_error = float(np.max(np.abs(compared.score_reference - compared.score_new)))
    top_matches = {}
    for k in (5, 10):
        matching = 0
        for _, group in compared.groupby("ma_ho_so"):
            old = group.sort_values(["score_reference", "ma_jd"], ascending=[False, True]).ma_jd.head(k).tolist()
            new = group.sort_values(["score_new", "ma_jd"], ascending=[False, True]).ma_jd.head(k).tolist()
            matching += int(old == new)
        top_matches[str(k)] = matching
    passed = (all(e <= FEATURE_TOLERANCE for e in errors.values()) and
              all(e <= FEATURE_TOLERANCE for e in encoder_errors.values()) and
              score_error <= SCORE_TOLERANCE and len(compared) == len(reference) and
              all(count == reference.ma_ho_so.nunique() for count in top_matches.values()))
    return {"status": "passed" if passed else "failed", "scope": "full_source_text_parity",
            "inference_script_sha256": sha(Path(__file__)),
            "model_sha256": ranker.model_hash, "source_manifest_sha256": report["source_manifest_sha256"],
            "profiles": len(h), "jobs": len(j), "pairs": len(actual), "test_pairs": len(compared),
            "feature_max_absolute_error": errors, "embedding_max_absolute_error": encoder_errors,
            "test_score_max_absolute_error": score_error,
            "test_profiles_with_identical_ordered_top_k": top_matches,
            "feature_tolerance": FEATURE_TOLERANCE, "score_tolerance": SCORE_TOLERANCE,
            "encoder": ranker.encoder.identity,
            "interpretation": "Technical parity only; not human relevance or new-JD quality validation"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("verify-source", "predict-text"))
    parser.add_argument("--package", type=Path, required=True)
    parser.add_argument("--encoder-snapshot", type=Path, required=True)
    parser.add_argument("--encoder-revision", required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--data", type=Path)
    parser.add_argument("--prepared", type=Path)
    parser.add_argument("--input", type=Path)
    args = parser.parse_args()
    if args.out.exists():
        parser.error("Output exists; choose a new filename to preserve earlier results")
    if args.command == "verify-source" and (args.data is None or args.prepared is None):
        parser.error("verify-source requires --data and --prepared (the original input to Chi)")
    if args.command == "predict-text" and args.input is None:
        parser.error("predict-text requires --input")
    verify_package(args.package)
    ranker = TextRanker(args.package, LocalEncoder(args.encoder_snapshot, args.encoder_revision))
    if args.command == "verify-source":
        result = verify_source(ranker, args.data, args.package, args.prepared)
    else:
        request = read(args.input)
        result = ranker.rank(request["profile"], request["jobs"], request.get("k", 5))
        result["encoder"] = ranker.encoder.identity
    args.out.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation even if another invocation created the output meanwhile.
    with args.out.open("x", encoding="utf-8") as stream:
        json.dump(result, stream, ensure_ascii=False, indent=2, allow_nan=False)
    print(json.dumps({k: v for k, v in result.items() if k in ("status", "scope", "model_sha256")}, indent=2))
    if result["status"] == "failed":
        raise SystemExit(2)


if __name__ == "__main__":
    main()
