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
        /// Lấy thông tin công ty theo mã đại diện doanh nghiệp (khi đăng nhập bằng tài khoản VT05)
        /// </summary>
        [HttpGet("theo-dai-dien/{maDaiDien}")]
        public async Task<IActionResult> GetByDaiDien(string maDaiDien)
        {
            var dd = await _context.DaiDienDoanhNghieps
                .Include(d => d.CongTy)
                .FirstOrDefaultAsync(d => d.MaSo == maDaiDien);

            if (dd == null)
            {
                return NotFound(new { message = $"Không tìm thấy đại diện {maDaiDien}" });
            }

            return Ok(new
            {
                dd.MaSo,
                dd.HoTen,
                dd.ChucVu,
                dd.Email,
                congTy = new
                {
                    dd.CongTy.MaCongTy,
                    dd.CongTy.TenCongTy,
                    dd.CongTy.ViTriTuyen,
                    dd.CongTy.ThoiGian,
                    dd.CongTy.SoLuongNhan,
                    dd.CongTy.YeuCau,
                    dd.CongTy.TrangThai
                }
            });
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
                    Lop = sv?.Lop ?? "",
                    KhoaHoc = sv?.KhoaHoc ?? "",
                    Gpa = sv?.Gpa,
                    ChuyenNganh = sv?.ChuyenNganh ?? "",
                    KyNang = sv?.KyNang ?? "",
                    CongNghe = sv?.CongNghe ?? "",
                    DuAnDaThucHien = sv?.DuAnDaThucHien ?? "",
                    NdHoSo = hs?.NDHoSo ?? "",
                    FileCV = hs?.FileCV ?? ""
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
                    LopSV = sv?.Lop ?? "",
                    GpaSV = sv?.Gpa,
                    TenNguoiPV = dd?.HoTen ?? "",
                    ChucVuNguoiPV = dd?.ChucVu ?? "",
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
                        var dotHienTai = await _context.DotThucTaps.OrderByDescending(d => d.ThoiGianBD).Select(d => d.MaSo).FirstOrDefaultAsync() ?? "DOT01";
                        var maPB = "PB" + DateTime.Now.ToString("yyMMddHHmmss");
                        var pb = new PhanBoThucTap
                        {
                            MaPhanBo = maPB,
                            MaSinhVien = pv.MaSinhVien,
                            MaCongTy = daiDien.MaCongTy,
                            MaDot = dotHienTai,
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
                            VaiTro = string.IsNullOrWhiteSpace(daiDien.ChucVu) ? "Mentor hướng dẫn chuyên môn" : daiDien.ChucVu,
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

        /// <summary>
        /// Lấy danh sách thực tập sinh chính thức tại doanh nghiệp
        /// </summary>
        [HttpGet("thuc-tap-sinh/{maCongTy}")]
        public async Task<IActionResult> GetDanhSachThucTapSinh(string maCongTy)
        {
            var phanBos = await _context.PhanBoThucTaps
                .Where(p => p.MaCongTy == maCongTy)
                .OrderByDescending(p => p.NgayPhanBo)
                .ToListAsync();

            var sinhVienIds = phanBos.Select(p => p.MaSinhVien).Distinct().ToList();
            var sinhViens = await _context.SinhViens
                .Where(s => sinhVienIds.Contains(s.MaSV))
                .ToDictionaryAsync(s => s.MaSV);

            var maPBList = phanBos.Select(p => p.MaPhanBo).Distinct().ToList();
            var huongDans = await _context.HuongDanDoanhNghieps
                .Where(h => maPBList.Contains(h.MaPhanBo))
                .ToListAsync();

            var daiDienIds = huongDans.Select(h => h.MaDaiDien).Distinct().ToList();
            var daiDiens = await _context.DaiDienDoanhNghieps
                .Where(d => daiDienIds.Contains(d.MaSo))
                .ToDictionaryAsync(d => d.MaSo);

            var gvHuongDans = await _context.GVHuongDans
                .Where(g => sinhVienIds.Contains(g.MaSinhVien))
                .ToListAsync();

            var gvIds = gvHuongDans.Select(g => g.MaGiangVien).Distinct().ToList();
            var giangViens = await _context.GiangViens
                .Where(g => gvIds.Contains(g.MaGV))
                .ToDictionaryAsync(g => g.MaGV);

            var congTy = await _context.CongTys.FirstOrDefaultAsync(c => c.MaCongTy == maCongTy);

            var result = phanBos.Select(pb =>
            {
                sinhViens.TryGetValue(pb.MaSinhVien, out var sv);
                var hd = huongDans.FirstOrDefault(h => h.MaPhanBo == pb.MaPhanBo);
                DaiDienDoanhNghiep? dd = null;
                if (hd != null) daiDiens.TryGetValue(hd.MaDaiDien, out dd);

                var gvhd = gvHuongDans.FirstOrDefault(g => g.MaSinhVien == pb.MaSinhVien);
                GiangVien? gv = null;
                if (gvhd != null) giangViens.TryGetValue(gvhd.MaGiangVien, out gv);

                var danhGiaStr = hd?.DanhGia ?? "";
                var daDanhGia = !string.IsNullOrWhiteSpace(hd?.DanhGia) && hd.DanhGia.Contains("Tổng kết DN:");

                return new
                {
                    pb.MaPhanBo,
                    pb.MaSinhVien,
                    pb.MaCongTy,
                    pb.MaDot,
                    pb.NgayPhanBo,
                    pb.TrangThai,
                    HoTenSV = sv?.HoTen ?? pb.MaSinhVien,
                    LopSV = sv?.Lop ?? "",
                    GpaSV = sv?.Gpa,
                    ChuyenNganhSV = sv?.ChuyenNganh ?? "",
                    ViTriThucTap = congTy?.ViTriTuyen ?? "",
                    ThoiGianThucTap = congTy?.ThoiGian ?? "",
                    TenMentor = dd?.HoTen ?? "",
                    ChucVuMentor = dd?.ChucVu ?? "",
                    EmailMentor = dd?.Email ?? "",
                    TenGVHD = gv?.HoTen ?? "",
                    DanhGia = danhGiaStr,
                    DaDanhGia = daDanhGia
                };
            }).ToList();

            return Ok(result);
        }

        /// <summary>
        /// Doanh nghiệp đánh giá và chấm điểm thực tập sinh
        /// </summary>
        [HttpPost("danh-gia")]
        public async Task<IActionResult> DanhGiaThucTapSinh([FromBody] DanhGiaThucTapSinhRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.MaPhanBo))
            {
                return BadRequest(new { message = "Mã phân bổ thực tập không được để trống" });
            }

            var pb = await _context.PhanBoThucTaps.FirstOrDefaultAsync(p => p.MaPhanBo == request.MaPhanBo);
            if (pb == null)
            {
                return NotFound(new { message = $"Không tìm thấy phân bổ thực tập {request.MaPhanBo}" });
            }

            var hd = await _context.HuongDanDoanhNghieps.FirstOrDefaultAsync(h => h.MaPhanBo == request.MaPhanBo);
            if (hd == null)
            {
                var daiDien = await _context.DaiDienDoanhNghieps.FirstOrDefaultAsync(d => d.MaCongTy == pb.MaCongTy);
                if (daiDien == null)
                {
                    return BadRequest(new { message = "Doanh nghiệp chưa có người đại diện để phân công đánh giá." });
                }
                hd = new HuongDanDoanhNghiep
                {
                    MaSo = "HD" + DateTime.Now.ToString("yyMMddHHmmss"),
                    MaPhanBo = pb.MaPhanBo,
                    MaDaiDien = daiDien.MaSo,
                    NgayBD = DateTime.Now,
                    VaiTro = string.IsNullOrWhiteSpace(daiDien.ChucVu) ? "Mentor hướng dẫn chuyên môn" : daiDien.ChucVu
                };
                _context.HuongDanDoanhNghieps.Add(hd);
            }

            var diemTongKet = Math.Round((request.DiemKyLuat * 0.3) + (request.DiemChuyenMon * 0.5) + (request.DiemLamViecNhom * 0.2), 1);
            hd.DanhGia = $"Kỷ luật: {request.DiemKyLuat}/10 | Chuyên môn: {request.DiemChuyenMon}/10 | Làm việc nhóm: {request.DiemLamViecNhom}/10 | Tổng kết DN: {diemTongKet}/10. Nhận xét: {request.NhanXet}";
            pb.TrangThai = "HoanThanh";

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Ghi nhận đánh giá thực tập sinh thành công",
                maPhanBo = pb.MaPhanBo,
                danhGia = hd.DanhGia,
                diemTongKet
            });
        }
    }

    public class DanhGiaThucTapSinhRequest
    {
        public string MaPhanBo { get; set; } = default!;
        public double DiemKyLuat { get; set; } = 9.0;
        public double DiemChuyenMon { get; set; } = 8.5;
        public double DiemLamViecNhom { get; set; } = 9.0;
        public string NhanXet { get; set; } = "";
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
