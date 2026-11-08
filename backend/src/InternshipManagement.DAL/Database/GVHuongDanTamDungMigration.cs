namespace InternshipManagement.DAL.Database;

// Phân công GVHD "TamDung": SV bị hủy nơi, chưa có nơi mới; không tính vào chỉ tiêu GV.
public static class GVHuongDanTamDungMigration
{
    public static IReadOnlyList<string> Statements { get; } = new[]
    {
        """
        IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_GVHD_TRANGTHAI'
                   AND parent_object_id = OBJECT_ID('GVHUONGDAN') AND definition NOT LIKE '%TamDung%')
        BEGIN
            ALTER TABLE GVHUONGDAN DROP CONSTRAINT CK_GVHD_TRANGTHAI;
            ALTER TABLE GVHUONGDAN ADD CONSTRAINT CK_GVHD_TRANGTHAI
                CHECK (trangThai IN (N'DangHuongDan', N'HoanThanh', N'HuyBo', N'TamDung'));
            -- Một lần khi mở trạng thái mới: SV đã bị hủy nơi và chưa có nơi khác trong đợt đang mở,
            -- chưa chốt kết quả, thì phân công GVHD chuyển tạm dừng để trả lại chỉ tiêu cho GV.
            EXEC(N'UPDATE g SET trangThai = N''TamDung''
                FROM GVHUONGDAN g JOIN DOTTHUCTAP d ON d.maSo = g.maDot
                WHERE g.trangThai = N''DangHuongDan'' AND d.trangThai IN (N''ChuaBatDau'', N''DangDienRa'')
                  AND NOT EXISTS (SELECT 1 FROM CHOTDOTTHUCTAP c WHERE c.MaDot = g.maDot AND c.TrangThai <> N''ChuaChot'')
                  AND EXISTS (SELECT 1 FROM PHANBOTHUCTAP p WHERE p.maSV = g.maSV AND p.maDot = g.maDot AND p.trangThai = N''Huy'')
                  AND NOT EXISTS (SELECT 1 FROM PHANBOTHUCTAP p WHERE p.maSV = g.maSV AND p.maDot = g.maDot AND p.trangThai <> N''Huy'')');
        END
        """
    };
}
