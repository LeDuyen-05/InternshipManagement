using InternshipManagement.BLL.DTOs.GioiThieu;
using InternshipManagement.BLL.Exceptions;
using InternshipManagement.BLL.Validators.GioiThieu;
using InternshipManagement.DAL.Entities;
using InternshipManagement.DAL.Repositories;

namespace InternshipManagement.BLL.Services.GioiThieu;

public class GioiThieuService : IGioiThieuService
{
    private readonly IGioiThieuRepository _repository;
    private readonly CreateGioiThieuValidator _validator;

    public GioiThieuService(IGioiThieuRepository repository, CreateGioiThieuValidator validator)
    {
        _repository = repository;
        _validator = validator;
    }

    public async Task<IReadOnlyList<GioiThieuDto>> GetAllAsync()
    {
        var list = await _repository.GetWithDetailsAsync();
        return list.Select(ToDto).ToList();
    }

    public async Task<IReadOnlyList<GioiThieuDto>> GetByGiangVienAsync(string maGV)
    {
        var list = await _repository.GetByGiangVienAsync(maGV);
        return list.Select(ToDto).ToList();
    }

    public async Task<GioiThieuDto?> GetByIdAsync(string maSo)
    {
        var entity = await _repository.GetByIdAsync(maSo);
        return entity is null ? null : ToDto(entity);
    }

    public async Task<GioiThieuDto> CreateAsync(CreateGioiThieuDto dto)
    {
        var errors = _validator.Validate(dto);
        if (errors.Count > 0)
            throw new ArgumentException(string.Join(" ", errors));

        if (!await _repository.ExistsGiangVienAsync(dto.MaGV))
            throw new ArgumentException($"Giảng viên {dto.MaGV} không tồn tại.");

        var congTy = await _repository.GetCongTyByIdAsync(dto.MaCongTy);
        if (congTy == null)
            throw new ArgumentException($"Công ty {dto.MaCongTy} không tồn tại.");

        if (await _repository.ExistsAsync(dto.MaGV, dto.MaCongTy))
            throw new InvalidOperationException($"Giảng viên đã giới thiệu công ty '{congTy.TenCongTy}' trước đó.");

        var maSo = DAL.Common.IdGenerator.New("GT");

        var entity = new InternshipManagement.DAL.Entities.GioiThieu
        {
            MaSo = maSo,
            MaGV = dto.MaGV,
            MaCongTy = dto.MaCongTy,
            NgayGioiThieu = DateTime.Now,
            TrangThaiKetNoi = "DangXem"
        };

        await _repository.AddAsync(entity);
        await _repository.SaveChangesAsync();

        var reloaded = await _repository.GetByIdWithDetailsAsync(maSo);
        return ToDto(reloaded ?? entity);
    }

    public async Task<GioiThieuDto> DeXuatMoiAsync(CreateDeXuatCongTyDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.MaGV))
            throw new ArgumentException("Mã giảng viên không được để trống.");

        if (string.IsNullOrWhiteSpace(dto.TenCongTy))
            throw new ArgumentException("Tên công ty không được để trống.");

        var isDuplicate = await _repository.ExistsCongTyByNameAsync(dto.TenCongTy);
        if (isDuplicate)
            throw new ArgumentException($"Doanh nghiệp \"{dto.TenCongTy.Trim()}\" đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.");

        var maCongTy = DAL.Common.IdGenerator.New("CT");

        var congTyMoi = new CongTy
        {
            MaCongTy = maCongTy,
            TenCongTy = dto.TenCongTy.Trim(),
            ViTriTuyen = dto.ViTriTuyen?.Trim(),
            ThoiGian = dto.ThoiGian?.Trim(),
            SoLuongNhan = dto.SoLuongNhan > 0 ? dto.SoLuongNhan : 1,
            YeuCau = dto.YeuCau?.Trim(),
            TrangThai = "ChoDuyet"
        };

        var gioiThieu = await _repository.DeXuatCongTyMoiAsync(dto.MaGV, congTyMoi);
        return ToDto(gioiThieu);
    }

    public async Task UpdateTrangThaiAsync(string maSo, UpdateTrangThaiGioiThieuDto dto)
    {
        var entity = await _repository.GetByIdAsync(maSo);
        if (entity is null)
            throw new NotFoundException("GioiThieu", maSo);

        var validStates = new[] { "DangXem", "DaDuyet", "TuChoi" };
        if (!validStates.Contains(dto.TrangThaiKetNoi))
            throw new ArgumentException("Trạng thái kết nối không hợp lệ. Chỉ chấp nhận: DangXem, DaDuyet, TuChoi");

        entity.TrangThaiKetNoi = dto.TrangThaiKetNoi;
        _repository.Update(entity);

        // Đồng bộ trạng thái vào bảng CONGTY để thuật toán AI Top-K nhận diện được doanh nghiệp đã được phê duyệt
        if (!string.IsNullOrEmpty(entity.MaCongTy))
        {
            var congTy = await _repository.GetCongTyByIdAsync(entity.MaCongTy);
            if (congTy != null)
            {
                if (dto.TrangThaiKetNoi == "DaDuyet")
                {
                    congTy.TrangThai = "DaDuyet";
                }
                else if (dto.TrangThaiKetNoi == "TuChoi")
                {
                    congTy.TrangThai = "TuChoi";
                }
                _repository.UpdateCongTy(congTy);
            }
        }

        await _repository.SaveChangesAsync();
    }

    public async Task DeleteAsync(string maSo)
    {
        var entity = await _repository.GetByIdAsync(maSo);
        if (entity is null)
            throw new NotFoundException("GioiThieu", maSo);

        _repository.Delete(entity);
        await _repository.SaveChangesAsync();
    }

    private static GioiThieuDto ToDto(InternshipManagement.DAL.Entities.GioiThieu entity) => new()
    {
        MaSo = entity.MaSo,
        MaGV = entity.MaGV,
        TenGiangVien = entity.GiangVien?.HoTen ?? string.Empty,
        MaCongTy = entity.MaCongTy,
        TenCongTy = entity.CongTy?.TenCongTy ?? string.Empty,
        ViTriTuyen = entity.CongTy?.ViTriTuyen,
        NgayGioiThieu = entity.NgayGioiThieu,
        TrangThaiKetNoi = entity.TrangThaiKetNoi
    };
}
