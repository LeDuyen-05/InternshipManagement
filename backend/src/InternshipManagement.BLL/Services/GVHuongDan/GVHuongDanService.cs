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
            TenCongTy = g.SinhVien.PhanBoThucTaps.FirstOrDefault()?.CongTy?.TenCongTy ?? "Chưa phân bổ",
            NgayPC = g.NgayPC,
            TrangThai = g.TrangThai
        }).ToList();
    }

    public async Task<IReadOnlyList<SVChuaPhanCongDto>> GetDanhSachSVChuaPhanCongAsync(string? keyword = null)
    {
        var list = await _repository.GetDanhSachSVChuaPhanCongAsync(keyword);
        return list.Select(s => new SVChuaPhanCongDto
        {
            MaSV = s.MaSV,
            HoTen = s.HoTen,
            Lop = s.Lop,
            ChuyenNganh = s.ChuyenNganh,
            Gpa = s.Gpa,
            TenCongTy = s.PhanBoThucTaps.FirstOrDefault()?.CongTy?.TenCongTy ?? "Chưa có công ty"
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
            SoLuongSVHD = gv.SoLuongSVHD
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
        var quota = gv.SoLuongSVHD;
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
        var quota = gv.SoLuongSVHD;
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
        var quota = gvMoi.SoLuongSVHD;
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
            Email = $"{gv.MaGV.ToLower()}@huit.edu.vn",
            SoDienThoai = "028.3816.1673",
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

    public async Task<TuDongPhanCongResult> DeXuatPhanCongTuDongAsync()
    {
        var svChuaPhanCong = await _repository.GetDanhSachSVChuaPhanCongAsync();
        var dsGiangVien = await _repository.GetDanhSachGiangVienKemTaiAsync();

        // Tính số slot còn trống của từng GV
        var gvSlots = dsGiangVien.Select(gv => new
        {
            GiangVien = gv,
            AvailableSlots = gv.SoLuongSVHD - gv.GVHuongDans.Count(h => h.TrangThai == "DangHuongDan"),
            CurrentLoad = gv.GVHuongDans.Count(h => h.TrangThai == "DangHuongDan")
        })
        .Where(x => x.AvailableSlots > 0)
        .ToList();

        var result = new TuDongPhanCongResult
        {
            TongSoSVChuaPhanCong = svChuaPhanCong.Count
        };

        if (svChuaPhanCong.Count == 0 || gvSlots.Count == 0)
        {
            result.SoLuongKhongTheGhep = svChuaPhanCong.Count;
            result.SinhVienChuaTheGhep = svChuaPhanCong.Select(s => $"{s.MaSV} - {s.HoTen}").ToList();
            return result;
        }

        // Tạo bản đồ theo dõi số slot còn lại trong quá trình ghép
        var remainingCapacity = gvSlots.ToDictionary(x => x.GiangVien.MaGV, x => x.AvailableSlots);

        foreach (var sv in svChuaPhanCong)
        {
            var tenCongTy = sv.PhanBoThucTaps.FirstOrDefault()?.CongTy?.TenCongTy;
            string? matchedMaGV = null;
            string lyDo = "Cân bằng tải ngẫu nhiên";

            // Bước 1: Ưu tiên trùng khớp Chuyên môn ngành học
            var svMajor = sv.ChuyenNganh ?? sv.Lop ?? string.Empty;
            var bestMatchGv = gvSlots
                .Where(x => remainingCapacity[x.GiangVien.MaGV] > 0)
                .FirstOrDefault(x => !string.IsNullOrEmpty(x.GiangVien.ChuyenMon) &&
                                     !string.IsNullOrEmpty(svMajor) &&
                                     (x.GiangVien.ChuyenMon.Contains(svMajor, StringComparison.OrdinalIgnoreCase) ||
                                      svMajor.Contains(x.GiangVien.ChuyenMon, StringComparison.OrdinalIgnoreCase)));

            if (bestMatchGv != null)
            {
                matchedMaGV = bestMatchGv.GiangVien.MaGV;
                lyDo = $"Phù hợp chuyên môn ({bestMatchGv.GiangVien.ChuyenMon})";
            }
            else
            {
                // Bước 2: Cân bằng tải - Chọn giảng viên có số slot còn trống nhiều nhất
                var leastLoaded = gvSlots
                    .Where(x => remainingCapacity[x.GiangVien.MaGV] > 0)
                    .OrderByDescending(x => remainingCapacity[x.GiangVien.MaGV])
                    .FirstOrDefault();

                if (leastLoaded != null)
                {
                    matchedMaGV = leastLoaded.GiangVien.MaGV;
                    lyDo = "Cân bằng chỉ tiêu giảng viên";
                }
            }

            if (matchedMaGV != null)
            {
                var gvEntity = gvSlots.First(x => x.GiangVien.MaGV == matchedMaGV).GiangVien;
                result.DanhSachDeXuat.Add(new TuDongPhanCongPreviewItem
                {
                    MaSV = sv.MaSV,
                    HoTenSV = sv.HoTen,
                    Lop = sv.Lop ?? "CNTT",
                    TenCongTy = tenCongTy ?? "Chưa phân bổ",
                    MaGV = gvEntity.MaGV,
                    HoTenGV = gvEntity.HoTen,
                    ChuyenMonGV = gvEntity.ChuyenMon ?? "Chung",
                    LyDoGhep = lyDo
                });

                remainingCapacity[matchedMaGV]--;
            }
            else
            {
                result.SinhVienChuaTheGhep.Add($"{sv.MaSV} - {sv.HoTen} (Hết chỉ tiêu toàn Khoa)");
            }
        }

        result.SoLuongGhepThanhCong = result.DanhSachDeXuat.Count;
        result.SoLuongKhongTheGhep = result.SinhVienChuaTheGhep.Count;

        return result;
    }

    public async Task<PhanCongHangLoatResult> XacNhanPhanCongTuDongAsync(TuDongPhanCongConfirmRequest request)
    {
        var finalResult = new PhanCongHangLoatResult();

        return await _repository.ExecuteInTransactionAsync(async () =>
        {
            foreach (var item in request.DanhSachPhanCong)
            {
                try
                {
                    var entity = await _repository.PhanCongAsync(item.MaGV, item.MaSV);
                    finalResult.ThanhCong.Add(ToDto(entity));
                }
                catch (Exception ex)
                {
                    finalResult.KhongThanhCong.Add(new PhanCongKhongThanhCongDto
                    {
                        MaSV = item.MaSV,
                        LyDo = ex.Message
                    });
                }
            }
            return finalResult;
        });
    }

    private static SVHuongDanDto ToDto(DAL.Entities.GVHuongDan record) => new()
    {
        MaSo = record.MaSo,
        MaSV = record.MaSinhVien,
        HoTen = record.SinhVien?.HoTen ?? record.MaSinhVien,
        Lop = record.SinhVien?.Lop,
        ChuyenNganh = record.SinhVien?.ChuyenNganh,
        Gpa = record.SinhVien?.Gpa,
        TenCongTy = record.SinhVien?.PhanBoThucTaps.FirstOrDefault()?.CongTy?.TenCongTy ?? "Chưa phân bổ",
        NgayPC = record.NgayPC,
        TrangThai = record.TrangThai
    };
}
