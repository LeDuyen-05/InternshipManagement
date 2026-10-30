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
        var gvHuongDans = (await _repository.GetGVHuongDansAsync()).Where(g => g.MaDot == resolvedMaDot).ToList();
        var giangViens = await _repository.GetGiangViensKemTaiAsync();
        var tienDos = await _repository.GetTienDoThucTapsAsync(resolvedMaDot);
        var phieuDiems = await _repository.GetPhieuChamDiemsAsync(resolvedMaDot);
        var rubric = await _repository.GetTieuChisAsync(resolvedMaDot);
        var finalization = await _repository.GetChotDotAsync(resolvedMaDot);
        var nonCompletion = ((await _repository.GetKhongHoanTatAsync(resolvedMaDot)) ?? []).Select(x => x.MaSV).ToHashSet();
        CloResult Evaluation(string student, IEnumerable<InternshipManagement.DAL.Entities.ChiTietChamDiem>? details)
        {
            var result = CloResult.Evaluate(rubric, details);
            return nonCompletion.Contains(student) ? result with { Complete = false, Total = null, Status = "Không hoàn tất đợt" } : result;
        }

        var response = new ThongKeBaoCaoResponse
        {
            MaDot = resolvedMaDot,
            TenDot = tenDot,
            TrangThaiChotDot = InternshipManagement.DAL.AppDbContext.LockStatus(finalization, DateTimeOffset.UtcNow),
            PhienBanChotDot = finalization?.PhienBan ?? 0,
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

        var evaluations = phieuDict.ToDictionary(x => x.Key, x => Evaluation(x.Key, x.Value.ChiTietChamDiems));
        var daChamPhieuList = phieuDict.Values.Where(p => evaluations[p.MaSV].Complete).ToList();
        var daChamCount = daChamPhieuList.Count;
        var chuaChamCount = Math.Max(0, tongSV - daChamCount - nonCompletion.Count);

        double diemTB = 0;
        int soLuongDat = 0;
        int soLuongKhongDat = 0;

        if (daChamCount > 0)
        {
            diemTB = Math.Round((double)daChamPhieuList.Average(p => (double)evaluations[p.MaSV].Total!.Value), 2);
            soLuongDat = daChamPhieuList.Count(p => ThangDiem.QuyDoi(evaluations[p.MaSV].Total!.Value).Dat);
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
            KhongHoanTatDot = nonCompletion.Count,
            DangChamCLO = evaluations.Values.Count(x => !x.Complete && x.Status == "Chưa đủ điểm"),
            ChuaBatDauCham = Math.Max(0, chuaChamCount - evaluations.Values.Count(x => !x.Complete && x.Status == "Chưa đủ điểm")),
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
            var soLuong = daChamPhieuList.Count(p => ThangDiem.QuyDoi(evaluations[p.MaSV].Total!.Value).DiemChu == n.Chu);
            return new PhanBoDiemCLODto { XepLoai = n.Ten, KhoangDiem = n.Khoang, SoLuong = soLuong, TiLe = Math.Round((double)soLuong / totalDiem * 100, 1) };
        }).ToList();

        // Chỉ phiếu đủ rubric mới tham gia trung bình; metadata lấy từ rubric đúng đợt.
        var allChiTiets = daChamPhieuList.SelectMany(p => p.ChiTietChamDiems).ToList();
        var tongDiemToiDa = rubric.Sum(c => c.DiemToiDa);
        response.DiemTheoCLO = rubric.OrderBy(c => c.MaCLO).ThenBy(c => c.ThuTu).Select(c => new DiemChiTietCLODto {
            MaTieuChi = c.MaTieuChi, MaCLO = c.MaCLO, TenCLO = c.TenTieuChi, DiemToiDa = (double)c.DiemToiDa,
            DiemTrungBinh = Math.Round(allChiTiets.Where(x => x.MaTieuChi == c.MaTieuChi).Select(x => (double?)x.DiemCham).Average() ?? 0, 2),
            TrongSo = tongDiemToiDa > 0 ? (double)(c.DiemToiDa / tongDiemToiDa) : 0
        }).ToList();

        // 6. Tải Giảng viên hướng dẫn
        response.TaiGiangVien = giangViens.Select(gv =>
        {
            var curCount = gv.GVHuongDans.Count(h => h.TrangThai == "DangHuongDan" && (h.MaDot == resolvedMaDot || h.MaDot == null));
            var maxCount = Math.Max(0, gv.ChiTieuHD);
            var rate = maxCount > 0 ? Math.Round((double)curCount / maxCount * 100, 1) : 0;
            return new ThongKeTaiGVDto
            {
                MaGV = gv.MaGV,
                HoTen = gv.HoTen,
                ChuyenMon = gv.ChuyenMon,
                SoLuongSVHD = maxCount,
                SoLuongHienTai = curCount,
                TiLeTai = rate,
                TrangThaiTai = maxCount == 0 || rate >= 100 ? "DuTai" : (rate >= 70 ? "BinhThuong" : "ConCho"),
            };
        }).OrderByDescending(g => g.TiLeTai).ToList();

        // 7. Danh sách Bảng điểm chi tiết
        response.DanhSachBangDiem = sinhViens.Select(sv =>
        {
            phieuDict.TryGetValue(sv.MaSV, out var phieu);
            daPhanCongMap.TryGetValue(sv.MaSV, out var gvName);
            var tenCongTy = sv.PhanBoThucTaps.Where(p => p.MaDot == resolvedMaDot && p.TrangThai != "Huy" && p.DaDuocKhoaDuyet).OrderByDescending(p => p.NgayPhanBo).FirstOrDefault()?.CongTy?.TenCongTy ?? "Chưa phân bổ";

            var evaluation = Evaluation(sv.MaSV, phieu?.ChiTietChamDiems);
            double? tongDiem = evaluation.Total.HasValue ? (double)evaluation.Total.Value : null;
            var xepLoai = evaluation.Classification;
            var ketQua = evaluation.Outcome;

            // Điểm thô của từng nhóm CLO (CLO1: /2.0, CLO2: /1.0, CLO3: /2.0, CLO4: /5.0)
            double? TongNhom(string nhom)
            {
                var ids = rubric.Where(c => NhomCLO(c.MaCLO ?? c.MaTieuChi) == nhom).Select(c => c.MaTieuChi).ToHashSet();
                var cts = phieu?.ChiTietChamDiems.Where(c => ids.Contains(c.MaTieuChi)).ToList();
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
                DiemTamTinh = nonCompletion.Contains(sv.MaSV) ? null : (double)evaluation.Partial, DaDuDiem = evaluation.Complete,
                DaChamGV = evaluation.LecturerComplete, DaChamDN = evaluation.EnterpriseComplete,
                XepLoai = xepLoai,
                KetQua = ketQua,
                NgayCham = phieu?.NgayCham,
                DiemTheoTieuChi = phieu?.ChiTietChamDiems.Where(c => rubric.Any(t => t.MaTieuChi == c.MaTieuChi)).OrderBy(c => c.TieuChi.MaCLO).Select(c => new DiemTieuChiSinhVienDto { MaTieuChi = c.MaTieuChi, MaCLO = c.TieuChi.MaCLO, DiemCham = (double)c.DiemCham, DiemToiDa = (double)c.TieuChi.DiemToiDa }).ToList() ?? new(),
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
        sb.AppendLine($"Trạng thái chốt: {data.TrangThaiChotDot}; phiên bản: {data.PhienBanChotDot}. Báo cáo dữ liệu hiện hành; đối chiếu bản lưu tại quyết định chốt.");
        sb.AppendLine($"Thời gian xuất báo cáo: {DateTime.Now:dd/MM/yyyy HH:mm}");
        sb.AppendLine();

        // Header bảng dữ liệu
        sb.AppendLine("STT,Mã sinh viên,Họ và tên,Lớp,Doanh nghiệp tiếp nhận,Giảng viên hướng dẫn," + string.Join(",", data.DiemTheoCLO.Select(c => EscapeCsv($"{c.MaCLO} - {c.TenCLO} (/{c.DiemToiDa})"))) + ",Điểm tạm tính,Điểm tổng kết,Xếp loại,Kết quả");

        int index = 1;
        foreach (var sv in data.DanhSachBangDiem)
        {
            var tong = sv.TongDiem?.ToString("F2", System.Globalization.CultureInfo.InvariantCulture) ?? "-";

            // Escape dấu phẩy hoặc ngoặc kép nếu có trong tên
            var hoTen = EscapeCsv(sv.HoTen);
            var congTy = EscapeCsv(sv.TenCongTy ?? "");
            var gv = EscapeCsv(sv.TenGVHD ?? "");

            var criterionValues = string.Join(",", data.DiemTheoCLO.Select(c => sv.DiemTheoTieuChi.FirstOrDefault(d => d.MaTieuChi == c.MaTieuChi)?.DiemCham.ToString("F2", System.Globalization.CultureInfo.InvariantCulture) ?? ""));
            sb.AppendLine($"{index++},{sv.MaSV},{hoTen},{sv.Lop},{congTy},{gv},{criterionValues},{sv.DiemTamTinh?.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? ""},{tong},{sv.XepLoai},{sv.KetQua}");
        }

        sb.AppendLine();
        sb.AppendLine($"TỔNG KẾT:,Tổng số sinh viên: {data.TongQuan.TongSinhVien},Đủ điểm: {data.TongQuan.DaChamCLO},Điểm trung bình CLO: {data.TongQuan.DiemTrungBinhCLO:F2},Tỷ lệ đạt: {data.TongQuan.TiLeDatCLO}%");

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
