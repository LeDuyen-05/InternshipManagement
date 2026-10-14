import os, urllib.parse
from sqlalchemy import create_engine

def get_engine():
    odbc = os.getenv("ML_ODBC_CONNECTION",
        "DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost\\SQLEXPRESS;DATABASE=QuanLyThucTap;"
        "Trusted_Connection=yes;TrustServerCertificate=yes")
    return create_engine("mssql+pyodbc:///?odbc_connect=" + urllib.parse.quote_plus(odbc))
