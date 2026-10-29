using System.Text;
using InternshipManagement.BLL.Common;
using InternshipManagement.BLL.DTOs.ThongKe;
using InternshipManagement.DAL.Repositories;

namespace InternshipManagement.BLL.Services.ThongKe;

public class ThongKeService : IThongKeService
{
    private readonly IThongKeRepository _repository;

    public ThongKeService(IThongKeRepository repository)
    {
        _repository = repository;
    }

    public async Task<ThongKeBaoCaoResponse> GetBaoCaoThongKeAsync(string? maDot)
    {
        var dot = await _repository.GetDotThucTapAsync(maDot);
        var resolvedMaDot = dot?.MaSo ?? maDot ?? "DOT001";
        var tenDot = dot?.TenDot ?? $"Đợt thực tập {resolvedMaDot}";

        var sinhViens = await _repository.GetSinhViensAsync(resolvedMaDot);
        var gvHuongDans = await _repository.GetGVHuongDansAsync();
        var giangViens = await _repository.GetGiangViensKemTaiAsync();
        var tienDos = await _repository.GetTienDoThucTapsAsync(resolvedMaDot);
        var phieuDiems = await _repository.GetPhieuChamDiemsAsync(resolvedMaDot);

        var response = new ThongKeBaoCaoResponse
        {
            MaDot = resolvedMaDot,
            TenDot = tenDot,
        };

        // 1. Tổng quan Sinh viên & Phân công
        var tongSV = sinhViens.Count;
        var daPhanCongMap = gvHuongDans.ToDictionary(g => g.MaSinhVien, g => g.GiangVien?.HoTen ?? g.MaGiangVien);
        var daPhanCongCount = sinhViens.Count(s => daPhanCongMap.ContainsKey(s.MaSV));
        var chuaPhanCongCount = Math.Max(0, tongSV - daPhanCongCount);
        var tiLePhanCong = tongSV > 0 ? Math.Round((double)daPhanCongCount / tongSV * 100, 1) : 0;

        // 2. Tiến độ thực tập
        var tongBaoCao = tienDos.Count;
        var daDuyet = tienDos.Count(t => t.TrangThaiDuyet == "DaDuyet");
        var choDuyet = tienDos.Count(t => t.TrangThaiDuyet == "DaNop");
        var chuaNop = tienDos.Count(t => t.TrangThaiDuyet == "ChuaNop");

        // 3. Đánh giá & Điểm CLO
        var phieuDict = phieuDiems
            .GroupBy(p => p.MaSV)
            .ToDictionary(g => g.Key, g => g.First());

        var daChamPhieuList = phieuDiems.Where(p => p.TongDiem.HasValue).ToList();
        var daChamCount = daChamPhieuList.Count;
        var chuaChamCount = Math.Max(0, tongSV - daChamCount);

        double diemTB = 0;
        int soLuongDat = 0;
        int soLuongKhongDat = 0;

        if (daChamCount > 0)
        {
            diemTB = Math.Round((double)daChamPhieuList.Average(p => (double)p.TongDiem!.Value), 2);
            soLuongDat = daChamPhieuList.Count(p => ThangDiem.QuyDoi(p.TongDiem!.Value).Dat);
            soLuongKhongDat = daChamPhieuList.Count - soLuongDat;
        }

        var tiLeDatCLO = daChamCount > 0 ? Math.Round((double)soLuongDat / daChamCount * 100, 1) : 0;

        response.TongQuan = new ThongKeTongQuanDto
        {
            TongSinhVien = tongSV,
            DaPhanCongGVHD = daPhanCongCount,
            ChuaPhanCongGVHD = chuaPhanCongCount,
            TiLePhanCong = tiLePhanCong,
            TongBaoCaoTienDo = tongBaoCao,
            TienDoDaDuyet = daDuyet,
            TienDoChoDuyet = choDuyet,
            TienDoChuaNop = chuaNop,
            DaChamCLO = daChamCount,
            ChuaChamCLO = chuaChamCount,
            DiemTrungBinhCLO = diemTB,
            SoLuongDat = soLuongDat,
            SoLuongKhongDat = soLuongKhongDat,
            TiLeDatCLO = tiLeDatCLO,
        };

        // 4. Phân bố xếp loại điểm (quy đổi điểm chữ theo Bảng 3 ThangDiem)
        var nhomXepLoai = new (string Chu, string Ten, string Khoang)[]
        {
            ("A", "Giỏi (A)", "8.5 - 10.0"),
            ("B+", "Khá (B+)", "8.0 - 8.4"),
            ("B", "Khá (B)", "7.0 - 7.9"),
            ("C+", "Trung bình (C+)", "6.5 - 6.9"),
            ("C", "Trung bình (C)", "5.5 - 6.4"),
            ("D+", "Trung bình yếu (D+)", "5.0 - 5.4"),
            ("D", "Trung bình yếu (D)", "4.0 - 4.9"),
            ("F", "Kém (F)", "< 4.0"),
        };
        var totalDiem = Math.Max(1, daChamCount);
        response.PhanBoDiem = nhomXepLoai.Select(n =>
        {
            var soLuong = daChamPhieuList.Count(p => ThangDiem.QuyDoi(p.TongDiem!.Value).DiemChu == n.Chu);
            return new PhanBoDiemCLODto { XepLoai = n.Ten, KhoangDiem = n.Khoang, SoLuong = soLuong, TiLe = Math.Round((double)soLuong / totalDiem * 100, 1) };
        }).ToList();

        // 5. Thống kê theo chuẩn đầu ra CLO: gom tiêu chí CLOx.y theo nhóm CLOx, quy đổi về thang 10.
        var tieuChis = phieuDiems.SelectMany(p => p.ChiTietChamDiems)
            .Where(c => c.TieuChi != null && c.TieuChi.NhomDanhGia != null)
            .Select(c => c.TieuChi!)
            .GroupBy(t => t.MaTieuChi).Select(g => g.First()).ToList();
        var nhomCLO = tieuChis.GroupBy(t => NhomCLO(t.MaTieuChi))
            .Where(g => g.Key != null).OrderBy(g => g.Key).ToList();

        response.DiemTheoCLO = nhomCLO.Select(g =>
        {
            var ma = g.Key!;
            var maTieuChis = g.Select(t => t.MaTieuChi).ToHashSet();
            var toiDa = (double)g.Sum(t => t.DiemToiDa);
            var diemSV = daChamPhieuList
                .Select(p => p.ChiTietChamDiems.Where(c => maTieuChis.Contains(c.MaTieuChi)).ToList())
                .Where(cts => cts.Count == maTieuChis.Count)
                .Select(cts => (double)cts.Sum(c => c.DiemCham) / toiDa * 10.0)
                .ToList();
            return new DiemChiTietCLODto
            {
                MaCLO = ma,
                TenCLO = TenNhomCLO.TryGetValue(ma, out var ten) ? ten : ma,
                DiemTrungBinh = diemSV.Count > 0 ? Math.Round(diemSV.Average(), 2) : 0,
                TrongSo = Math.Round(toiDa / 10.0, 2),
            };
        }).ToList();
        // 5. Thống kê theo đúng các tiêu chí của rubric đã được lưu trong phiếu.
        var allChiTiets = daChamPhieuList.SelectMany(p => p.ChiTietChamDiems).ToList();
        var tongDiemToiDa = allChiTiets.GroupBy(c => c.TieuChi.MaTieuChi).Sum(g => (double)g.First().TieuChi.DiemToiDa);
        response.DiemTheoCLO = allChiTiets.GroupBy(c => new { MaCLO = c.TieuChi.MaCLO, c.TieuChi.TenTieuChi, c.TieuChi.DiemToiDa })
            .OrderBy(g => g.Key.MaCLO)
            .Select(g => new DiemChiTietCLODto { MaCLO = g.Key.MaCLO, TenCLO = g.Key.TenTieuChi, DiemToiDa = (double)g.Key.DiemToiDa, DiemTrungBinh = Math.Round(g.Average(x => (double)x.DiemCham), 2), TrongSo = tongDiemToiDa > 0 ? (double)g.Key.DiemToiDa / tongDiemToiDa : 0 })
            .ToList();

        // 6. Tải Giảng viên hướng dẫn
        response.TaiGiangVien = giangViens.Select(gv =>
        {
            var curCount = gv.GVHuongDans.Count(h => h.TrangThai == "DangHuongDan");
            var maxCount = Math.Max(1, gv.ChiTieuHD);
            var rate = Math.Round((double)curCount / maxCount * 100, 1);
            return new ThongKeTaiGVDto
            {
                MaGV = gv.MaGV,
                HoTen = gv.HoTen,
                ChuyenMon = gv.ChuyenMon,
                SoLuongSVHD = gv.SoLuongSVHD,
                SoLuongHienTai = curCount,
                TiLeTai = rate,
                TrangThaiTai = rate >= 100 ? "DuTai" : (rate >= 70 ? "BinhThuong" : "ConCho"),
            };
        }).OrderByDescending(g => g.TiLeTai).ToList();

        // 7. Danh sách Bảng điểm chi tiết
        response.DanhSachBangDiem = sinhViens.Select(sv =>
        {
            phieuDict.TryGetValue(sv.MaSV, out var phieu);
            daPhanCongMap.TryGetValue(sv.MaSV, out var gvName);
            var tenCongTy = sv.PhanBoThucTaps.Where(p => p.TrangThai != "Huy").OrderByDescending(p => p.NgayPhanBo).FirstOrDefault()?.CongTy?.TenCongTy ?? "Chưa phân bổ";

            double? tongDiem = phieu?.TongDiem.HasValue == true ? (double)phieu.TongDiem.Value : null;
            string xepLoai = "Chưa có";
            string ketQua = "Chưa chấm";

            if (tongDiem.HasValue)
            {
                xepLoai = ThangDiem.MoTaXepLoai((decimal)tongDiem.Value);
                ketQua = ThangDiem.QuyDoi((decimal)tongDiem.Value).Dat ? "Đạt" : "Không đạt";
            }

            // Điểm thô của từng nhóm CLO (CLO1: /2.0, CLO2: /1.0, CLO3: /2.0, CLO4: /5.0)
            double? TongNhom(string nhom)
            {
                var cts = phieu?.ChiTietChamDiems.Where(c => c.TieuChi?.NhomDanhGia != null && NhomCLO(c.MaTieuChi) == nhom).ToList();
                return cts == null || cts.Count == 0 ? null : Math.Round((double)cts.Sum(c => c.DiemCham), 2);
            }
            double? c1 = TongNhom("CLO1"), c2 = TongNhom("CLO2"), c3 = TongNhom("CLO3"), c4 = TongNhom("CLO4");

            return new SinhVienDiemCLODto
            {
                MaSV = sv.MaSV,
                HoTen = sv.HoTen,
                Lop = sv.Lop,
                TenCongTy = tenCongTy,
                TenGVHD = gvName ?? "Chưa phân công",
                DiemCLO1 = c1,
                DiemCLO2 = c2,
                DiemCLO3 = c3,
                DiemCLO4 = c4,
                TongDiem = tongDiem,
                XepLoai = xepLoai,
                KetQua = ketQua,
                NgayCham = phieu?.NgayCham,
                DiemTheoTieuChi = phieu?.ChiTietChamDiems.OrderBy(c => c.TieuChi.MaCLO).Select(c => new DiemTieuChiSinhVienDto { MaCLO = c.TieuChi.MaCLO, DiemCham = (double)c.DiemCham, DiemToiDa = (double)c.TieuChi.DiemToiDa }).ToList() ?? new(),
            };
        }).OrderBy(s => s.MaSV).ToList();

        return response;
    }

    public async Task<byte[]> ExportCsvBangDiemAsync(string? maDot)
    {
        var data = await GetBaoCaoThongKeAsync(maDot);

        var sb = new StringBuilder();
        // Ghi BOM UTF-8 để Microsoft Excel nhận diện tiếng Việt có dấu chuẩn xác
        sb.Append('\uFEFF');

        // Header thông tin đợt
        sb.AppendLine($"BÁO CÁO KẾT QUẢ ĐÁNH GIÁ CLO THỰC TẬP DOANH NGHIỆP");
        sb.AppendLine($"Đợt thực tập: {data.TenDot} (Mã: {data.MaDot})");
        sb.AppendLine($"Thời gian xuất báo cáo: {DateTime.Now:dd/MM/yyyy HH:mm}");
        sb.AppendLine();

        // Header bảng dữ liệu
        sb.AppendLine("STT,Mã sinh viên,Họ và tên,Lớp,Doanh nghiệp tiếp nhận,Giảng viên hướng dẫn,CLO1 (/2.0),CLO2 (/1.0),CLO3 (/2.0),CLO4 - Đơn vị thực tập (/5.0),Điểm tổng kết,Xếp loại,Kết quả");

        int index = 1;
        foreach (var sv in data.DanhSachBangDiem)
        {
            var c1 = sv.DiemCLO1?.ToString("F2") ?? "-";
            var c2 = sv.DiemCLO2?.ToString("F2") ?? "-";
            var c3 = sv.DiemCLO3?.ToString("F2") ?? "-";
            var c4 = sv.DiemCLO4?.ToString("F2") ?? "-";
            var tong = sv.TongDiem?.ToString("F2") ?? "-";

            // Escape dấu phẩy hoặc ngoặc kép nếu có trong tên
            var hoTen = EscapeCsv(sv.HoTen);
            var congTy = EscapeCsv(sv.TenCongTy ?? "");
            var gv = EscapeCsv(sv.TenGVHD ?? "");

            sb.AppendLine($"{index++},{sv.MaSV},{hoTen},{sv.Lop},{congTy},{gv},{c1},{c2},{c3},{c4},{tong},{sv.XepLoai},{sv.KetQua}");
        }

        sb.AppendLine();
        sb.AppendLine($"TỔNG KẾT:,Tổng số sinh viên: {data.TongQuan.TongSinhVien},Đã chấm: {data.TongQuan.DaChamCLO},Điểm trung bình CLO: {data.TongQuan.DiemTrungBinhCLO:F2},Tỷ lệ đạt: {data.TongQuan.TiLeDatCLO}%");

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    private static readonly Dictionary<string, string> TenNhomCLO = new()
    {
        ["CLO1"] = "Mục tiêu, đơn vị và vị trí thực tập",
        ["CLO2"] = "Vận dụng kiến thức và phương pháp thực hiện công việc",
        ["CLO3"] = "Yêu cầu công việc, báo cáo và thuyết trình",
        ["CLO4"] = "Đánh giá của đơn vị thực tập (Phiếu nhận xét)",
    };

    private static string? NhomCLO(string maTieuChi)
    {
        var dot = maTieuChi.IndexOf('.');
        return maTieuChi.StartsWith("CLO", StringComparison.OrdinalIgnoreCase) && dot > 0 ? maTieuChi[..dot].ToUpperInvariant() : null;
    }

    private static string EscapeCsv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }
        return value;
    }

    public async Task<IReadOnlyList<DotThucTapItemDto>> GetDanhSachDotThucTapAsync()
    {
        var dots = await _repository.GetAllDotThucTapAsync();
        return dots.Select(d => new DotThucTapItemDto
        {
            MaDot = d.MaSo,
            TenDot = d.TenDot,
            NamHoc = d.NamHoc,
            ThoiGianBD = d.ThoiGianBD,
            ThoiGianKT = d.ThoiGianKT,
            ThoiGian = $"{d.ThoiGianBD:dd/MM/yyyy} - {d.ThoiGianKT:dd/MM/yyyy}",
            TrangThai = d.TrangThai,
            LabelTrangThai = d.TrangThai switch
            {
                "DangDienRa" => "Đang diễn ra",
                "DaKetThuc" => "Đã kết thúc",
                "ChuaBatDau" => "Chưa bắt đầu",
                _ => d.TrangThai
            },
            MaRubric = d.MaRubric
        }).ToList();
    }
}
