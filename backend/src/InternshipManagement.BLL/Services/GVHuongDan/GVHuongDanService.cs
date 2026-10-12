using InternshipManagement.BLL.DTOs.GVHuongDan;
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
