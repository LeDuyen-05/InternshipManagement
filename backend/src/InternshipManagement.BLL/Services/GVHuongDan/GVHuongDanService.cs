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

    public async Task<IReadOnlyList<SVHuongDanDto>> GetDanhSachSVTheoGiangVienAsync(string maGV, string? keyword = null)
    {
        var list = await _repository.GetDanhSachSVTheoGiangVienAsync(maGV, keyword);
        return list.Select(g => new SVHuongDanDto
        {
            MaSo = g.MaSo,
            MaSV = g.MaSinhVien,
            HoTen = g.SinhVien.HoTen,
            Lop = g.SinhVien.Lop,
            ChuyenNganh = g.SinhVien.ChuyenNganh,
            Gpa = g.SinhVien.Gpa,
            TenCongTy = g.SinhVien.PhanBoThucTaps.Where(p => p.TrangThai != "Huy").OrderByDescending(p => p.NgayPhanBo).FirstOrDefault()?.CongTy?.TenCongTy ?? "Chưa phân bổ",
            NgayPC = g.NgayPC,
            TrangThai = g.TrangThai
        }).ToList();
    }

    public async Task<IReadOnlyList<SVChuaPhanCongDto>> GetDanhSachSVChuaPhanCongAsync(string? keyword = null)
    {
        var list = await _repository.GetDanhSachSVChuaPhanCongAsync(keyword);
        var gioiThieus = await _repository.GetGioiThieuDaDuyetAsync();
        return list.Select(s =>
        {
            var pb = PhanBoHienTai(s);
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
                    : gioiThieus.Where(g => g.MaCongTy == pb.MaCongTy)
                        .Select(g => g.GiangVien?.HoTen ?? g.MaGV).Distinct().ToList()
            };
        }).ToList();
    }

    public async Task<IReadOnlyList<GiangVienTaiDto>> GetDanhSachGiangVienKemTaiAsync()
    {
        var list = await _repository.GetDanhSachGiangVienKemTaiAsync();
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
            if (string.IsNullOrWhiteSpace(request.MaGV) || string.IsNullOrWhiteSpace(request.MaSV))
                throw new ArgumentException("Mã giảng viên và mã sinh viên không được để trống.");

        var gv = await _repository.GetGiangVienByIdAsync(request.MaGV);
        if (gv == null)
            throw new KeyNotFoundException($"Không tìm thấy giảng viên có mã {request.MaGV}.");

        if (!await _repository.SinhVienTonTaiAsync(request.MaSV))
            throw new KeyNotFoundException($"Không tìm thấy sinh viên có mã {request.MaSV}.");

        var count = await _repository.CountSVHienTaiByGiangVienAsync(request.MaGV);
        var quota = gv.ChiTieuHD;
        if (count >= quota)
            throw new InvalidOperationException($"Giảng viên {gv.HoTen} đã đạt hạn ngạch tối đa ({count}/{quota} SV).");

        var daCo = await _repository.SinhVienDaCoGVHDAsync(request.MaSV);
        if (daCo)
            throw new InvalidOperationException($"Sinh viên {request.MaSV} đã được phân công Giảng viên hướng dẫn.");

        var record = await _repository.PhanCongAsync(request.MaGV, request.MaSV);

            return ToDto(record);
        });
    }

    public async Task<PhanCongHangLoatResult> PhanCongHangLoatAsync(PhanCongHangLoatRequest request)
    {
        return await _repository.ExecuteInTransactionAsync(async () =>
        {
            if (string.IsNullOrWhiteSpace(request.MaGV))
                throw new ArgumentException("Mã giảng viên không được để trống.");

        var gv = await _repository.GetGiangVienByIdAsync(request.MaGV);
        if (gv == null)
            throw new KeyNotFoundException($"Không tìm thấy giảng viên có mã {request.MaGV}.");

        var count = await _repository.CountSVHienTaiByGiangVienAsync(request.MaGV);
        var quota = gv.ChiTieuHD;
        var slotsLeft = quota - count;

        if (slotsLeft <= 0)
            throw new InvalidOperationException($"Giảng viên {gv.HoTen} đã đủ số lượng hướng dẫn tối đa.");

        var result = new PhanCongHangLoatResult();

        foreach (var maSV in request.DanhSachMaSV.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct())
        {
            if (slotsLeft <= 0)
            {
                result.KhongThanhCong.Add(new PhanCongKhongThanhCongDto { MaSV = maSV, LyDo = "Giảng viên đã đủ chỉ tiêu hướng dẫn." });
                continue;
            }

            if (!await _repository.SinhVienTonTaiAsync(maSV))
            {
                result.KhongThanhCong.Add(new PhanCongKhongThanhCongDto { MaSV = maSV, LyDo = "Không tìm thấy sinh viên." });
                continue;
            }

            var daCo = await _repository.SinhVienDaCoGVHDAsync(maSV);
            if (daCo)
            {
                result.KhongThanhCong.Add(new PhanCongKhongThanhCongDto { MaSV = maSV, LyDo = "Sinh viên đã có giảng viên hướng dẫn." });
                continue;
            }

            var record = await _repository.PhanCongAsync(request.MaGV, maSV);
            result.ThanhCong.Add(ToDto(record));

            slotsLeft--;
        }

            return result;
        });
    }

    public async Task<bool> DoiGiangVienAsync(DoiGiangVienRequest request)
    {
        return await _repository.ExecuteInTransactionAsync(async () =>
        {
        var phanCong = await _repository.GetChiTietPhanCongAsync(request.MaSo);
        if (phanCong == null)
            return false;
        if (phanCong.TrangThai != "DangHuongDan")
            throw new InvalidOperationException("Chỉ có thể đổi giảng viên cho phân công đang hoạt động.");

        var gvMoi = await _repository.GetGiangVienByIdAsync(request.MaGVMoi);
        if (gvMoi == null)
            throw new KeyNotFoundException($"Không tìm thấy giảng viên mới {request.MaGVMoi}.");

        var count = await _repository.CountSVHienTaiByGiangVienAsync(request.MaGVMoi);
        var quota = gvMoi.ChiTieuHD;
        if (count >= quota)
            throw new InvalidOperationException($"Giảng viên mới {gvMoi.HoTen} đã đạt quota tối đa.");

        return await _repository.DoiGiangVienAsync(request.MaSo, request.MaGVMoi);
        });
    }

    public async Task<bool> HuyPhanCongAsync(string maSo)
    {
        return await _repository.HuyPhanCongAsync(maSo);
    }

    public async Task<bool> CapNhatChiTieuAsync(string maGV, int soLuongMoi)
    {
        if (soLuongMoi < 0)
            throw new ArgumentException("Chỉ tiêu hướng dẫn không được nhỏ hơn 0.");

        var countHienTai = await _repository.CountSVHienTaiByGiangVienAsync(maGV);
        if (soLuongMoi < countHienTai)
            throw new InvalidOperationException($"Chỉ tiêu mới ({soLuongMoi}) không được nhỏ hơn số sinh viên hiện đang hướng dẫn ({countHienTai}).");

        return await _repository.CapNhatChiTieuAsync(maGV, soLuongMoi);
    }

    public async Task<GiangVienProfileDto?> GetProfileAsync(string maGV)
    {
        var gv = await _repository.GetGiangVienByIdAsync(maGV);
        if (gv == null) return null;

        var count = await _repository.CountSVHienTaiByGiangVienAsync(maGV);

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

    /// <summary>
    /// Đề xuất phân công tự động, mỗi SV xét lần lượt 3 mức ưu tiên:
    /// (1) Giảng viên đã giới thiệu doanh nghiệp nơi SV thực tập (GIOITHIEU đã được Khoa duyệt);
    /// (2) Giảng viên có chuyên môn trùng lĩnh vực của SV;
    /// (3) Cân bằng tải — giảng viên còn nhiều chỉ tiêu trống nhất.
    /// Không vượt chỉ tiêu hướng dẫn của bất kỳ giảng viên nào.
    /// </summary>
    public async Task<TuDongPhanCongResult> DeXuatPhanCongTuDongAsync()
    {
        var svChuaPhanCong = await _repository.GetDanhSachSVChuaPhanCongAsync();
        var dsGiangVien = await _repository.GetDanhSachGiangVienKemTaiAsync();
        var gioiThieus = await _repository.GetGioiThieuDaDuyetAsync();

        var result = new TuDongPhanCongResult { TongSoSVChuaPhanCong = svChuaPhanCong.Count };

        var conLai = dsGiangVien.ToDictionary(
            gv => gv.MaGV,
            gv => gv.ChiTieuHD - gv.GVHuongDans.Count(h => h.TrangThai == "DangHuongDan"));
        var gvTheoMa = dsGiangVien.ToDictionary(gv => gv.MaGV);
        var linhVucGV = dsGiangVien.ToDictionary(gv => gv.MaGV, gv => LinhVuc(gv.ChuyenMon));

        // SV có công ty do GV giới thiệu được xếp trước để dùng đúng chỉ tiêu của GV giới thiệu
        var thuTu = svChuaPhanCong
            .Select(sv =>
            {
                var pb = PhanBoHienTai(sv);
                var nguoiGioiThieu = pb == null
                    ? new List<string>()
                    : gioiThieus.Where(g => g.MaCongTy == pb.MaCongTy).Select(g => g.MaGV).Distinct().ToList();
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

    /// <summary>
    /// Lưu danh sách phân công nhiều SV một lần (từ đề xuất tự động; Khoa có thể đổi GV từng dòng trước khi lưu).
    /// Mỗi dòng được kiểm tra trước khi ghi nên một dòng không hợp lệ không làm hỏng các dòng còn lại.
    /// </summary>
    public async Task<PhanCongHangLoatResult> XacNhanPhanCongTuDongAsync(TuDongPhanCongConfirmRequest request)
    {
        return await _repository.ExecuteInTransactionAsync(async () =>
        {
            var result = new PhanCongHangLoatResult();
            var daXuLy = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var item in request.DanhSachPhanCong)
            {
                if (string.IsNullOrWhiteSpace(item.MaSV) || string.IsNullOrWhiteSpace(item.MaGV))
                    continue;

                string? lyDo = null;
                var gv = await _repository.GetGiangVienByIdAsync(item.MaGV);
                if (!daXuLy.Add(item.MaSV))
                    lyDo = "Sinh viên bị lặp trong danh sách.";
                else if (gv == null)
                    lyDo = $"Không tìm thấy giảng viên {item.MaGV}.";
                else if (!await _repository.SinhVienTonTaiAsync(item.MaSV))
                    lyDo = "Không tìm thấy sinh viên.";
                else if (await _repository.SinhVienDaCoGVHDAsync(item.MaSV))
                    lyDo = "Sinh viên đã có giảng viên hướng dẫn.";
                else
                {
                    var hienTai = await _repository.CountSVHienTaiByGiangVienAsync(gv.MaGV);
                    if (hienTai >= gv.ChiTieuHD)
                        lyDo = $"Giảng viên {gv.HoTen} đã đủ chỉ tiêu ({hienTai}/{gv.ChiTieuHD}).";
                }

                if (lyDo != null)
                {
                    result.KhongThanhCong.Add(new PhanCongKhongThanhCongDto { MaSV = item.MaSV, LyDo = lyDo });
                    continue;
                }

                var record = await _repository.PhanCongAsync(gv!.MaGV, item.MaSV);
                result.ThanhCong.Add(ToDto(record));
            }
            return result;
        });
    }

    private static DAL.Entities.PhanBoThucTap? PhanBoHienTai(DAL.Entities.SinhVien sv) =>
        sv.PhanBoThucTaps.Where(p => p.TrangThai != "Huy").OrderByDescending(p => p.NgayPhanBo).FirstOrDefault();

    // Nhận diện lĩnh vực chuyên môn từ văn bản tự do (chuyên môn GV / ngành, kỹ năng, công nghệ của SV)
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
        HoTen = record.SinhVien?.HoTen ?? record.MaSinhVien,
        Lop = record.SinhVien?.Lop,
        ChuyenNganh = record.SinhVien?.ChuyenNganh,
        Gpa = record.SinhVien?.Gpa,
        TenCongTy = record.SinhVien?.PhanBoThucTaps.Where(p => p.TrangThai != "Huy").OrderByDescending(p => p.NgayPhanBo).FirstOrDefault()?.CongTy?.TenCongTy ?? "Chưa phân bổ",
        NgayPC = record.NgayPC,
        TrangThai = record.TrangThai
    };
}
