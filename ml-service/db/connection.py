"""
Kết nối SQL Server bằng SQLAlchemy + pyodbc.
Đổi thông tin kết nối cho khớp với appsettings.json của backend C#.
"""
from sqlalchemy import create_engine

CONNECTION_STRING = (
    "mssql+pyodbc://localhost/InternshipManagementDb"
    "?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes"
)


def get_engine():
    return create_engine(CONNECTION_STRING)
