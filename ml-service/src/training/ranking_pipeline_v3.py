"""Reproducible offline handoff CLI for dataset-train-ai_v3. See docs/ai/QUY_TRINH_AI_V3.md.

Does not change source data, write SQL, or deploy. Test scoring is a separate command.
"""
from __future__ import annotations
import argparse
from collections import Counter
import hashlib
import importlib.metadata
import json
from math import log2
from pathlib import Path
import shutil
import zipfile

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
from scipy.sparse import vstack
from sklearn.decomposition import TruncatedSVD
from sklearn.preprocessing import normalize
from common.layout import SERVICE_ROOT
from data_pipeline.embedder import TfidfEmbedder
from data_pipeline.preprocessor import clean_tokens

FEATURES = ["tfidf_cosine", "lsa_cosine", "sbert_cosine", "gpa_chuan_hoa", "thieu_gpa", "jd_co_mo_ta"]
KEYS = ["ma_ho_so", "ma_jd"]


def save(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8")


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def new_dir(path):
    if path.exists() and any(path.iterdir()):
        raise ValueError(f"Output exists: {path}. Use a new run folder; do not overwrite prior results.")
    path.mkdir(parents=True, exist_ok=True)


def audit(data):
    manifest = read(data / "manifest.json")
    bad = []
    for name, item in manifest["files"].items():
        file = (data / name).resolve()
        file.relative_to(data.resolve())
        if not file.is_file() or sha(file) != item["sha256"]:
            bad.append(name)
    if bad:
        raise ValueError(f"Source checksums differ: {bad}")
    p = pd.read_csv(data / "data/dac_trung_train.csv")
    h = pd.read_csv(data / "data/ho_so_da_xu_ly.csv")
    j = pd.read_csv(data / "data/jd_da_xu_ly.csv")
    if list(p.columns) != KEYS + ["split", "nhan"] + FEATURES:
        raise ValueError("Unexpected training schema")
    if p.duplicated(KEYS).any() or h.ma_ho_so.duplicated().any() or j.ma_jd.duplicated().any():
        raise ValueError("Duplicate keys")
    if not set(p.ma_ho_so) <= set(h.ma_ho_so) or not set(p.ma_jd) <= set(j.ma_jd):
        raise ValueError("Invalid foreign keys")
    if set(p.split) != {"train", "val", "test"} or (p.groupby("ma_ho_so").split.nunique() != 1).any():
        raise ValueError("Invalid splits / profile leakage")
    if not p.nhan.isin([0, 1, 2, 3]).all():
        raise ValueError("Labels must be 0..3")
    if p.drop(columns=["gpa_chuan_hoa"]).isna().any().any() or np.isinf(p[FEATURES]).any().any():
        raise ValueError("Unexpected missing/infinite values")
    if not p.gpa_chuan_hoa.isna().eq(p.thieu_gpa.eq(1)).all():
        raise ValueError("Missing GPA flag inconsistent")
    if not p.gpa_chuan_hoa.dropna().between(0, 4).all():
        raise ValueError("GPA outside 0..4")
    hs = h[["ma_ho_so", "text"]].merge(p[["ma_ho_so", "split"]].drop_duplicates(), on="ma_ho_so", validate="one_to_one")
    hs["norm"] = hs.text.fillna("").str.normalize("NFKC").str.casefold().str.split().str.join(" ")
    if hs.norm.eq("").any() or (hs.groupby("norm").split.nunique() > 1).any():
        raise ValueError("Empty profile or exact normalized duplicate crosses splits")
    if len(p) != len(h)*len(j):
        raise ValueError("Expected full profile x job catalogue")
    report = dict(profiles=len(h), jobs=len(j), pairs=len(p), labels=p.nhan.value_counts().sort_index().to_dict(),
                  split_pairs=p.split.value_counts().to_dict(), split_profiles=p.groupby("split").ma_ho_so.nunique().to_dict(),
                  missing_gpa_profiles=int(h.gpa.isna().sum()), checksum_failures=bad,
                  label_type="weak_rule", source_manifest_package=manifest.get("package"),
                  source_manifest_sha256=sha(data / "manifest.json"), near_duplicate_review="pending")
    return report, p, h, j


def prepare(data, out):
    report, p, h, j = audit(data)
    new_dir(out)
    hp = [clean_tokens(t) for t in h.text.fillna("")]
    jt = [clean_tokens(t) + sorted(set(str(s).split(";")) - {"", "nan"})
          for t,s in zip(j.text.fillna(""), j.skills.fillna(""))]
    train_ids = set(p.loc[p.split.eq("train"), "ma_ho_so"])
    fit_h = [tokens for ident,tokens in zip(h.ma_ho_so,hp) if ident in train_ids]
    embedder = TfidfEmbedder(min_df=2).fit(fit_h + jt)
    fit_matrix = vstack([embedder.transform(fit_h),embedder.transform(jt)])
    dim = min(256, min(fit_matrix.shape)-1)
    if dim < 1:
        raise ValueError("Insufficient vocabulary/documents")
    svd = TruncatedSVD(n_components=dim, random_state=42).fit(fit_matrix)
    xh, xj = embedder.transform(hp), embedder.transform(jt)
    lsa_h, lsa_j = normalize(svd.transform(xh)), normalize(svd.transform(xj))
    matrices = {"tfidf_cosine":embedder.cosine(xh,xj), "lsa_cosine":lsa_h @ lsa_j.T}
    hi, ji = dict(zip(h.ma_ho_so,range(len(h)))), dict(zip(j.ma_jd,range(len(j))))
    for name, mat in matrices.items():
        p[name] = [float(mat[hi[a],ji[b]]) for a,b in zip(p.ma_ho_so,p.ma_jd)]
    # Verify packaged SBERT features without executing pickled source objects.
    eh = np.load(data / "model_objects/sbert_emb_ho_so.npy", allow_pickle=False)
    ej = np.load(data / "model_objects/sbert_emb_jd.npy", allow_pickle=False)
    hid = pd.read_csv(data / "model_objects/sbert_emb_ho_so_ids.csv").ma_ho_so.tolist()
    jid = pd.read_csv(data / "model_objects/sbert_emb_jd_ids.csv").ma_jd.tolist()
    if len(set(hid))!=len(hid) or len(set(jid))!=len(jid) or set(hid)!=set(h.ma_ho_so) or set(jid)!=set(j.ma_jd):
        raise ValueError("SBERT embedding ID mismatch")
    if eh.shape!=(len(hid),384) or ej.shape!=(len(jid),384) or not np.isfinite(eh).all() or not np.isfinite(ej).all():
        raise ValueError("Invalid embedding arrays")
    if not np.allclose(np.linalg.norm(eh,axis=1),1,atol=1e-4) or not np.allclose(np.linalg.norm(ej,axis=1),1,atol=1e-4):
        raise ValueError("SBERT arrays are not L2 normalized")
    sim = eh @ ej.T
    sh, sj = dict(zip(hid,range(len(hid)))), dict(zip(jid,range(len(jid))))
    expected = np.array([sim[sh[a],sj[b]] for a,b in zip(p.ma_ho_so,p.ma_jd)])
    error = float(np.max(np.abs(expected-p.sbert_cosine.to_numpy())))
    if error > 5e-6:
        raise ValueError("SBERT cosine differs from supplied arrays")
    embedder.save(out / "tfidf_vectorizer.joblib")
    joblib.dump(svd,out / "lsa_svd.joblib")
    for split in ["train","val","test"]:
        p[p.split.eq(split)].sort_values(KEYS).to_csv(out / f"{split}.csv",index=False,encoding="utf-8-sig")
    p[["ma_ho_so","split"]].drop_duplicates().merge(h[["ma_ho_so","nhom"]],on="ma_ho_so").to_csv(out / "profile_groups.csv",index=False)
    save(out / "audit.json", report)
    save(out / "preparation.json", dict(schema_version="chi-v3-train-only-1", features=FEATURES,
         seed=42, lsa_dimensions=dim, fit_profiles=len(train_ids), fit_known_jobs=len(j),
         protocol="unseen students, known 178-job catalogue; fit train profiles + known jobs only",
         profile_tokens="clean_tokens(text)", job_tokens="clean_tokens(text) + sorted unique canonical skills",
         sbert_max_difference=error, sbert_metadata=read(data / "model_objects/sbert_meta.json"),
         sbert_revision_verified=False, gpa_policy="source linear conversion, not official university conversion",
         script_sha256=sha(Path(__file__)), preprocessor_sha256=sha(SERVICE_ROOT / "src/common/data_pipeline/preprocessor.py")))
    sums={f.name:sha(f) for f in out.iterdir() if f.is_file()}
    save(out / "prepared_checksums.json",sums)
    print(json.dumps(report,ensure_ascii=False,indent=2))


def verify_prepared(data):
    for name, expected in read(data / "prepared_checksums.json").items():
        if sha(data / name) != expected:
            raise ValueError(f"Prepared artifact changed: {name}")


def metric_table(frame, scores):
    df=frame.copy()
    df["score"]=np.asarray(scores)
    result={}
    groups=list(df.groupby("ma_ho_so",sort=True))
    for k in (5,10):
        ndcg,recall=[],[]
        for _,g in groups:
            ranked=g.sort_values(["score","ma_jd"],ascending=[False,True]).nhan.to_numpy()[:k]
            ideal=np.sort(g.nhan.to_numpy())[::-1][:k]
            dcg=lambda y:sum((2**int(r)-1)/log2(i+2) for i,r in enumerate(y))
            denom=dcg(ideal)
            if denom>0:
                ndcg.append(dcg(ranked)/denom)
            relevant=int((g.nhan>=2).sum())
            if relevant:
                recall.append(float((ranked>=2).sum()/relevant))
        result[str(k)]={"ndcg":float(np.mean(ndcg)) if ndcg else None,
                        "recall":float(np.mean(recall)) if recall else None,
                        "ndcg_queries":len(ndcg),"recall_queries":len(recall),"total_queries":len(groups)}
    return result


def transformed(frame, features, median):
    x=frame[features].copy()
    if "gpa_chuan_hoa" in x:
        x["gpa_chuan_hoa"]=x.gpa_chuan_hoa.fillna(median)
    if not np.isfinite(x.to_numpy(dtype=float)).all():
        raise ValueError("Non-finite features after preprocessing")
    return x


def train(data,out):
    verify_prepared(data)
    new_dir(out)
    tr=pd.read_csv(data / "train.csv").sort_values(KEYS)
    va=pd.read_csv(data / "val.csv").sort_values(KEYS)
    # One GPA per training student. GPA is constant across a student's candidates.
    median=float(tr.drop_duplicates("ma_ho_so").gpa_chuan_hoa.median())
    if not np.isfinite(median):
        median=0.0
    baselines={c:metric_table(va,va[c]) for c in FEATURES[:3]}
    configs=[("semantic",FEATURES[:3],7,3), ("six_features",FEATURES,7,3), ("six_features_wide",FEATURES,15,4)]
    results=[]
    best=None
    for name,features,leaves,depth in configs:
        model=lgb.LGBMRanker(objective="lambdarank",n_estimators=500,learning_rate=.05,
            num_leaves=leaves,max_depth=depth,min_child_samples=30,label_gain=[0,1,3,7],
            random_state=42,n_jobs=2,verbosity=-1,deterministic=True,force_col_wise=True)
        model.fit(transformed(tr,features,median),tr.nhan,group=tr.groupby("ma_ho_so",sort=False).size().tolist(),
            eval_set=[(transformed(va,features,median),va.nhan)],eval_group=[va.groupby("ma_ho_so",sort=False).size().tolist()],
            eval_at=[5],callbacks=[lgb.early_stopping(30,first_metric_only=True,verbose=False)])
        pred=model.booster_.predict(transformed(va,features,median),num_iteration=model.best_iteration_)
        metrics=metric_table(va,pred)
        score=metrics["5"]["ndcg"]
        if score is None:
            raise ValueError("Validation has no relevant queries")
        results.append(dict(name=name,features=features,num_leaves=leaves,max_depth=depth,best_iteration=model.best_iteration_,metrics=metrics))
        if best is None or score>best[0]:
            best=(score,name,model,features,pred)
    _,name,model,features,pred=best
    model.booster_.save_model(str(out / "model.txt"),num_iteration=model.best_iteration_)
    for file in ("tfidf_vectorizer.joblib","lsa_svd.joblib","preparation.json"):
        shutil.copyfile(data / file,out / file)
    model_info=dict(model_type="LightGBM LambdaMART",selected=name,feature_order=features,all_features=FEATURES,
        train_gpa_median=median,seed=42,best_iteration=model.best_iteration_,selection="max val NDCG@5; ties prefer earlier smaller configuration",
        label="nhan, weak rule 0..3",gain=[0,1,3,7],test_used_for_selection=False,
        source_prepared_checksums_sha256=sha(data / "prepared_checksums.json"),training_script_sha256=sha(Path(__file__)),
        versions={x:importlib.metadata.version(x) for x in ("numpy","pandas","scikit-learn","lightgbm","joblib","scipy")},
        serving_status="offline feature scorer only; new-text SBERT encoder validation and web integration pending")
    save(out / "model_meta.json",model_info)
    save(out / "validation_results.json",dict(baselines=baselines,experiments=results,selected=name))
    pd.DataFrame({"feature":features,"gain":model.booster_.feature_importance(importance_type="gain")}).to_csv(out / "feature_importance.csv",index=False)
    save(out / "model_checksums.json",{f.name:sha(f) for f in out.iterdir() if f.is_file()})
    print(json.dumps({"selected":name,"val_ndcg5":best[0],"test_evaluated":False},indent=2))


def load_model(path):
    for name,expected in read(path / "model_checksums.json").items():
        if sha(path / name)!=expected:
            raise ValueError(f"Model artifact changed: {name}")
    return lgb.Booster(model_file=str(path / "model.txt")),read(path / "model_meta.json")


def evaluate(data,model_dir,out):
    verify_prepared(data)
    model,meta=load_model(model_dir)
    if meta["source_prepared_checksums_sha256"] != sha(data / "prepared_checksums.json"):
        raise ValueError("Model was trained on a different prepared dataset")
    new_dir(out)
    df=pd.read_csv(data / "test.csv").sort_values(KEYS)
    pred=model.predict(transformed(df,meta["feature_order"],meta["train_gpa_median"]))
    result={"label_type":"weak_rule_not_human", "model_meta_sha256":sha(model_dir / "model_meta.json"),
            "model_sha256":sha(model_dir / "model.txt"),"test_file_sha256":sha(data / "test.csv"),
            "ltr":metric_table(df,pred),"baselines":{c:metric_table(df,df[c]) for c in FEATURES[:3]}}
    profile_groups=pd.read_csv(data / "profile_groups.csv")
    scored=df.assign(score=pred).merge(profile_groups[["ma_ho_so","nhom"]],on="ma_ho_so",validate="many_to_one")
    result["by_profile_group"]={str(g):metric_table(rows,rows.score) for g,rows in scored.groupby("nhom")}
    save(out / "test_metrics.json",result)
    scored[KEYS+["nhan","score","nhom"]].to_csv(out / "test_predictions.csv",index=False)
    scored.sort_values(["ma_ho_so","score","ma_jd"],ascending=[True,False,True]).groupby("ma_ho_so",sort=False).head(10)[KEYS+["nhan","score","nhom"]].to_csv(out / "test_top10.csv",index=False)
    print(json.dumps(result,ensure_ascii=False,indent=2))


def predict(model_dir,features_path,out,k):
    model,meta=load_model(model_dir)
    if out.exists():
        raise ValueError("Prediction output already exists")
    if not 1<=k<=100:
        raise ValueError("k must be 1..100")
    df=pd.read_csv(features_path)
    if df.empty or df[KEYS].isna().any().any() or df.duplicated(KEYS).any():
        raise ValueError("Expected nonempty unique candidate pairs")
    scores=model.predict(transformed(df,meta["feature_order"],meta["train_gpa_median"]))
    ranked=df[KEYS].assign(score=scores).sort_values(["ma_ho_so","score","ma_jd"],ascending=[True,False,True])
    ranked["rank"]=ranked.groupby("ma_ho_so").cumcount()+1
    out.parent.mkdir(parents=True,exist_ok=True)
    ranked[ranked["rank"]<=k].to_csv(out,index=False)


def package(model_dir,evaluation,out):
    load_model(model_dir)
    if read(evaluation / "test_metrics.json")["model_sha256"] != sha(model_dir / "model.txt"):
        raise ValueError("Evaluation does not match model")
    if out.exists():
        raise ValueError("Archive exists; use a versioned filename")
    root=SERVICE_ROOT
    files={"model/"+f.name:f for f in model_dir.iterdir() if f.is_file()}
    files["evaluation/test_metrics.json"]=evaluation / "test_metrics.json"
    for name in ("src/training/__init__.py", "src/training/ranking_pipeline_v3.py", "src/common/__init__.py", "src/common/layout.py", "requirements/requirements-ranking-v3.txt", "src/common/data_pipeline/__init__.py", "src/common/data_pipeline/embedder.py", "src/common/data_pipeline/preprocessor.py"):
        files["code/"+name]=root / name
    files["QUY_TRINH_AI_V3.md"]=root.parent / "docs/ai/HUONG_DAN_COLAB.md"
    out.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(out,"x",zipfile.ZIP_DEFLATED) as z:
        for name,file in files.items():
            z.write(file,name)
        z.writestr("SHA256SUMS.json",json.dumps({n:sha(p) for n,p in files.items()},indent=2))
        z.writestr("STATUS.txt","Offline weak-label research model. Not integrated with web.\nNew-text SBERT encoder parity and independent human evaluation pending.\nRaw profiles, source dataset and per-profile predictions are excluded.\n")
    with zipfile.ZipFile(out) as z:
        if z.testzip() is not None:
            raise ValueError("Archive integrity check failed")
    print(json.dumps({"archive":str(out),"sha256":sha(out)},indent=2))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    subs=parser.add_subparsers(dest="command",required=True)
    for command in ("audit","prepare","train","test","predict-features","package"):
        sub=subs.add_parser(command)
        if command in ("audit","prepare","train","test"):
            sub.add_argument("--data",type=Path,required=True)
        if command in ("test","predict-features","package"):
            sub.add_argument("--model",type=Path,required=True)
        sub.add_argument("--out",type=Path,required=True)
        if command=="predict-features":
            sub.add_argument("--features",type=Path,required=True)
            sub.add_argument("--k",type=int,default=5)
        if command=="package":
            sub.add_argument("--evaluation",type=Path,required=True)
    args=parser.parse_args()
    if args.command=="audit":
        report,*_=audit(args.data)
        if args.out.exists():
            raise ValueError("Audit output exists")
        args.out.parent.mkdir(parents=True,exist_ok=True)
        save(args.out,report)
        print(json.dumps(report,ensure_ascii=False,indent=2))
    elif args.command=="prepare": prepare(args.data,args.out)
    elif args.command=="train": train(args.data,args.out)
    elif args.command=="test": evaluate(args.data,args.model,args.out)
    elif args.command=="predict-features": predict(args.model,args.features,args.out,args.k)
    elif args.command=="package": package(args.model,args.evaluation,args.out)


if __name__=="__main__":
    main()
