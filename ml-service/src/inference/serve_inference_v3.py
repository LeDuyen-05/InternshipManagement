"""Loopback-only scorer for the .NET backend. No SQL, request logs or uploads."""
from __future__ import annotations

import argparse
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import threading

from data_pipeline.external_dataset import an_danh
from data_pipeline.preprocessor import extract_skills
from inference.inference_v3 import LocalEncoder, TextRanker, read, sha

MAX_BODY = 2 * 1024 * 1024
MAX_JOBS = 500


def verified_ranker(package, snapshot, revision, parity):
    ranker = TextRanker(package, LocalEncoder(snapshot, revision))
    report = read(parity)
    if (report.get("status") != "passed" or report.get("scope") != "full_source_text_parity"
            or report.get("model_sha256") != ranker.model_hash
            or report.get("inference_script_sha256") != sha(Path(__file__).parent / "inference_v3.py")
            or report.get("encoder") != ranker.encoder.identity
            or report.get("pairs") != 42008
            or report.get("test_profiles_with_identical_ordered_top_k") != {"5": 35, "10": 35}):
        raise ValueError("Parity report does not approve this model/encoder/runtime")
    return ranker


def score_request(ranker, request):
    if not isinstance(request, dict) or request.get("schema_version") != "web-v3-1":
        raise ValueError("Unsupported request schema")
    profile, jobs = request.get("profile"), request.get("jobs")
    if not isinstance(profile, dict) or not isinstance(jobs, list) or not 1 <= len(jobs) <= MAX_JOBS:
        raise ValueError("Expected one profile and 1..500 jobs")
    text = profile.get("text")
    if not isinstance(text, str):
        raise ValueError("Missing profile text")
    canonical = []
    for job in jobs:
        if not isinstance(job, dict) or not isinstance(job.get("title"), str) or not isinstance(job.get("description"), str):
            raise ValueError("Expected title and description")
        if not job["description"].strip():
            raise ValueError("JD description is required")
        jd_text = an_danh(" . ".join(p.strip() for p in (job["title"], job["description"]) if p.strip()))
        canonical.append({"id": job.get("id"), "text": jd_text,
                          "skills": sorted(extract_skills(jd_text)), "has_description": True})
    frame = ranker.features([{"id": "profile", "text": an_danh(text), "gpa": profile.get("gpa")}], canonical)
    scores = ranker.score(frame)
    return {"schema_version": "web-v3-1", "status": "ready", "model_sha256": ranker.model_hash,
            "encoder_revision": ranker.encoder.identity["revision"],
            "score_kind": "ranking_score_not_probability", "label_type": "weak_rule",
            "items": [{"id": row.ma_jd, "ranking_score": float(score), "tfidf_cosine": float(row.tfidf_cosine)}
                      for row, score in zip(frame.itertuples(), scores)]}


def make_server(ranker, token, port=0):
    if len(token) < 32:
        raise ValueError("IM_INFERENCE_TOKEN must have at least 32 characters")
    gate = threading.Lock()

    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.0"

        def setup(self):
            super().setup()
            self.connection.settimeout(10)

        def log_message(self, *args):
            pass  # Never log student/JD payloads, tokens or URLs.

        def reply(self, status, payload):
            encoded = json.dumps(payload, allow_nan=False).encode("utf-8")
            try:
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(encoded)))
                self.end_headers()
                self.wfile.write(encoded)
            except (BrokenPipeError, ConnectionResetError):
                pass  # Backend may already have timed out/cancelled.

        def authorized(self):
            value = self.headers.get("Authorization", "")
            return hmac.compare_digest(value.encode(), ("Bearer " + token).encode())

        def do_GET(self):
            if not self.authorized():
                self.reply(401, {"error": "unauthorized"})
            elif self.path != "/health":
                self.reply(404, {"error": "not_found"})
            else:
                self.reply(200, {"status": "ready", "model_sha256": ranker.model_hash})

        def do_POST(self):
            if not self.authorized():
                return self.reply(401, {"error": "unauthorized"})
            if self.path != "/v1/score":
                return self.reply(404, {"error": "not_found"})
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                return self.reply(400, {"error": "invalid_length"})
            if self.headers.get("Transfer-Encoding") or not 0 < length <= MAX_BODY:
                return self.reply(413, {"error": "invalid_body_size"})
            if not gate.acquire(blocking=False):
                return self.reply(503, {"error": "busy"})
            try:
                body = self.rfile.read(length)
                if len(body) != length:
                    raise ValueError("Incomplete body")
                request = json.loads(body)
                self.reply(200, score_request(ranker, request))
            except (ValueError, TypeError, KeyError):
                self.reply(400, {"error": "invalid_input"})
            except Exception:
                self.reply(503, {"error": "scorer_unavailable"})
            finally:
                gate.release()

    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    server.daemon_threads = True
    return server


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("package", "encoder-snapshot", "parity-report"):
        parser.add_argument("--" + name, type=Path, required=True)
    parser.add_argument("--encoder-revision", required=True)
    parser.add_argument("--port", type=int, default=5210)
    args = parser.parse_args()
    ranker = verified_ranker(args.package, args.encoder_snapshot, args.encoder_revision, args.parity_report)
    server = make_server(ranker, os.environ.get("IM_INFERENCE_TOKEN", ""), args.port)
    print(json.dumps({"status": "ready", "port": server.server_port, "model_sha256": ranker.model_hash}), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
