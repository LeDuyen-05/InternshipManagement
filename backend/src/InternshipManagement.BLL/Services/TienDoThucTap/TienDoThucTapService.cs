using InternshipManagement.BLL.DTOs.TienDoThucTap;
using InternshipManagement.DAL.Repositories;
using TienDoEntity = InternshipManagement.DAL.Entities.TienDoThucTap;

namespace InternshipManagement.BLL.Services.TienDoThucTap;

public class TienDoThucTapService : ITienDoThucTapService
{
    private readonly ITienDoThucTapRepository _repository;

    public TienDoThucTapService(ITienDoThucTapRepository repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<TienDoThucTapDto>> GetTienDoBySinhVienAsync(string maSV)
    {
        var list = await _repository.GetBySinhVienAsync(maSV);
        return list.Select(t => new TienDoThucTapDto
        {
            MaTienDo = t.MaTienDo,
            MaDot = t.MaDot,
            TenDot = t.DotThucTap?.TenDot,
            MaSV = t.MaSV,
            MocThoiGian = t.MocThoiGian,
            NoiDungBaoCao = t.NoiDungBaoCao,
            NgayNop = t.NgayNop,
            TrangThaiDuyet = t.TrangThaiDuyet,
        }).ToList();
    }

    public async Task<TienDoThucTapDto> NopBaoCaoTienDoAsync(NopBaoCaoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NoiDungBaoCao))
        {
            throw new ArgumentException("Nội dung báo cáo tiến độ không được để trống.");
        }

        TienDoEntity entity;

        if (!string.IsNullOrWhiteSpace(request.MaTienDo))
        {
            var existing = await _repository.GetByIdAsync(request.MaTienDo);
            if (existing != null)
            {
                existing.NoiDungBaoCao = request.NoiDungBaoCao;
                existing.NgayNop = DateTime.Now;
                existing.TrangThaiDuyet = "DaNop"; // Đã nộp, chờ giảng viên phê duyệt
                entity = await _repository.UpdateAsync(existing);
            }
            else
            {
                entity = new TienDoEntity
                {
                    MaTienDo = request.MaTienDo,
                    MaSV = request.MaSV,
                    MaDot = request.MaDot,
                    MocThoiGian = request.MocThoiGian != default ? request.MocThoiGian : DateTime.Now,
                    NoiDungBaoCao = request.NoiDungBaoCao,
                    NgayNop = DateTime.Now,
                    TrangThaiDuyet = "DaNop"
                };
                entity = await _repository.CreateAsync(entity);
            }
        }
        else
        {
            var newId = "TD" + DateTime.Now.ToString("yyMMddHHmmss");
            entity = new TienDoEntity
            {
                MaTienDo = newId,
                MaSV = request.MaSV,
                MaDot = request.MaDot,
                MocThoiGian = request.MocThoiGian != default ? request.MocThoiGian : DateTime.Now,
                NoiDungBaoCao = request.NoiDungBaoCao,
                NgayNop = DateTime.Now,
                TrangThaiDuyet = "DaNop"
            };
            entity = await _repository.CreateAsync(entity);
        }

        return new TienDoThucTapDto
        {
            MaTienDo = entity.MaTienDo,
            MaDot = entity.MaDot,
            TenDot = entity.DotThucTap?.TenDot,
            MaSV = entity.MaSV,
            MocThoiGian = entity.MocThoiGian,
            NoiDungBaoCao = entity.NoiDungBaoCao,
            NgayNop = entity.NgayNop,
            TrangThaiDuyet = entity.TrangThaiDuyet,
        };
    }
}
