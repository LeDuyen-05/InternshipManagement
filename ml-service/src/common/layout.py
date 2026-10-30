"""Repository paths and the minimal source set carried by new Colab bundles."""
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]
COLAB_SOURCE_FILES = (
    "src/training/__init__.py", "src/training/ranking_pipeline_v3.py",
    "src/training/run_colab_training.py", "src/common/__init__.py", "src/common/layout.py",
    "src/common/data_pipeline/__init__.py", "src/common/data_pipeline/embedder.py",
    "src/common/data_pipeline/preprocessor.py", "requirements/requirements-colab-v3.txt",
)
