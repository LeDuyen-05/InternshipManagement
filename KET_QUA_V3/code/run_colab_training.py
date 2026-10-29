"""One fixed training experiment, report, reload check and return ZIP for Chi.

Training settings are defined before test evaluation. No hyperparameter selection
uses the test score. Raw student text is not required in the Colab input.
"""
from __future__ import annotations
import argparse
import csv
from datetime import datetime, timezone
import importlib.metadata
import json
from pathlib import Path
import platform
import shutil
import sys
import zipfile

import pandas as pd
import ranking_pipeline_v3 as core


def check_input(root):
    manifest=core.read(root / "INPUT_MANIFEST.json")
    listed=set(manifest["sha256"])
    actual={p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file() and p.name!="INPUT_MANIFEST.json" and "__pycache__" not in p.parts}
    if listed!=actual:
        raise ValueError("Input files differ from manifest")
    for name,expected in manifest["sha256"].items():
        path=(root/name).resolve()
        path.relative_to(root.resolve())
        if core.sha(path)!=expected:
            raise ValueError(f"Checksum mismatch: {name}")
    core.verify_prepared(root / "prepared")
    audit=core.read(root / "prepared/audit.json")
    for split,key in (("train","train"),("val","val"),("test","test")):
        # Counts are integrity checks, not test metric inspection.
        df=pd.read_csv(root / "prepared" / f"{split}.csv")
        if len(df)!=audit["split_pairs"][key]:
            raise ValueError(f"Row count mismatch: {split}")
    return manifest


def fmt(value):
    return "Không có query hợp lệ" if value is None else f"{value:.4f}"


def write_report(out,prepared):
    source=core.read(prepared / "audit.json")
    prep=core.read(prepared / "preparation.json")
    meta=core.read(out / "model/model_meta.json")
    validation=core.read(out / "model/validation_results.json")
    test=core.read(out / "evaluation/test_metrics.json")
    lines=["# Kết quả train v3 do notebook của Chi tạo", "",
        "Báo cáo tự động từ các file kết quả thực tế của lần chạy này. Nhãn là nhãn yếu theo luật; chưa có đánh giá chuyên gia hoặc người chấm độc lập.", "",
        "## 1. Dữ liệu và phương pháp", "",
        f"- Hồ sơ: {source['profiles']}; JD: {source['jobs']}; cặp: {source['pairs']}.",
        f"- Cặp train/val/test: {source['split_pairs']['train']} / {source['split_pairs']['val']} / {source['split_pairs']['test']}.",
        f"- Hash manifest nguồn: `{source['source_manifest_sha256']}`.",
        f"- Phạm vi fit: {prep['protocol']}.",
        "- TF-IDF/LSA đã chuẩn bị trước trên hồ sơ train và danh mục JD đã biết. SBERT pretrained cố định; không fine-tune encoder.",
        "- Ba cấu hình định trước; chọn theo validation NDCG@5; test chỉ được chấm sau khi chốt model.",
        f"- Model chọn: `{meta['selected']}`, {meta['best_iteration']} vòng; feature: {', '.join(meta['feature_order'])}.",
        f"- GPA thiếu được điền median train {meta['train_gpa_median']:.4f}; vẫn giữ cờ thiếu.",
        "", "## 2. Validation", "", "| Phương pháp | NDCG@5 | NDCG@10 |", "|---|---:|---:|"]
    for name,metrics in validation["baselines"].items():
        lines.append(f"| {name} | {fmt(metrics['5']['ndcg'])} | {fmt(metrics['10']['ndcg'])} |")
    for exp in validation["experiments"]:
        lines.append(f"| {exp['name']} | {fmt(exp['metrics']['5']['ndcg'])} | {fmt(exp['metrics']['10']['ndcg'])} |")
    lines += ["", "## 3. Test trên nhãn yếu", "", "| Phương pháp | NDCG@5 | NDCG@10 | Recall@5 | Recall@10 |", "|---|---:|---:|---:|---:|"]
    methods={**test["baselines"],"LambdaMART":test["ltr"]}
    for name,metrics in methods.items():
        lines.append(f"| {name} | {fmt(metrics['5']['ndcg'])} | {fmt(metrics['10']['ndcg'])} | {fmt(metrics['5']['recall'])} | {fmt(metrics['10']['recall'])} |")
    lines += ["", "NDCG dùng gain 2^nhãn−1; Recall coi nhãn ≥2 là relevant. Mẫu số Recall là toàn bộ relevant trong danh mục ứng viên của hồ sơ.", "",
        f"NDCG@5 tính trên {test['ltr']['5']['ndcg_queries']}/{test['ltr']['5']['total_queries']} query; Recall@5 trên {test['ltr']['5']['recall_queries']} query. Query không có relevant được loại khỏi trung bình tương ứng và công bố số lượng.",
        "", "| Nhóm hồ sơ | Query NDCG@5 | LTR NDCG@5 | LTR NDCG@10 |", "|---|---:|---:|---:|"]
    for name,metrics in test["by_profile_group"].items():
        lines.append(f"| {name} | {metrics['5']['ndcg_queries']} | {fmt(metrics['5']['ndcg'])} | {fmt(metrics['10']['ndcg'])} |")
    lines += ["", "## 4. Nhận xét tự động", ""]
    for k in ("5","10"):
        baseline=max((v[k]["ndcg"],name) for name,v in test["baselines"].items() if v[k]["ndcg"] is not None)
        score=test["ltr"][k]["ndcg"]
        if score is None:
            lines.append(f"- NDCG@{k}: không có query đủ điều kiện để kết luận.")
        else:
            delta=score-baseline[0]
            relation="cao hơn" if delta>1e-12 else "thấp hơn" if delta < -1e-12 else "bằng"
            lines.append(f"- NDCG@{k}: LTR {relation} baseline tốt nhất `{baseline[1]}`; chênh lệch {delta:+.4f} điểm NDCG. Không coi đây là kiểm định ý nghĩa thống kê.")
    lines += ["", "Kết quả chỉ phản ánh benchmark nhãn luật này. Không suy ra xác suất được tuyển hoặc chất lượng trên toàn khoa. Không thay model theo bảng test rồi gọi cùng bảng đó là đánh giá độc lập.",
        "", "## 5. Giới hạn và trạng thái bàn giao", "",
        "- Hồ sơ hiện phủ BA/BE/FE; chưa có đánh giá đủ cho bảo mật, AI/Data và các nhóm khác.",
        "- Có JD thiếu mô tả; GPA nguồn quy tuyến tính; SBERT mặc định cắt 128 token.",
        "- Chưa có nhãn người thật, chưa kiểm định với kết quả tuyển dụng. Nhãn AI tham khảo không được dùng để thay nhãn người.",
        "- Model đã train và kiểm tra nạp lại trên feature. Việc tạo feature cho văn bản mới, xác nhận revision SBERT và nối API/web là bước tiếp theo.",
        "- `score` là điểm xếp hạng, không phải % tương thích. Không nhân score với 100 để gọi xác suất.",
        "", "## 6. Bằng chứng tái lập", "",
        f"- Model hash: `{test['model_sha256']}`.",
        f"- Prepared checksum manifest: `{meta['source_prepared_checksums_sha256']}`.",
        "- Xem `RUN_PLAN.json`, `environment.json`, `requirements-lock.txt`, `model/model_meta.json` và `RETURN_MANIFEST.json` trong gói.",
        "- File dự đoán từng hồ sơ chỉ dùng nội bộ; không đưa toàn bộ lên repo công khai.", ""]
    (out / "BAO_CAO_KET_QUA.md").write_text("\n".join(lines),encoding="utf-8")
    rows=[]
    for name,metrics in methods.items():
        for k in ("5","10"):
            rows.append({"method":name,"k":int(k),**metrics[k]})
    pd.DataFrame(rows).to_csv(out / "BANG_SO_SANH_TEST.csv",index=False,encoding="utf-8-sig")


def train_and_export(root,out):
    manifest=check_input(root)
    core.new_dir(out)
    prepared=root / "prepared"
    core.save(out / "RUN_PLAN.json",dict(started_utc=datetime.now(timezone.utc).isoformat(),
        input_manifest_sha256=core.sha(root / "INPUT_MANIFEST.json"),
        training_code_sha256=core.sha(root / "ml-service/ranking_pipeline_v3.py"),
        configurations=["semantic","six_features","six_features_wide"],
        selection="validation NDCG@5; tied results prefer earlier configuration",seed=42,
        test_policy="evaluate after selection; do not adapt model using test results"))
    env={"python":sys.version,"platform":platform.platform(),"packages":{x:importlib.metadata.version(x) for x in
         ["numpy","pandas","scipy","scikit-learn","lightgbm","joblib","threadpoolctl"]}}
    core.save(out / "environment.json",env)
    (out / "requirements-lock.txt").write_text("\n".join(f"{name}=={version}" for name,version in sorted(env["packages"].items()))+"\n",encoding="utf-8")
    print("STEP 1/4: Training and selecting on validation",flush=True)
    core.train(prepared,out / "model")
    print("STEP 2/4: Model locked; scoring test",flush=True)
    core.evaluate(prepared,out / "model",out / "evaluation")
    print("STEP 3/4: Reload prediction check",flush=True)
    core.predict(out / "model",prepared / "val.csv",out / "reload_top5_val.csv",5)
    reload=pd.read_csv(out / "reload_top5_val.csv")
    val=pd.read_csv(prepared / "val.csv")
    expected=val.groupby("ma_ho_so").size().clip(upper=5)
    actual=reload.groupby("ma_ho_so").size()
    if not expected.sort_index().equals(actual.sort_index()):
        raise ValueError("Reload prediction row counts differ")
    core.save(out / "reload_check.json",dict(status="passed",profiles=len(expected),top5_rows=len(reload)))
    print("STEP 4/4: Report and return archive",flush=True)
    write_report(out,prepared)
    shutil.copyfile(root / "INPUT_MANIFEST.json",out / "INPUT_MANIFEST.json")
    shutil.copyfile(prepared / "audit.json",out / "source_audit.json")
    code_out=out / "code"
    code_out.mkdir()
    for rel in ("ranking_pipeline_v3.py","run_colab_training.py","requirements-colab-v3.txt","data_pipeline/__init__.py","data_pipeline/embedder.py","data_pipeline/preprocessor.py"):
        dest=code_out / rel
        dest.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(root / "ml-service" / rel,dest)
    (out / "DOC_TRUOC.txt").write_text("Gửi toàn bộ ZIP này về cho người chuẩn bị và tích hợp.\nĐọc BAO_CAO_KET_QUA.md.\nKhông sửa số liệu. Model chưa tích hợp web.\nKhông công khai dự đoán theo hồ sơ.\n",encoding="utf-8")
    core.save(out / "RETURN_MANIFEST.json",{"status":"trained_and_evaluated_on_weak_labels",
        "sha256":{p.relative_to(out).as_posix():core.sha(p) for p in sorted(out.rglob("*")) if p.is_file()}})
    destination=out.parent / "KET_QUA_CHI_V3.zip"
    if destination.exists():
        raise ValueError("Return archive already exists")
    with zipfile.ZipFile(destination,"x",zipfile.ZIP_DEFLATED) as archive:
        for p in sorted(out.rglob("*")):
            if p.is_file():
                archive.write(p,p.relative_to(out).as_posix())
    with zipfile.ZipFile(destination) as archive:
        if archive.testzip() is not None:
            raise ValueError("Return ZIP corrupt")
    print(f"SUCCESS: {destination}",flush=True)
    return destination


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input",type=Path,required=True)
    parser.add_argument("--out",type=Path)
    parser.add_argument("--validate-only",action="store_true")
    args=parser.parse_args()
    if args.validate_only:
        check_input(args.input)
        print("INPUT_OK: hashes, prepared artifacts and counts verified; no training/test scoring performed")
    elif args.out is None:
        parser.error("--out is required for training")
    else:
        train_and_export(args.input,args.out)


if __name__=="__main__":
    main()
