using InternshipManagement.BLL.DTOs.GVHuongDan;
using InternshipManagement.BLL.DTOs.GiangVien;
using InternshipManagement.DAL.Repositories;

namespace InternshipManagement.BLL.Services.GVHuongDan;

public class GVHuongDanService : IGVHuongDanService
{
    private readonly IGVHuongDanRepository _repository;

    public GVHuongDanService(IGVHuongDanRepository repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<SVHuongDanDto>> GetDanhSachSVTheoGiangVienAsync(string maGV, string? keyword = null, string? maDot = null)
    {
        if (maDot != null) maDot = await RequireRoundAsync(maDot);
        var list = await _repository.GetDanhSachSVTheoGiangVienAsync(maGV, keyword, maDot);
        return list.Select(g => new SVHuongDanDto
        {
            MaSo = g.MaSo,
            MaSV = g.MaSinhVien,
            MaDot = g.MaDot,
            HoTen = g.SinhVien.HoTen,
            Lop = g.SinhVien.Lop,
            ChuyenNganh = g.SinhVien.ChuyenNganh,
            Gpa = g.SinhVien.Gpa,
            TenCongTy = g.SinhVien.PhanBoThucTaps.Where(p => p.MaDot == g.MaDot && p.TrangThai != "Huy").OrderByDescending(p => p.NgayPhanBo).FirstOrDefault()?.CongTy?.TenCongTy ?? "Chưa phân bổ",
            NgayPC = g.NgayPC,
            TrangThai = g.TrangThai
        }).ToList();
    }

    public async Task<IReadOnlyList<TatCaPhanCongDto>> GetTatCaPhanCongAsync(string? maDot = null)
    {
        if (maDot != null) maDot = await RequireRoundAsync(maDot);
        var list = await _repository.GetTatCaPhanCongAsync(maDot);
        return list.Select(g => new TatCaPhanCongDto
        {
            MaSo = g.MaSo,
            MaSV = g.MaSinhVien,
            MaDot = g.MaDot,
            HoTenSV = g.SinhVien?.HoTen ?? string.Empty,
            Lop = g.SinhVien?.Lop,
            ChuyenNganh = g.SinhVien?.ChuyenNganh,
            Gpa = g.SinhVien?.Gpa,
            TenCongTy = g.SinhVien?.PhanBoThucTaps?.FirstOrDefault(p => p.MaDot == g.MaDot && p.TrangThai != "Huy")?.CongTy?.TenCongTy ?? "Chưa phân bổ",
            MaGV = g.MaGiangVien,
            HoTenGV = g.GiangVien?.HoTen ?? string.Empty,
            ChuyenMonGV = g.GiangVien?.ChuyenMon,
            NgayPC = g.NgayPC,
            TrangThai = g.TrangThai
        }).ToList();
    }

    public async Task<IReadOnlyList<SVChuaPhanCongDto>> GetDanhSachSVChuaPhanCongAsync(string maDot, string? keyword = null)
    {
        maDot = await RequireRoundAsync(maDot);
        var list = await _repository.GetDanhSachSVChuaPhanCongAsync(maDot, keyword);
        var gioiThieus = await _repository.GetGiangVienGioiThieuTheoDotAsync(maDot);
        return list.Select(s =>
        {
            var pb = PhanBoHienTai(s, maDot);
            return new SVChuaPhanCongDto
            {
                MaSV = s.MaSV,
                HoTen = s.HoTen,
                Lop = s.Lop,
                ChuyenNganh = s.ChuyenNganh,
                Gpa = s.Gpa,
                TenCongTy = pb?.CongTy?.TenCongTy ?? "Chưa có công ty",
                GVGioiThieu = pb == null
                    ? new List<string>()
                    : gioiThieus.Where(g => g.MaDot == maDot && g.MaCongTy == pb.MaCongTy)
                        .Select(g => g.HoTenGV).Distinct().ToList()
            };
        }).ToList();
    }

    public async Task<IReadOnlyList<GiangVienTaiDto>> GetDanhSachGiangVienKemTaiAsync(string? maDot = null)
    {
        if (maDot != null) maDot = await RequireRoundAsync(maDot);
        var list = await _repository.GetDanhSachGiangVienKemTaiAsync(maDot);
        return list.Select(gv => new GiangVienTaiDto
        {
            MaGV = gv.MaGV,
            HoTen = gv.HoTen,
            ChuyenMon = gv.ChuyenMon,
            SoLuongHienTai = gv.GVHuongDans.Count,
            ChiTieu = gv.ChiTieuHD
        }).ToList();
    }

    public async Task<SVHuongDanDto> PhanCongDonLeAsync(PhanCongDonLeRequest request)
    {
        return await _repository.ExecuteInTransactionAsync(async () =>
        {
            var maDot = await RequireRoundAsync(request.MaDot, forWrite: true);
            if (string.IsNullOrWhiteSpace(request.MaGV) || string.IsNullOrWhiteSpace(request.MaSV))
                throw new ArgumentException("Mã giảng viên và mã sinh viên không được để trống.");

            var gv = await _repository.GetGiangVienByIdAsync(request.MaGV);
            if (gv == null)
                throw new KeyNotFoundException($"Không tìm thấy giảng viên có mã {request.MaGV}.");

            if (!await _repository.SinhVienTonTaiAsync(request.MaSV))
                throw new KeyNotFoundException($"Không tìm thấy sinh viên có mã {request.MaSV}.");

            if (!await _repository.SinhVienCoPhanBoAsync(request.MaSV, maDot))
                throw new InvalidOperationException("Sinh viên chưa có nơi thực tập còn hiệu lực trong đợt được chọn.");

            var count = await _repository.CountSVHienTaiByGiangVienAsync(request.MaGV, maDot);
            var quota = gv.ChiTieuHD;
            if (count >= quota)
                throw new InvalidOperationException($"Giảng viên {gv.HoTen} đã đạt hạn ngạch tối đa ({count}/{quota} SV).");

            var daCo = await _repository.SinhVienDaCoGVHDAsync(request.MaSV, maDot);
            if (daCo)
                throw new InvalidOperationException($"Sinh viên {request.MaSV} đã có GVHD trong đợt này hoặc có phân công cũ chưa xác định đợt.");

            var record = await _repository.PhanCongAsync(request.MaGV, request.MaSV, maDot);
            return ToDto(record);
        });
    }

    public async Task<PhanCongHangLoatResult> PhanCongHangLoatAsync(PhanCongHangLoatRequest request)
    {
        if (request.DanhSachMaSV == null || request.DanhSachMaSV.Count == 0)
            throw new ArgumentException("Vui lòng chọn ít nhất một sinh viên để phân công.");

        return await _repository.ExecuteInTransactionAsync(async () =>
        {
            var maDot = await RequireRoundAsync(request.MaDot, forWrite: true);
            if (string.IsNullOrWhiteSpace(request.MaGV))
                throw new ArgumentException("Mã giảng viên không được để trống.");

            var gv = await _repository.GetGiangVienByIdAsync(request.MaGV);
            if (gv == null)
                throw new KeyNotFoundException($"Không tìm thấy giảng viên có mã {request.MaGV}.");

            var count = await _repository.CountSVHienTaiByGiangVienAsync(request.MaGV, maDot);
            var quota = gv.ChiTieuHD;
            var slotsLeft = quota - count;

            if (slotsLeft <= 0)
                throw new InvalidOperationException($"Giảng viên {gv.HoTen} đã đủ số lượng hướng dẫn tối đa.");

            var result = new PhanCongHangLoatResult();
            var daXuLy = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var maSVInput in request.DanhSachMaSV)
            {
                var maSV = maSVInput?.Trim() ?? string.Empty;
                if (string.IsNullOrWhiteSpace(maSV) || !daXuLy.Add(maSV))
                {
                    result.KhongThanhCong.Add(new PhanCongKhongThanhCongDto
                    {
                        MaSV = maSV,
                        LyDo = string.IsNullOrWhiteSpace(maSV) ? "Mã sinh viên không được để trống." : "Sinh viên bị lặp trong danh sách."
                    });
                    continue;
                }

                if (result.ThanhCong.Count >= slotsLeft)
                {
                    result.KhongThanhCong.Add(new PhanCongKhongThanhCongDto
                    {
                        MaSV = maSV,
                        LyDo = $"Vượt quá chỉ tiêu còn lại của giảng viên ({slotsLeft} chỗ)."
                    });
                    continue;
                }

                if (!await _repository.SinhVienTonTaiAsync(maSV))
                {
                    result.KhongThanhCong.Add(new PhanCongKhongThanhCongDto
                    {
                        MaSV = maSV,
                        LyDo = "Không tìm thấy sinh viên."
                    });
                    continue;
                }

                if (!await _repository.SinhVienCoPhanBoAsync(maSV, maDot))
                {
                    result.KhongThanhCong.Add(new PhanCongKhongThanhCongDto
                    {
                        MaSV = maSV,
                        LyDo = "Sinh viên chưa có nơi thực tập còn hiệu lực trong đợt được chọn."
                    });
                    continue;
                }

                if (await _repository.SinhVienDaCoGVHDAsync(maSV, maDot))
                {
                    result.KhongThanhCong.Add(new PhanCongKhongThanhCongDto
                    {
                        MaSV = maSV,
                        LyDo = "Sinh viên đã có GVHD trong đợt này hoặc có phân công cũ chưa xác định đợt."
                    });
                    continue;
                }

                var record = await _repository.PhanCongAsync(request.MaGV, maSV, maDot);
                result.ThanhCong.Add(ToDto(record));
            }

            return result;
        });
    }

    public async Task<bool> HuyPhanCongAsync(string maSo, string maDot)
    {
        return await _repository.ExecuteInTransactionAsync(async () =>
        {
            maDot = await RequireRoundAsync(maDot, forWrite: true);
            var current = await _repository.GetChiTietPhanCongAsync(maSo);
            if (current == null) return false;
            EnsureAssignmentRound(current, maDot);
            return await _repository.HuyPhanCongAsync(maSo);
        });
    }

    public async Task<bool> DoiGiangVienAsync(DoiGiangVienRequest request)
    {
        return await _repository.ExecuteInTransactionAsync(async () =>
        {
            var maDot = await RequireRoundAsync(request.MaDot, forWrite: true);
            var current = await _repository.GetChiTietPhanCongAsync(request.MaSo);
            if (current == null) return false;
            EnsureAssignmentRound(current, maDot);
            if (current.MaGiangVien == request.MaGVMoi) return true;
            if (!await _repository.SinhVienCoPhanBoAsync(current.MaSinhVien, maDot))
                throw new InvalidOperationException("Sinh viên không còn nơi thực tập hợp lệ trong đợt được chọn.");
            var gvMoi = await _repository.GetGiangVienByIdAsync(request.MaGVMoi);
            if (gvMoi == null)
                throw new KeyNotFoundException($"Không tìm thấy giảng viên mới {request.MaGVMoi}.");

            var count = await _repository.CountSVHienTaiByGiangVienAsync(request.MaGVMoi, maDot);
            if (count >= gvMoi.ChiTieuHD)
                throw new InvalidOperationException($"Giảng viên {gvMoi.HoTen} đã đạt hạn ngạch tối đa.");

            return await _repository.DoiGiangVienAsync(request.MaSo, request.MaGVMoi);
        });
    }

    public async Task<bool> CapNhatChiTieuAsync(string maGV, int soLuongMoi)
    {
        return await _repository.ExecuteInTransactionAsync(async () =>
        {
            if (soLuongMoi < 0)
                throw new ArgumentException("Chỉ tiêu hướng dẫn không được âm.");
            return await _repository.CapNhatChiTieuAsync(maGV, soLuongMoi);
        });
    }

    public async Task<GiangVienProfileDto?> GetProfileAsync(string maGV)
    {
        var gv = await _repository.GetGiangVienByIdAsync(maGV);
        if (gv == null) return null;

        var count = await _repository.CountSVHienTaiByGiangVienAsync(maGV, null);

        return new GiangVienProfileDto
        {
            MaGV = gv.MaGV,
            HoTen = gv.HoTen,
            ChuyenMon = gv.ChuyenMon,
            SoLuongSVHD = gv.SoLuongSVHD,
            SoLuongDangHuongDan = count,
            BoMon = "Công nghệ phần mềm",
            HocVi = "Thạc sĩ"
        };
    }

    public async Task<bool> UpdateProfileAsync(string maGV, UpdateGiangVienProfileRequest request)
    {
        var gv = await _repository.GetGiangVienByIdAsync(maGV);
        if (gv == null) return false;

        return await _repository.UpdateGiangVienChuyenMonAsync(maGV, request.ChuyenMon);
    }

    public async Task<TuDongPhanCongResult> DeXuatPhanCongTuDongAsync(string maDot, IReadOnlyCollection<string>? maSV = null)
    {
        maDot = await RequireRoundAsync(maDot, forWrite: true);
        var candidates = await _repository.GetDanhSachSVChuaPhanCongAsync(maDot, null);
        var selectedStudents = maSV?.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var svChuaPhanCong = candidates.Where(sv => PhanBoHienTai(sv, maDot) != null
            && (selectedStudents == null || selectedStudents.Contains(sv.MaSV))).ToList();
        var dsGiangVien = await _repository.GetDanhSachGiangVienKemTaiAsync(maDot);
        var gioiThieus = await _repository.GetGiangVienGioiThieuTheoDotAsync(maDot);

        var result = new TuDongPhanCongResult { MaDot = maDot, TongSoSVChuaPhanCong = svChuaPhanCong.Count };

        var conLai = dsGiangVien.ToDictionary(
            gv => gv.MaGV,
            gv => gv.ChiTieuHD - gv.GVHuongDans.Count(h => h.TrangThai == "DangHuongDan" && (h.MaDot == maDot || h.MaDot == null)));
        var gvTheoMa = dsGiangVien.ToDictionary(gv => gv.MaGV);
        var linhVucGV = dsGiangVien.ToDictionary(gv => gv.MaGV, gv => LinhVuc(gv.ChuyenMon));

        var thuTu = svChuaPhanCong
            .Select(sv =>
            {
                var pb = PhanBoHienTai(sv, maDot);
                var nguoiGioiThieu = pb == null
                    ? new List<string>()
                    : gioiThieus.Where(g => g.MaDot == maDot && g.MaCongTy == pb.MaCongTy).Select(g => g.MaGV).Distinct().ToList();
                return (SinhVien: sv, PhanBo: pb, NguoiGioiThieu: nguoiGioiThieu);
            })
            .OrderByDescending(x => x.NguoiGioiThieu.Count > 0)
            .ThenByDescending(x => x.PhanBo != null)
            .ThenBy(x => x.SinhVien.MaSV)
            .ToList();

        foreach (var x in thuTu)
        {
            var sv = x.SinhVien;
            var tenCongTy = x.PhanBo?.CongTy?.TenCongTy;
            string? maGV = null;
            var lyDo = string.Empty;
            var mucUuTien = 0;

            var gvGioiThieu = x.NguoiGioiThieu
                .Where(m => conLai.GetValueOrDefault(m) > 0)
                .OrderByDescending(m => conLai[m])
                .ThenBy(m => m)
                .FirstOrDefault();
            if (gvGioiThieu != null)
            {
                maGV = gvGioiThieu;
                mucUuTien = 1;
                lyDo = $"GV giới thiệu doanh nghiệp {tenCongTy}";
            }
            else
            {
                var linhVucSV = LinhVuc($"{sv.ChuyenNganh} {sv.KyNang} {sv.CongNghe}");
                var phuHop = conLai
                    .Where(kv => kv.Value > 0)
                    .Select(kv => (MaGV: kv.Key, Trung: linhVucGV[kv.Key].Intersect(linhVucSV).ToList(), ConLai: kv.Value))
                    .Where(c => c.Trung.Count > 0)
                    .OrderByDescending(c => c.Trung.Count)
                    .ThenByDescending(c => c.ConLai)
                    .ThenBy(c => c.MaGV)
                    .FirstOrDefault();
                if (phuHop.MaGV != null)
                {
                    maGV = phuHop.MaGV;
                    mucUuTien = 2;
                    lyDo = $"Phù hợp chuyên môn ({string.Join(", ", phuHop.Trung)})";
                }
                else
                {
                    maGV = conLai.Where(kv => kv.Value > 0)
                        .OrderByDescending(kv => (double)kv.Value / Math.Max(1, gvTheoMa[kv.Key].ChiTieuHD))
                        .ThenBy(kv => kv.Key)
                        .Select(kv => kv.Key)
                        .FirstOrDefault();
                    mucUuTien = 3;
                    lyDo = "Cân bằng chỉ tiêu giảng viên";
                }
            }

            if (maGV == null)
            {
                result.SinhVienChuaTheGhep.Add($"{sv.MaSV} - {sv.HoTen} (Hết chỉ tiêu toàn Khoa)");
                continue;
            }

            var gv = gvTheoMa[maGV];
            result.DanhSachDeXuat.Add(new TuDongPhanCongPreviewItem
            {
                MaSV = sv.MaSV,
                HoTenSV = sv.HoTen,
                Lop = sv.Lop ?? string.Empty,
                TenCongTy = tenCongTy ?? "Chưa phân bổ",
                MaGV = gv.MaGV,
                HoTenGV = gv.HoTen,
                ChuyenMonGV = gv.ChuyenMon ?? string.Empty,
                LyDoGhep = lyDo,
                MucUuTien = mucUuTien
            });
            conLai[maGV]--;
        }

        result.SoLuongGhepThanhCong = result.DanhSachDeXuat.Count;
        result.SoLuongKhongTheGhep = result.SinhVienChuaTheGhep.Count;
        return result;
    }

    public async Task<PhanCongHangLoatResult> XacNhanPhanCongTuDongAsync(TuDongPhanCongConfirmRequest request)
    {
        if (request.DanhSachPhanCong == null || request.DanhSachPhanCong.Count == 0)
            throw new ArgumentException("Vui lòng chọn ít nhất một sinh viên để phân công.");

        return await _repository.ExecuteInTransactionAsync(async () =>
        {
            var maDot = await RequireRoundAsync(request.MaDot, forWrite: true);
            var result = new PhanCongHangLoatResult();
            var daXuLy = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var item in request.DanhSachPhanCong)
            {
                var maSV = item?.MaSV?.Trim() ?? string.Empty;
                var maGV = item?.MaGV?.Trim() ?? string.Empty;
                if (string.IsNullOrWhiteSpace(maSV) || string.IsNullOrWhiteSpace(maGV))
                {
                    result.KhongThanhCong.Add(new PhanCongKhongThanhCongDto
                    {
                        MaSV = maSV,
                        LyDo = "Mã sinh viên và mã giảng viên không được để trống."
                    });
                    continue;
                }

                string? lyDo = null;
                var gv = await _repository.GetGiangVienByIdAsync(maGV);
                if (!string.IsNullOrWhiteSpace(item!.MaDot) && !string.Equals(item.MaDot.Trim(), maDot, StringComparison.OrdinalIgnoreCase))
                    lyDo = "Đợt của sinh viên không khớp đợt đang xác nhận.";
                else if (!daXuLy.Add(maSV))
                    lyDo = "Sinh viên bị lặp trong danh sách.";
                else if (gv == null)
                    lyDo = $"Không tìm thấy giảng viên {maGV}.";
                else if (!await _repository.SinhVienTonTaiAsync(maSV))
                    lyDo = "Không tìm thấy sinh viên.";
                else if (!await _repository.SinhVienCoPhanBoAsync(maSV, maDot))
                    lyDo = "Sinh viên chưa có nơi thực tập còn hiệu lực trong đợt được chọn.";
                else if (await _repository.SinhVienDaCoGVHDAsync(maSV, maDot))
                    lyDo = "Sinh viên đã có GVHD trong đợt này hoặc có phân công cũ chưa xác định đợt.";
                else
                {
                    var hienTai = await _repository.CountSVHienTaiByGiangVienAsync(gv.MaGV, maDot);
                    if (hienTai >= gv.ChiTieuHD)
                        lyDo = $"Giảng viên {gv.HoTen} đã đủ chỉ tiêu ({hienTai}/{gv.ChiTieuHD}).";
                }

                if (lyDo != null)
                {
                    result.KhongThanhCong.Add(new PhanCongKhongThanhCongDto { MaSV = maSV, LyDo = lyDo });
                    continue;
                }

                var record = await _repository.PhanCongAsync(gv!.MaGV, maSV, maDot);
                result.ThanhCong.Add(ToDto(record));
            }
            return result;
        });
    }

    private static DAL.Entities.PhanBoThucTap? PhanBoHienTai(DAL.Entities.SinhVien sv, string maDot) =>
        sv.PhanBoThucTaps.Where(p => p.MaDot == maDot && p.TrangThai != "Huy" && p.DaDuocKhoaDuyet).OrderByDescending(p => p.NgayPhanBo).FirstOrDefault();

    private async Task<string> RequireRoundAsync(string maDot, bool forWrite = false)
    {
        if (string.IsNullOrWhiteSpace(maDot))
            throw new ArgumentException("Vui lòng chọn đợt thực tập.");
        var dot = await _repository.GetDotThucTapAsync(maDot.Trim())
            ?? throw new KeyNotFoundException("Không tìm thấy đợt thực tập được chọn.");
        if (forWrite && dot.TrangThai is not ("ChuaBatDau" or "DangDienRa"))
            throw new InvalidOperationException("Đợt thực tập đã đóng, không thể thay đổi phân công.");
        return dot.MaSo;
    }

    private static void EnsureAssignmentRound(DAL.Entities.GVHuongDan assignment, string maDot)
    {
        if (assignment.MaDot != maDot)
            throw new InvalidOperationException("Phân công không thuộc đợt được chọn hoặc chưa xác định được đợt cũ.");
        if (assignment.TrangThai != "DangHuongDan")
            throw new InvalidOperationException("Phân công không còn hoạt động.");
    }

    private static readonly (string LinhVuc, string[] TuKhoa)[] BangLinhVuc =
    {
        ("Web", new[] { "web", "react", "vue", "angular", "node", "php", "frontend", "fullstack", "spring", "javascript", "typescript" }),
        ("AI", new[] { "trí tuệ nhân tạo", "machine learning", "học máy", "deep learning", "nlp", "ngôn ngữ tự nhiên", "pytorch", "tensorflow", "thị giác", "llm", " ai " }),
        ("Dữ liệu", new[] { "dữ liệu", "data", "etl", "airflow", "pandas", "phân tích" }),
        ("Di động", new[] { "di động", "mobile", "flutter", "kotlin", "android", "ios", "swift" }),
        ("An toàn thông tin", new[] { "an toàn", "bảo mật", "security", "pentest", "thâm nhập", "wireshark", "mạng" }),
        ("DevOps/Cloud", new[] { "devops", "cloud", "docker", "ci/cd", "aws", "azure", "kubernetes" }),
        ("Kiểm thử", new[] { "kiểm thử", "testing", "selenium", " qa", "automation" }),
        ("Hệ thống thông tin", new[] { "hệ thống thông tin", "erp" }),
        ("Công nghệ phần mềm", new[] { "phần mềm", "backend", "api", "java", ".net", "c#" }),
    };

    private static HashSet<string> LinhVuc(string? text)
    {
        var t = " " + (text ?? string.Empty).ToLowerInvariant() + " ";
        return BangLinhVuc.Where(x => x.TuKhoa.Any(k => t.Contains(k))).Select(x => x.LinhVuc).ToHashSet();
    }

    private static SVHuongDanDto ToDto(DAL.Entities.GVHuongDan record) => new()
    {
        MaSo = record.MaSo,
        MaSV = record.MaSinhVien,
        MaDot = record.MaDot,
        HoTen = record.SinhVien?.HoTen ?? record.MaSinhVien,
        Lop = record.SinhVien?.Lop,
        ChuyenNganh = record.SinhVien?.ChuyenNganh,
        Gpa = record.SinhVien?.Gpa,
        TenCongTy = record.SinhVien?.PhanBoThucTaps.Where(p => p.MaDot == record.MaDot && p.TrangThai != "Huy").OrderByDescending(p => p.NgayPhanBo).FirstOrDefault()?.CongTy?.TenCongTy ?? "Chưa phân bổ",
        NgayPC = record.NgayPC,
        TrangThai = record.TrangThai
    };
}
