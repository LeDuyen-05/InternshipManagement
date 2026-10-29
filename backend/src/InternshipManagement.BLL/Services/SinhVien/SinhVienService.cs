using InternshipManagement.BLL.DTOs.SinhVien;
using InternshipManagement.BLL.Exceptions;
using InternshipManagement.BLL.Validators.SinhVien;
using InternshipManagement.DAL.Repositories;

namespace InternshipManagement.BLL.Services.SinhVien;

public class SinhVienService : ISinhVienService
{
    private readonly ISinhVienRepository _repository;
    private readonly CreateSinhVienValidator _validator;

    public SinhVienService(ISinhVienRepository repository, CreateSinhVienValidator validator)
    {
        _repository = repository;
        _validator = validator;
    }

    public async Task<IReadOnlyList<SinhVienDto>> GetAllAsync()
    {
        var list = await _repository.GetAllAsync();
        return list.Select(ToDto).ToList();
    }

    public async Task<SinhVienDto?> GetByIdAsync(string maSV)
    {
        var entity = await _repository.GetByIdAsync(maSV);
        return entity is null ? null : ToDto(entity);
    }

    public async Task<SinhVienDto> CreateAsync(CreateSinhVienDto dto)
    {
        var errors = _validator.Validate(dto);
        if (errors.Count > 0)
            throw new ArgumentException(string.Join(" ", errors));

        var entity = new DAL.Entities.SinhVien
        {
            MaSV = dto.MaSV,
            HoTen = dto.HoTen,
            Lop = dto.Lop,
            KhoaHoc = dto.KhoaHoc,
            Gpa = dto.Gpa,
            KyNang = dto.KyNang,
            ChuyenNganh = dto.ChuyenNganh,
            CongNghe = dto.CongNghe,
            DuAnDaThucHien = dto.DuAnDaThucHien,
        };

        await _repository.AddAsync(entity);
        await _repository.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task UpdateAsync(string maSV, UpdateSinhVienDto dto)
    {
        var errors = _validator.Validate(maSV, dto.HoTen, dto.Gpa, dto.Lop, dto.KhoaHoc, dto.CongNghe, dto.KyNang, dto.DuAnDaThucHien);
        if (errors.Count > 0)
            throw new ArgumentException(string.Join(" ", errors));

        var entity = await _repository.GetByIdAsync(maSV)
            ?? throw new NotFoundException("SinhVien", maSV);

        entity.HoTen = dto.HoTen.Trim();
        entity.Lop = string.IsNullOrWhiteSpace(dto.Lop) ? null : dto.Lop.Trim();
        entity.KhoaHoc = string.IsNullOrWhiteSpace(dto.KhoaHoc) ? null : dto.KhoaHoc.Trim();
        entity.Gpa = dto.Gpa;
        entity.KyNang = string.IsNullOrWhiteSpace(dto.KyNang) ? null : dto.KyNang.Trim();
        entity.ChuyenNganh = string.IsNullOrWhiteSpace(dto.ChuyenNganh) ? null : dto.ChuyenNganh.Trim();
        entity.CongNghe = string.IsNullOrWhiteSpace(dto.CongNghe) ? null : dto.CongNghe.Trim();
        entity.DuAnDaThucHien = string.IsNullOrWhiteSpace(dto.DuAnDaThucHien) ? null : dto.DuAnDaThucHien.Trim();

        _repository.Update(entity);
        await _repository.SaveChangesAsync();
    }

    private static SinhVienDto ToDto(DAL.Entities.SinhVien entity) => new()
    {
        MaSV = entity.MaSV,
        HoTen = entity.HoTen,
        Lop = entity.Lop,
        KhoaHoc = entity.KhoaHoc,
        Gpa = entity.Gpa,
        KyNang = entity.KyNang,
        ChuyenNganh = entity.ChuyenNganh,
        CongNghe = entity.CongNghe,
        DuAnDaThucHien = entity.DuAnDaThucHien,
    };
}
