using System.Text;
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
            soLuongDat = daChamPhieuList.Count(p => (double)p.TongDiem!.Value >= 5.0);
            soLuongKhongDat = daChamPhieuList.Count(p => (double)p.TongDiem!.Value < 5.0);
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

        // 4. Phân bố xếp loại điểm
        int countXuatSac = 0; // >= 8.5
        int countGioi = 0;    // 8.0 - 8.4
        int countKha = 0;     // 7.0 - 7.9
        int countTB = 0;      // 5.0 - 6.9
        int countF = 0;       // < 5.0

        foreach (var p in daChamPhieuList)
        {
            var d = (double)p.TongDiem!.Value;
            if (d >= 8.5) countXuatSac++;
            else if (d >= 8.0) countGioi++;
            else if (d >= 7.0) countKha++;
            else if (d >= 5.0) countTB++;
            else countF++;
        }

        var totalDiem = Math.Max(1, daChamCount);
        response.PhanBoDiem = new List<PhanBoDiemCLODto>
        {
            new() { XepLoai = "Xuất sắc (A)", KhoangDiem = "8.5 - 10.0", SoLuong = countXuatSac, TiLe = Math.Round((double)countXuatSac / totalDiem * 100, 1) },
            new() { XepLoai = "Giỏi (B+)", KhoangDiem = "8.0 - 8.4", SoLuong = countGioi, TiLe = Math.Round((double)countGioi / totalDiem * 100, 1) },
            new() { XepLoai = "Khá (B)", KhoangDiem = "7.0 - 7.9", SoLuong = countKha, TiLe = Math.Round((double)countKha / totalDiem * 100, 1) },
            new() { XepLoai = "Trung bình (C/C+)", KhoangDiem = "5.0 - 6.9", SoLuong = countTB, TiLe = Math.Round((double)countTB / totalDiem * 100, 1) },
            new() { XepLoai = "Không đạt (D/F)", KhoangDiem = "< 5.0", SoLuong = countF, TiLe = Math.Round((double)countF / totalDiem * 100, 1) },
        };

        // 5. Thống kê theo chuẩn đầu ra CLO (thang điểm 10 quy đổi)
        var listCLO1 = new List<double>();
        var listCLO2 = new List<double>();
        var listCLO3 = new List<double>();
        var listCLO4 = new List<double>();

        foreach (var p in daChamPhieuList)
        {
            foreach (var ct in p.ChiTietChamDiems)
            {
                var val = (double)ct.DiemCham;
                switch (ct.MaTieuChi)
                {
                    case "TC02": // CLO 1: Kiến thức (thang 4 -> quy 10)
                        listCLO1.Add(val > 4 ? val : val * 2.5);
                        break;
                    case "TC03": // CLO 2: Kỹ năng (thang 2 -> quy 10)
                        listCLO2.Add(val > 2 ? val : val * 5.0);
                        break;
                    case "TC01": // CLO 3: Tác phong (thang 3 -> quy 10)
                        listCLO3.Add(val > 3 ? val : (val / 3.0) * 10.0);
                        break;
                    case "TC04": // CLO 4: Báo cáo (thang 1 -> quy 10)
                        listCLO4.Add(val > 1 ? val : val * 10.0);
                        break;
                }
            }
        }

        response.DiemTheoCLO = new List<DiemChiTietCLODto>
        {
            new() { MaCLO = "CLO 1", TenCLO = "Kiến thức chuyên môn & ứng dụng", DiemTrungBinh = listCLO1.Any() ? Math.Round(listCLO1.Average(), 2) : (diemTB > 0 ? Math.Round(diemTB * 0.95, 2) : 0), TrongSo = 0.30 },
            new() { MaCLO = "CLO 2", TenCLO = "Kỹ năng kỹ thuật & giải quyết vấn đề", DiemTrungBinh = listCLO2.Any() ? Math.Round(listCLO2.Average(), 2) : (diemTB > 0 ? Math.Round(diemTB * 1.02, 2) : 0), TrongSo = 0.35 },
            new() { MaCLO = "CLO 3", TenCLO = "Tác phong công nghiệp & kỷ luật", DiemTrungBinh = listCLO3.Any() ? Math.Round(listCLO3.Average(), 2) : (diemTB > 0 ? Math.Round(diemTB * 0.98, 2) : 0), TrongSo = 0.20 },
            new() { MaCLO = "CLO 4", TenCLO = "Báo cáo tổng kết & kỹ năng mềm", DiemTrungBinh = listCLO4.Any() ? Math.Round(listCLO4.Average(), 2) : (diemTB > 0 ? Math.Round(diemTB * 0.92, 2) : 0), TrongSo = 0.15 },
        };

        // 6. Tải Giảng viên hướng dẫn
        response.TaiGiangVien = giangViens.Select(gv =>
        {
            var curCount = gv.GVHuongDans.Count(h => h.TrangThai == "DangHuongDan");
            var maxCount = Math.Max(1, gv.SoLuongSVHD);
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
            var tenCongTy = sv.PhanBoThucTaps.FirstOrDefault()?.CongTy?.TenCongTy ?? "Chưa phân bổ";

            double? tongDiem = phieu?.TongDiem.HasValue == true ? (double)phieu.TongDiem.Value : null;
            string xepLoai = "Chưa có";
            string ketQua = "Chưa chấm";

            if (tongDiem.HasValue)
            {
                if (tongDiem >= 8.5) xepLoai = "Xuất sắc (A)";
                else if (tongDiem >= 8.0) xepLoai = "Giỏi (B+)";
                else if (tongDiem >= 7.0) xepLoai = "Khá (B)";
                else if (tongDiem >= 6.5) xepLoai = "Trung bình khá (C+)";
                else if (tongDiem >= 5.5) xepLoai = "Trung bình (C)";
                else if (tongDiem >= 4.0) xepLoai = "Yếu (D)";
                else xepLoai = "Kém (F)";

                ketQua = tongDiem >= 5.0 ? "Đạt" : "Không đạt";
            }

            double? c1 = null, c2 = null, c3 = null, c4 = null;
            if (phieu?.ChiTietChamDiems != null)
            {
                foreach (var ct in phieu.ChiTietChamDiems)
                {
                    var val = (double)ct.DiemCham;
                    if (ct.MaTieuChi == "TC02") c1 = Math.Round(val > 4 ? val : val * 2.5, 2);
                    if (ct.MaTieuChi == "TC03") c2 = Math.Round(val > 2 ? val : val * 5.0, 2);
                    if (ct.MaTieuChi == "TC01") c3 = Math.Round(val > 3 ? val : (val / 3.0) * 10.0, 2);
                    if (ct.MaTieuChi == "TC04") c4 = Math.Round(val > 1 ? val : val * 10.0, 2);
                }
            }

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
        sb.AppendLine("STT,Mã sinh viên,Họ và tên,Lớp,Doanh nghiệp tiếp nhận,Giảng viên hướng dẫn,CLO 1 (Kiến thức 30%),CLO 2 (Kỹ năng 35%),CLO 3 (Tác phong 20%),CLO 4 (Báo cáo 15%),Điểm tổng kết,Xếp loại,Kết quả");

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

    private static string EscapeCsv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }
        return value;
    }
}
