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

        /// <summary>
        /// Lấy chi tiết tin tuyển dụng thực tập của doanh nghiệp
        /// </summary>
        [HttpGet("tin-tuyen-dung/{maCongTy}")]
        public async Task<IActionResult> GetTinTuyenDung(string maCongTy)
        {
            var congTy = await _context.CongTys.FirstOrDefaultAsync(c => c.MaCongTy == maCongTy);
            if (congTy == null)
            {
                return NotFound(new { message = $"Không tìm thấy doanh nghiệp có mã {maCongTy}" });
            }

            var soUngVienDaNop = await _context.DangKyThucTaps.CountAsync(d => d.MaCongTy == maCongTy);
            var soDaTiepNhan = await _context.PhanBoThucTaps.CountAsync(p => p.MaCongTy == maCongTy);

            return Ok(new
            {
                congTy.MaCongTy,
                congTy.TenCongTy,
                congTy.ViTriTuyen,
                congTy.ThoiGian,
                congTy.SoLuongNhan,
                congTy.YeuCau,
                congTy.TrangThai,
                soUngVienDaNop,
                soDaTiepNhan
            });
        }

        /// <summary>
        /// Đăng mới hoặc cập nhật tin tuyển dụng thực tập của doanh nghiệp
        /// </summary>
        [HttpPost("tin-tuyen-dung")]
        public async Task<IActionResult> LuuTinTuyenDung([FromBody] CapNhatTinTuyenDungRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.MaCongTy))
            {
                return BadRequest(new { message = "Mã công ty không được để trống" });
            }

            var congTy = await _context.CongTys.FirstOrDefaultAsync(c => c.MaCongTy == request.MaCongTy);
            if (congTy == null)
            {
                return NotFound(new { message = $"Không tìm thấy doanh nghiệp có mã {request.MaCongTy}" });
            }

            if (!string.IsNullOrWhiteSpace(request.ViTriTuyen)) congTy.ViTriTuyen = request.ViTriTuyen.Trim();
            if (!string.IsNullOrWhiteSpace(request.ThoiGian)) congTy.ThoiGian = request.ThoiGian.Trim();
            if (request.SoLuongNhan.HasValue && request.SoLuongNhan > 0) congTy.SoLuongNhan = request.SoLuongNhan.Value;
            if (request.YeuCau != null) congTy.YeuCau = request.YeuCau.Trim();
            if (!string.IsNullOrWhiteSpace(request.TrangThai)) congTy.TrangThai = request.TrangThai.Trim();

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật tin tuyển dụng thành công",
                congTy = new
                {
                    congTy.MaCongTy,
                    congTy.TenCongTy,
                    congTy.ViTriTuyen,
                    congTy.ThoiGian,
                    congTy.SoLuongNhan,
                    congTy.YeuCau,
                    congTy.TrangThai
                }
            });
        }

        /// <summary>
        /// Lấy danh sách ứng viên nộp hồ sơ vào doanh nghiệp kèm hồ sơ năng lực & CV
        /// </summary>
        [HttpGet("ung-vien/{maCongTy}")]
        public async Task<IActionResult> GetDanhSachUngVien(string maCongTy)
        {
            var dangKys = await _context.DangKyThucTaps
                .Where(d => d.MaCongTy == maCongTy)
                .OrderBy(d => d.ThuTuUuTien)
                .ThenByDescending(d => d.NgayDangKy)
                .ToListAsync();

            var sinhVienIds = dangKys.Select(d => d.MaSV).Distinct().ToList();
            var sinhViens = await _context.SinhViens
                .Where(s => sinhVienIds.Contains(s.MaSV))
                .ToDictionaryAsync(s => s.MaSV);

            var hoSos = await _context.HoSoNangLucs
                .Where(h => sinhVienIds.Contains(h.MaSV))
                .ToDictionaryAsync(h => h.MaSV);

            var result = dangKys.Select(d =>
            {
                sinhViens.TryGetValue(d.MaSV, out var sv);
                hoSos.TryGetValue(d.MaSV, out var hs);

                return new
                {
                    d.MaDK,
                    d.MaSV,
                    d.MaCongTy,
                    d.MaDot,
                    d.NgayDangKy,
                    d.ThuTuUuTien,
                    d.TrangThai,
                    HoTen = sv?.HoTen ?? d.MaSV,
                    Lop = sv?.Lop ?? "CNTT",
                    KhoaHoc = sv?.KhoaHoc ?? "2022",
                    Gpa = sv?.Gpa ?? 3.0,
                    ChuyenNganh = sv?.ChuyenNganh ?? "Công nghệ thông tin",
                    KyNang = sv?.KyNang ?? "Lập trình Web, SQL",
                    CongNghe = sv?.CongNghe ?? "React, Node.js",
                    DuAnDaThucHien = sv?.DuAnDaThucHien ?? "Chưa cập nhật",
                    NdHoSo = hs?.NDHoSo ?? "Mong muốn được thực tập và cống hiến cho doanh nghiệp.",
                    FileCV = hs?.FileCV ?? "https://example.com/cv/" + d.MaSV + ".pdf"
                };
            }).ToList();

            return Ok(result);
        }

        /// <summary>
        /// Doanh nghiệp duyệt hoặc từ chối hồ sơ ứng viên
        /// </summary>
        [HttpPut("ung-vien/{maDK}/trang-thai")]
        public async Task<IActionResult> CapNhatTrangThaiUngVien(string maDK, [FromBody] CapNhatTrangThaiUngVienRequest request)
        {
            var dk = await _context.DangKyThucTaps.FirstOrDefaultAsync(d => d.MaDK == maDK);
            if (dk == null)
            {
                return NotFound(new { message = $"Không tìm thấy phiếu đăng ký {maDK}" });
            }

            dk.TrangThai = request.TrangThai;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật trạng thái duyệt hồ sơ thành công",
                maDK = dk.MaDK,
                trangThai = dk.TrangThai
            });
        }

        /// <summary>
        /// Lấy danh sách lịch phỏng vấn của doanh nghiệp
        /// </summary>
        [HttpGet("phong-van/{maCongTy}")]
        public async Task<IActionResult> GetDanhSachPhongVan(string maCongTy)
        {
            var daiDiens = await _context.DaiDienDoanhNghieps
                .Where(d => d.MaCongTy == maCongTy)
                .ToDictionaryAsync(d => d.MaSo);

            var daiDienIds = daiDiens.Keys.ToList();

            var phongVans = await _context.PhongVans
                .Where(p => daiDienIds.Contains(p.MaDaiDien))
                .OrderByDescending(p => p.NgayPV)
                .ToListAsync();

            var sinhVienIds = phongVans.Select(p => p.MaSinhVien).Distinct().ToList();
            var sinhViens = await _context.SinhViens
                .Where(s => sinhVienIds.Contains(s.MaSV))
                .ToDictionaryAsync(s => s.MaSV);

            var result = phongVans.Select(p =>
            {
                sinhViens.TryGetValue(p.MaSinhVien, out var sv);
                daiDiens.TryGetValue(p.MaDaiDien, out var dd);

                return new
                {
                    p.MaPV,
                    p.MaSinhVien,
                    p.MaDaiDien,
                    p.HinhThuc,
                    p.NgayPV,
                    p.KetQua,
                    HoTenSV = sv?.HoTen ?? p.MaSinhVien,
                    LopSV = sv?.Lop ?? "CNTT",
                    GpaSV = sv?.Gpa ?? 3.0,
                    TenNguoiPV = dd?.HoTen ?? "Người đại diện DN",
                    ChucVuNguoiPV = dd?.ChucVu ?? "HR / Mentor",
                    EmailNguoiPV = dd?.Email ?? ""
                };
            }).ToList();

            return Ok(result);
        }

        /// <summary>
        /// Doanh nghiệp tạo lịch phỏng vấn mới cho ứng viên
        /// </summary>
        [HttpPost("phong-van")]
        public async Task<IActionResult> TaoPhongVan([FromBody] TaoPhongVanRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.MaSinhVien) || string.IsNullOrWhiteSpace(request.MaDaiDien))
            {
                return BadRequest(new { message = "Mã sinh viên và Mã người đại diện phỏng vấn không được để trống" });
            }

            var maPV = "PV" + DateTime.Now.ToString("yyMMddHHmmss");
            var pv = new PhongVan
            {
                MaPV = maPV,
                MaSinhVien = request.MaSinhVien,
                MaDaiDien = request.MaDaiDien,
                HinhThuc = string.IsNullOrWhiteSpace(request.HinhThuc) ? "Trực tuyến qua Google Meet" : request.HinhThuc,
                NgayPV = request.NgayPV ?? DateTime.Now.AddDays(2),
                KetQua = "DangXuLy"
            };

            _context.PhongVans.Add(pv);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Tạo lịch phỏng vấn thành công",
                phongVan = pv
            });
        }

        /// <summary>
        /// Cập nhật kết quả phỏng vấn và tự động tạo tiếp nhận phân bổ nếu Đạt
        /// </summary>
        [HttpPut("phong-van/{maPV}/ket-qua")]
        public async Task<IActionResult> CapNhatKetQuaPhongVan(string maPV, [FromBody] CapNhatKetQuaPhongVanRequest request)
        {
            var pv = await _context.PhongVans.FirstOrDefaultAsync(p => p.MaPV == maPV);
            if (pv == null)
            {
                return NotFound(new { message = $"Không tìm thấy buổi phỏng vấn {maPV}" });
            }

            pv.KetQua = request.KetQua;

            // Nếu đạt, kiểm tra tạo phân bổ tiếp nhận thực tập chính thức
            if (request.KetQua == "Dat")
            {
                var daiDien = await _context.DaiDienDoanhNghieps.FirstOrDefaultAsync(d => d.MaSo == pv.MaDaiDien);
                if (daiDien != null)
                {
                    var exists = await _context.PhanBoThucTaps
                        .AnyAsync(p => p.MaSinhVien == pv.MaSinhVien && p.MaCongTy == daiDien.MaCongTy);

                    if (!exists)
                    {
                        var maPB = "PB" + DateTime.Now.ToString("yyMMddHHmmss");
                        var pb = new PhanBoThucTap
                        {
                            MaPhanBo = maPB,
                            MaSinhVien = pv.MaSinhVien,
                            MaCongTy = daiDien.MaCongTy,
                            MaDot = "DOT01",
                            NgayPhanBo = DateTime.Now,
                            TrangThai = "HoanThanh"
                        };
                        _context.PhanBoThucTaps.Add(pb);

                        var hd = new HuongDanDoanhNghiep
                        {
                            MaSo = "HD" + DateTime.Now.ToString("yyMMddHHmmss"),
                            MaPhanBo = maPB,
                            MaDaiDien = pv.MaDaiDien,
                            NgayBD = DateTime.Now,
                            VaiTro = "Mentor hướng dẫn chuyên môn",
                            DanhGia = "Đã trúng tuyển phỏng vấn và được doanh nghiệp tiếp nhận thực tập."
                        };
                        _context.HuongDanDoanhNghieps.Add(hd);
                    }
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật kết quả phỏng vấn thành công",
                maPV = pv.MaPV,
                ketQua = pv.KetQua
            });
        }
    }

    public class TaoPhongVanRequest
    {
        public string MaSinhVien { get; set; } = default!;
        public string MaDaiDien { get; set; } = default!;
        public string? HinhThuc { get; set; }
        public DateTime? NgayPV { get; set; }
    }

    public class CapNhatKetQuaPhongVanRequest
    {
        public string KetQua { get; set; } = "Dat";
    }

    public class CapNhatTrangThaiUngVienRequest
    {
        public string TrangThai { get; set; } = "DaDuyet";
    }

    public class CapNhatTinTuyenDungRequest
    {
        public string MaCongTy { get; set; } = default!;
        public string? ViTriTuyen { get; set; }
        public string? ThoiGian { get; set; }
        public int? SoLuongNhan { get; set; }
        public string? YeuCau { get; set; }
        public string? TrangThai { get; set; }
    }
}
