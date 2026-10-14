using InternshipManagement.BLL.DTOs.HoSoNangLuc;
using InternshipManagement.BLL.Exceptions;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;

namespace InternshipManagement.BLL.Services.HoSoNangLuc;

public class HoSoNangLucService : IHoSoNangLucService
{
    private readonly IHoSoNangLucRepository _hoSoRepository;
    private readonly ISinhVienRepository _sinhVienRepository;

    public HoSoNangLucService(
        IHoSoNangLucRepository hoSoRepository,
        ISinhVienRepository sinhVienRepository)
    {
        _hoSoRepository = hoSoRepository;
        _sinhVienRepository = sinhVienRepository;
    }

    public async Task<HoSoNangLucDto?> GetHoSoBySinhVienAsync(string maSV)
    {
        var sv = await _sinhVienRepository.GetByIdAsync(maSV);
        if (sv == null) return null;

        var hoSo = await _hoSoRepository.GetByMaSinhVienAsync(maSV);

        return new HoSoNangLucDto
        {
            MaHoSo = hoSo?.MaHoSo ?? $"HS_{sv.MaSV}",
            MaSinhVien = sv.MaSV,
            HoTen = sv.HoTen,
            Lop = sv.Lop,
            KhoaHoc = sv.KhoaHoc,
            Gpa = sv.Gpa.HasValue ? (double)sv.Gpa.Value : null,
            KyNang = sv.KyNang,

            ChuyenNganh = sv.ChuyenNganh,
            CongNghe = sv.CongNghe,
            DuAnDaThucHien = sv.DuAnDaThucHien,
            NDHoSo = hoSo?.NDHoSo,
            FileCV = hoSo?.FileCV,
            NgayCapNhat = hoSo?.NgayCapNhat ?? DateTime.Now
        };
    }

    private static string BuildProfileText(DAL.Entities.SinhVien s) => string.Join(". ", new[]
    {
        s.ChuyenNganh,
        s.KyNang is null ? null : $"Kỹ năng: {s.KyNang}",
        s.CongNghe is null ? null : $"Công nghệ: {s.CongNghe}",
        s.DuAnDaThucHien is null ? null : $"Dự án: {s.DuAnDaThucHien}"
    }.Where(x => !string.IsNullOrWhiteSpace(x)));

    public async Task<HoSoNangLucDto> UpdateHoSoAsync(string maSV, UpdateHoSoNangLucRequest request)
    {
        var sv = await _sinhVienRepository.GetByIdAsync(maSV)
            ?? throw new NotFoundException("SinhVien", maSV);

        if (string.IsNullOrWhiteSpace(request.HoTen))
            throw new ArgumentException("Họ tên sinh viên không được để trống.");

        if (request.Gpa.HasValue && (request.Gpa.Value < 0 || request.Gpa.Value > 4.0))
            throw new ArgumentException("Điểm GPA phải nằm trong khoảng từ 0.0 đến 4.0.");

        if (!string.IsNullOrWhiteSpace(request.FileCV))
        {
            if (!Uri.TryCreate(request.FileCV, UriKind.Absolute, out var u) || (u.Scheme != "http" && u.Scheme != "https"))
            {
                throw new ArgumentException("Đường dẫn FileCV phải là URL hợp lệ (bắt đầu bằng http:// hoặc https://).");
            }
        }

        if (request.Lop?.Length > 50) throw new ArgumentException("Lớp không được vượt quá 50 ký tự.");
        if (request.KhoaHoc?.Length > 20) throw new ArgumentException("Khóa học không được vượt quá 20 ký tự.");
        if (request.CongNghe?.Length > 500) throw new ArgumentException("Công nghệ không được vượt quá 500 ký tự.");
        if (request.KyNang?.Length > 500) throw new ArgumentException("Kỹ năng không được vượt quá 500 ký tự.");
        if (request.DuAnDaThucHien?.Length > 1000) throw new ArgumentException("Dự án đã thực hiện không được vượt quá 1000 ký tự.");

        sv.HoTen = request.HoTen.Trim();
        if (request.Lop != null) sv.Lop = string.IsNullOrWhiteSpace(request.Lop) ? null : request.Lop.Trim();
        if (request.KhoaHoc != null) sv.KhoaHoc = string.IsNullOrWhiteSpace(request.KhoaHoc) ? null : request.KhoaHoc.Trim();
        sv.Gpa = request.Gpa.HasValue ? (decimal)request.Gpa.Value : null;
        if (request.KyNang != null) sv.KyNang = string.IsNullOrWhiteSpace(request.KyNang) ? null : request.KyNang.Trim();
        if (request.ChuyenNganh != null) sv.ChuyenNganh = string.IsNullOrWhiteSpace(request.ChuyenNganh) ? null : request.ChuyenNganh.Trim();
        if (request.CongNghe != null) sv.CongNghe = string.IsNullOrWhiteSpace(request.CongNghe) ? null : request.CongNghe.Trim();
        if (request.DuAnDaThucHien != null) sv.DuAnDaThucHien = string.IsNullOrWhiteSpace(request.DuAnDaThucHien) ? null : request.DuAnDaThucHien.Trim();

        _sinhVienRepository.Update(sv);
        await _sinhVienRepository.SaveChangesAsync();

        var hoSo = await _hoSoRepository.GetByMaSinhVienAsync(maSV);
        var profileText = string.IsNullOrWhiteSpace(request.NDHoSo) ? BuildProfileText(sv) : request.NDHoSo.Trim();
        if (string.IsNullOrWhiteSpace(profileText)) profileText = $"{sv.HoTen} - {sv.ChuyenNganh}";

        if (hoSo == null)
        {
            hoSo = new DAL.Entities.HoSoNangLuc
            {
                MaHoSo = "HS_" + sv.MaSV,
                MaSV = sv.MaSV,
                NDHoSo = profileText,
                FileCV = request.FileCV?.Trim(),
                NgayCapNhat = DateTime.Now
            };
            await _hoSoRepository.AddAsync(hoSo);
        }
        else
        {
            hoSo.NDHoSo = profileText;
            if (request.FileCV != null) hoSo.FileCV = string.IsNullOrWhiteSpace(request.FileCV) ? null : request.FileCV.Trim();
            hoSo.NgayCapNhat = DateTime.Now;
            _hoSoRepository.Update(hoSo);
        }

        await _hoSoRepository.SaveChangesAsync();

        return new HoSoNangLucDto
        {
            MaHoSo = hoSo.MaHoSo,
            MaSinhVien = sv.MaSV,
            HoTen = sv.HoTen,
            Lop = sv.Lop,
            KhoaHoc = sv.KhoaHoc,
            Gpa = sv.Gpa.HasValue ? (double)sv.Gpa.Value : null,
            KyNang = sv.KyNang,
            ChuyenNganh = sv.ChuyenNganh,
            CongNghe = sv.CongNghe,
            DuAnDaThucHien = sv.DuAnDaThucHien,
            NDHoSo = hoSo.NDHoSo,
            FileCV = hoSo.FileCV,
            NgayCapNhat = hoSo.NgayCapNhat
        };
    }
}
