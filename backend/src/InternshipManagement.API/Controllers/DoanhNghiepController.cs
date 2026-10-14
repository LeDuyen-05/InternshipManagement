using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;

namespace InternshipManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DoanhNghiepController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DoanhNghiepController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Lấy danh sách doanh nghiệp đối tác (dùng cho selector chọn công ty demo/đăng nhập)
        /// </summary>
        [HttpGet("danh-sach")]
        public async Task<IActionResult> GetDanhSachDoanhNghiep()
        {
            var list = await _context.CongTys
                .Select(c => new
                {
                    c.MaCongTy,
                    c.TenCongTy,
                    c.ViTriTuyen,
                    c.SoLuongNhan,
                    c.TrangThai,
                    DaiDienChinh = _context.DaiDienDoanhNghieps
                        .Where(d => d.MaCongTy == c.MaCongTy)
                        .Select(d => new { d.MaSo, d.HoTen, d.ChucVu, d.Email })
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(list);
        }

        /// <summary>
        /// Lấy số liệu tổng quan Dashboard cho một doanh nghiệp cụ thể
        /// </summary>
        [HttpGet("tong-quan/{maCongTy}")]
        public async Task<IActionResult> GetTongQuan(string maCongTy)
        {
            var congTy = await _context.CongTys
                .FirstOrDefaultAsync(c => c.MaCongTy == maCongTy);

            if (congTy == null)
            {
                return NotFound(new { message = $"Không tìm thấy doanh nghiệp có mã {maCongTy}" });
            }

            var daiDiens = await _context.DaiDienDoanhNghieps
                .Where(d => d.MaCongTy == maCongTy)
                .Select(d => new
                {
                    d.MaSo,
                    d.HoTen,
                    d.ChucVu,
                    d.Email
                })
                .ToListAsync();

            var soUngVien = await _context.DangKyThucTaps.CountAsync(d => d.MaCongTy == maCongTy);
            var soChoDuyet = await _context.DangKyThucTaps.CountAsync(d => d.MaCongTy == maCongTy && (d.TrangThai == "ChoDuyet" || d.TrangThai == null));
            var soDaDuyet = await _context.DangKyThucTaps.CountAsync(d => d.MaCongTy == maCongTy && d.TrangThai == "DaDuyet");
            
            var daiDienIds = daiDiens.Select(d => d.MaSo).ToList();
            var soPhongVan = await _context.PhongVans.CountAsync(p => daiDienIds.Contains(p.MaDaiDien));
            var soThucTapSinh = await _context.PhanBoThucTaps.CountAsync(p => p.MaCongTy == maCongTy);

            var ungVienMoiNhat = await _context.DangKyThucTaps
                .Where(d => d.MaCongTy == maCongTy)
                .OrderByDescending(d => d.NgayDangKy)
                .Take(5)
                .Select(d => new
                {
                    d.MaDK,
                    d.MaSV,
                    HoTen = _context.SinhViens.Where(s => s.MaSV == d.MaSV).Select(s => s.HoTen).FirstOrDefault() ?? d.MaSV,
                    Lop = _context.SinhViens.Where(s => s.MaSV == d.MaSV).Select(s => s.Lop).FirstOrDefault(),
                    Gpa = _context.SinhViens.Where(s => s.MaSV == d.MaSV).Select(s => s.Gpa).FirstOrDefault(),
                    d.ThuTuUuTien,
                    d.NgayDangKy,
                    d.TrangThai
                })
                .ToListAsync();

            return Ok(new
            {
                congTy = new
                {
                    congTy.MaCongTy,
                    congTy.TenCongTy,
                    congTy.ViTriTuyen,
                    congTy.ThoiGian,
                    congTy.SoLuongNhan,
                    congTy.YeuCau,
                    congTy.TrangThai
                },
                daiDiens,
                thongKe = new
                {
                    soViTriTuyen = string.IsNullOrEmpty(congTy.ViTriTuyen) ? 0 : 1,
                    soLuongNhan = congTy.SoLuongNhan ?? 0,
                    soUngVien,
                    soChoDuyet,
                    soDaDuyet,
                    soPhongVan,
                    soThucTapSinh
                },
                ungVienMoiNhat
            });
        }
    }
}
