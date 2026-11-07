import os
import urllib.parse

from sqlalchemy import create_engine


def _default_driver() -> str:
    """Chọn ODBC Driver mới nhất có trên máy (18 → 17 → SQL Server)."""
    try:
        import pyodbc
        drivers = [d for d in pyodbc.drivers() if "SQL Server" in d]
        for name in ("ODBC Driver 18 for SQL Server", "ODBC Driver 17 for SQL Server"):
            if name in drivers:
                return name
        if drivers:
            return drivers[-1]
    except ImportError:
        pass
    return "ODBC Driver 17 for SQL Server"


def get_engine():
    odbc = os.getenv(
        "ML_ODBC_CONNECTION",
        f"DRIVER={{{_default_driver()}}};SERVER=localhost\\SQLEXPRESS;DATABASE=QuanLyThucTap;"
        "Trusted_Connection=yes;TrustServerCertificate=yes",
    )
    return create_engine("mssql+pyodbc:///?odbc_connect=" + urllib.parse.quote_plus(odbc))
