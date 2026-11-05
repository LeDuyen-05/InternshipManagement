using System.Globalization;
using InternshipManagement.DAL.Entities;

namespace InternshipManagement.DAL.Database;

/// <summary>Additive catalog upgrade. Existing rubric IDs, scores and round classifications are never rewritten.</summary>
public static class InternshipCatalogMigration
{
    public static IReadOnlyList<TieuChi> Criteria(string type)
    {
        if (type is not ("TTNN" or "TTKS")) throw new ArgumentException("Loại thực tập không hợp lệ.");
        var ks = type == "TTKS";
        var rows = new List<(string Clo, string Text, decimal Score)>
        {
            ("CLO1.1", "Xác định được mục tiêu, nội dung, ý nghĩa của công việc thực tập", .75m),
            ("CLO1.2", "Giới thiệu chung về đơn vị thực tập", ks ? .5m : .75m),
            ("CLO1.3", "Nắm vững vị trí công việc thực tập (Thông tin vị trí thực tập, lên kế hoạch thực tập)", .5m),
            ("CLO2.1", ks ? "Phân tích đánh giá các công việc được giao" : "Vận dụng được kiến thức giải quyết các công việc được giao", .5m),
            ("CLO2.2", ks ? "Ưu điểm, nhược điểm khi thực hiện công việc được giao" : "Giải thích được các phương pháp làm để thực hiện công việc được giao", .5m),
            ("CLO3.1", ks ? "Trình bày được các nội dung công việc tham gia tại doanh nghiệp" : "Nắm rõ được yêu cầu công việc tham gia tại doanh nghiệp", ks ? .25m : .5m),
            ("CLO3.2", ks ? "Trình bày rõ ràng các kỹ thuật dùng trong dự án thực tập" : "Hoàn thành quyển báo cáo đề tài nghiêm túc, hợp lý, ngữ nghĩa trong sáng, không sai lỗi chính tả", .5m),
            ("CLO3.3", ks ? "Trình bày quyển báo cáo nhiêm túc, hợp lý, ngữ nghĩa trong sáng, không sai lỗi chính tả" : "Thuyết trình nội dung rõ ràng với giáo viên", .5m),
            ("CLO3.4", ks ? "Trình bày nội dung rõ ràng với GV" : "Trả lời câu hỏi của giáo viên", .5m)
        };
        if (ks) rows.Add(("CLO3.5", "Trả lời câu hỏi của GV", .5m));
        rows.Add(("CLO4.1", "Nhận xét của đơn vị thực tập về ý thức, trách nhiệm, kỷ luật (Phiếu nhận xét)", 2m));
        rows.Add(("CLO4.2", "Khả năng vận dụng kiến thức vào thực tiễn trong quá trình thực tập (Phiếu nhận xét)", 3m));
        return rows.Select((r, i) => new TieuChi { MaTieuChi = $"{type}_V1_{r.Clo}", MaRubric = $"{type}_V1",
            MaCLO = r.Clo, TenTieuChi = r.Text, DiemToiDa = r.Score, ThuTu = i + 1,
            NhomDanhGia = r.Clo.StartsWith("CLO4.") ? "DN" : "GV" }).ToList();
    }

    private static string N(string text) => "N'" + text.Replace("'", "''") + "'";

    public static IReadOnlyList<string> Statements { get; } = Build();

    private static IReadOnlyList<string> Build()
    {
        var sql = new List<string>
        {
            """
            IF OBJECT_ID('LOAITHUCTAP','U') IS NULL
                CREATE TABLE LOAITHUCTAP (MaLoai nvarchar(20) NOT NULL PRIMARY KEY, TenLoai nvarchar(100) NOT NULL, HoatDong bit NOT NULL);
            IF OBJECT_ID('BOTIEUCHI','U') IS NULL
                CREATE TABLE BOTIEUCHI (MaRubric nvarchar(40) NOT NULL PRIMARY KEY, TenBo nvarchar(200) NOT NULL,
                    MaLoaiThucTap nvarchar(20) NULL REFERENCES LOAITHUCTAP(MaLoai), PhienBan int NOT NULL,
                    TrangThai nvarchar(20) NOT NULL, PhienBanCapNhat int NOT NULL DEFAULT 0,
                    NguoiTao nvarchar(20) NULL, NgayTao datetimeoffset NOT NULL,
                    NguoiPhatHanh nvarchar(20) NULL, NgayPhatHanh datetimeoffset NULL);
            IF COL_LENGTH('DOTTHUCTAP','MaLoaiThucTap') IS NULL ALTER TABLE DOTTHUCTAP ADD MaLoaiThucTap nvarchar(20) NULL;
            IF COL_LENGTH('DANGKYTHUCTAP','MaLanHoTro') IS NULL ALTER TABLE DANGKYTHUCTAP ADD MaLanHoTro nvarchar(32) NULL;
            IF COL_LENGTH('DANGKYTHUCTAP','LanDangKy') IS NULL ALTER TABLE DANGKYTHUCTAP ADD LanDangKy int NOT NULL CONSTRAINT DF_DK_LanDangKy DEFAULT 1;
            IF COL_LENGTH('DANGKYTHUCTAP','KetQuaHoSo') IS NULL ALTER TABLE DANGKYTHUCTAP ADD KetQuaHoSo nvarchar(20) NULL;
            """,
            """
            IF NOT EXISTS(SELECT 1 FROM LOAITHUCTAP WHERE MaLoai='TTNN') INSERT LOAITHUCTAP VALUES ('TTNN',N'Thực tập nghề nghiệp',1);
            IF NOT EXISTS(SELECT 1 FROM LOAITHUCTAP WHERE MaLoai='TTKS') INSERT LOAITHUCTAP VALUES ('TTKS',N'Thực tập kỹ sư',1);
            INSERT BOTIEUCHI(MaRubric,TenBo,MaLoaiThucTap,PhienBan,TrangThai,PhienBanCapNhat,NgayTao)
                SELECT DISTINCT t.maRubric,t.maRubric,NULL,1,'PhatHanh',0,SYSDATETIMEOFFSET()
                FROM TIEUCHI t WHERE t.maRubric IS NOT NULL AND NOT EXISTS(SELECT 1 FROM BOTIEUCHI b WHERE b.MaRubric=t.maRubric);
            INSERT BOTIEUCHI(MaRubric,TenBo,MaLoaiThucTap,PhienBan,TrangThai,PhienBanCapNhat,NgayTao)
                SELECT DISTINCT d.maRubric,d.maRubric,NULL,1,'PhatHanh',0,SYSDATETIMEOFFSET()
                FROM DOTTHUCTAP d WHERE d.maRubric IS NOT NULL AND NOT EXISTS(SELECT 1 FROM BOTIEUCHI b WHERE b.MaRubric=d.maRubric);
            """
        };
        foreach (var type in new[] { "TTNN", "TTKS" })
        {
            var id = type + "_V1";
            var name = type == "TTNN" ? "Thực tập nghề nghiệp" : "Thực tập kỹ sư";
            // Only seed a new catalog as one batch. Never modify an existing/published rubric at startup.
            var values = Criteria(type).Select(c => $"({N(c.MaTieuChi)},{N(c.TenTieuChi)},{c.DiemToiDa.ToString(CultureInfo.InvariantCulture)},{N(c.NhomDanhGia!)},{c.ThuTu},{N(id)},{N(c.MaCLO)})");
            sql.Add($"""
                IF NOT EXISTS(SELECT 1 FROM BOTIEUCHI WHERE MaRubric={N(id)})
                BEGIN
                    INSERT BOTIEUCHI(MaRubric,TenBo,MaLoaiThucTap,PhienBan,TrangThai,PhienBanCapNhat,NgayTao,NgayPhatHanh)
                        VALUES({N(id)},{N(name)},{N(type)},1,'PhatHanh',0,SYSDATETIMEOFFSET(),SYSDATETIMEOFFSET());
                    INSERT TIEUCHI(maTieuChi,tenTieuChi,diemToiDa,nhomDanhGia,thuTu,maRubric,maCLO) VALUES {string.Join(",", values)};
                END;
                """);
        }
        sql.Add("""
            UPDATE DOTTHUCTAP SET MaLoaiThucTap = 'TTNN', maRubric = 'TTNN_V1', tenDot = N'Thực tập nghề nghiệp đợt 1 năm 2026' WHERE maSo = 'DOT01' AND (MaLoaiThucTap IS NULL OR tenDot LIKE N'%tốt nghiệp%');
            UPDATE DOTTHUCTAP SET MaLoaiThucTap = 'TTKS', maRubric = 'TTKS_V1', tenDot = N'Thực tập kỹ sư đợt 2 năm 2026' WHERE maSo = 'DOT02' AND (MaLoaiThucTap IS NULL OR tenDot LIKE N'%tốt nghiệp%');
            UPDATE DOTTHUCTAP SET MaLoaiThucTap = 'TTKS', maRubric = 'TTKS_V1', tenDot = N'Thực tập kỹ sư đợt 1 năm 2027' WHERE maSo = 'DOT03' AND (MaLoaiThucTap IS NULL OR tenDot LIKE N'%tốt nghiệp%');
            IF EXISTS(SELECT 1 FROM sys.key_constraints WHERE name='UQ_DKTT_SV_CT_DOT' AND parent_object_id=OBJECT_ID('DANGKYTHUCTAP'))
                ALTER TABLE DANGKYTHUCTAP DROP CONSTRAINT UQ_DKTT_SV_CT_DOT;
            IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('DANGKYTHUCTAP') AND name='UQ_DKTT_SV_CT_DOT_LAN')
                CREATE UNIQUE INDEX UQ_DKTT_SV_CT_DOT_LAN ON DANGKYTHUCTAP(maSV,maCongTy,maDot,LanDangKy);
            IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_DOT_LOAI')
                ALTER TABLE DOTTHUCTAP ADD CONSTRAINT FK_DOT_LOAI FOREIGN KEY(MaLoaiThucTap) REFERENCES LOAITHUCTAP(MaLoai);
            IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_DOT_RUBRIC')
                ALTER TABLE DOTTHUCTAP ADD CONSTRAINT FK_DOT_RUBRIC FOREIGN KEY(maRubric) REFERENCES BOTIEUCHI(MaRubric);
            IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_TC_RUBRIC')
                ALTER TABLE TIEUCHI ADD CONSTRAINT FK_TC_RUBRIC FOREIGN KEY(maRubric) REFERENCES BOTIEUCHI(MaRubric);
            IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_DK_LANHOTRO')
                ALTER TABLE DANGKYTHUCTAP ADD CONSTRAINT FK_DK_LANHOTRO FOREIGN KEY(MaLanHoTro) REFERENCES LANHOTROTHUCTAP(MaLan);
            """);
        return sql;
    }
}
