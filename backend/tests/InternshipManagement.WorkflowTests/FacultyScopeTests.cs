using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternshipManagement.WorkflowTests;

// Nhiều khoa dùng chung một CSDL: mỗi khoa chỉ thấy và chỉ sửa được dữ liệu của mình.
public class FacultyScopeTests
{
    private static readonly DateTime Ngay = new(2026, 11, 8);

    private static AppDbContext Db(string name, string? khoa = null) =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(name).Options, new FixedKhoaScope(khoa));

    private static async Task<string> SeedTwoFacultiesAsync()
    {
        var name = Guid.NewGuid().ToString();
        await using var db = Db(name);
        db.Khoas.AddRange(new Khoa { MaKhoa = "CNTT", TenKhoa = "Khoa Công nghệ thông tin" }, new Khoa { MaKhoa = "QTKD", TenKhoa = "Khoa Quản trị kinh doanh" });
        db.SinhViens.AddRange(new SinhVien { MaSV = "A1", HoTen = "SV CNTT", MaKhoa = "CNTT" }, new SinhVien { MaSV = "B1", HoTen = "SV QTKD", MaKhoa = "QTKD" });
        db.GiangViens.AddRange(new GiangVien { MaGV = "GA", HoTen = "GV CNTT", MaKhoa = "CNTT" }, new GiangVien { MaGV = "GB", HoTen = "GV QTKD", MaKhoa = "QTKD" });
        db.DotThucTaps.AddRange(
            new DotThucTap { MaSo = "DA", TenDot = "Đợt CNTT", NamHoc = "2026-2027", ThoiGianBD = Ngay, ThoiGianKT = Ngay.AddMonths(3), MaRubric = "RA", MaKhoa = "CNTT" },
            new DotThucTap { MaSo = "DB", TenDot = "Đợt QTKD", NamHoc = "2026-2027", ThoiGianBD = Ngay, ThoiGianKT = Ngay.AddMonths(3), MaRubric = "RB", MaKhoa = "QTKD" });
        db.BoTieuChis.AddRange(new BoTieuChi { MaRubric = "RA", TenBo = "Rubric CNTT", MaKhoa = "CNTT" }, new BoTieuChi { MaRubric = "RB", TenBo = "Rubric QTKD", MaKhoa = "QTKD" });
        db.TieuChis.AddRange(new TieuChi { MaTieuChi = "TA", TenTieuChi = "CNTT", MaRubric = "RA", MaCLO = "CLO1" }, new TieuChi { MaTieuChi = "TB", TenTieuChi = "QTKD", MaRubric = "RB", MaCLO = "CLO1" });
        db.DangKyThucTaps.AddRange(
            new DangKyThucTap { MaDK = "KA", MaSV = "A1", MaCongTy = "CT", MaDot = "DA", NgayDangKy = Ngay },
            new DangKyThucTap { MaDK = "KB", MaSV = "B1", MaCongTy = "CT", MaDot = "DB", NgayDangKy = Ngay });
        db.ThongBaos.AddRange(
            new ThongBao { MaThongBao = "T0", TieuDe = "Toàn trường", NoiDung = "x", NgayTao = Ngay },
            new ThongBao { MaThongBao = "TA", TieuDe = "CNTT", NoiDung = "x", NgayTao = Ngay, MaKhoa = "CNTT" },
            new ThongBao { MaThongBao = "TB", TieuDe = "QTKD", NoiDung = "x", NgayTao = Ngay, MaKhoa = "QTKD" });
        await db.SaveChangesAsync();
        return name;
    }

    [Fact]
    public async Task FacultyStaffOnlySeeTheirOwnData()
    {
        var name = await SeedTwoFacultiesAsync();
        await using var cntt = Db(name, "CNTT");
        Assert.Equal(["A1"], await cntt.SinhViens.Select(x => x.MaSV).ToListAsync());
        Assert.Equal(["GA"], await cntt.GiangViens.Select(x => x.MaGV).ToListAsync());
        Assert.Equal(["DA"], await cntt.DotThucTaps.Select(x => x.MaSo).ToListAsync());
        Assert.Equal(["RA"], await cntt.BoTieuChis.Select(x => x.MaRubric).ToListAsync());
        Assert.Equal(["TA"], await cntt.TieuChis.Select(x => x.MaTieuChi).ToListAsync());
        // Dữ liệu theo đợt bị lọc kể cả khi truy vấn thẳng bằng mã đợt của khoa khác.
        Assert.Empty(await cntt.DangKyThucTaps.Where(x => x.MaDot == "DB").ToListAsync());
        Assert.Null(await cntt.DangKyThucTaps.FindAsync("KB"));
        Assert.Equal(["T0", "TA"], await cntt.ThongBaos.OrderBy(x => x.MaThongBao).Select(x => x.MaThongBao).ToListAsync());

        await using var admin = Db(name);
        Assert.Equal(2, await admin.SinhViens.CountAsync());
        Assert.Equal(2, await admin.DangKyThucTaps.CountAsync());

        await using var chuaGan = Db(name, PhamViKhoa.KhongCoKhoa);
        Assert.Empty(await chuaGan.SinhViens.ToListAsync());
        Assert.Equal(["T0"], await chuaGan.ThongBaos.Select(x => x.MaThongBao).ToListAsync());
    }

    [Fact]
    public async Task NewRecordsTakeTheFacultyOfTheCurrentUser()
    {
        var name = await SeedTwoFacultiesAsync();
        await using (var qtkd = Db(name, "QTKD"))
        {
            qtkd.SinhViens.Add(new SinhVien { MaSV = "B2", HoTen = "SV mới" });
            qtkd.ThongBaos.Add(new ThongBao { MaThongBao = "TB2", TieuDe = "Mới", NoiDung = "x", NgayTao = Ngay });
            await qtkd.SaveChangesAsync();
        }
        await using var admin = Db(name);
        Assert.Equal("QTKD", (await admin.SinhViens.SingleAsync(x => x.MaSV == "B2")).MaKhoa);
        Assert.Equal("QTKD", (await admin.ThongBaos.SingleAsync(x => x.MaThongBao == "TB2")).MaKhoa);
    }

    [Fact]
    public async Task FacultyStaffCannotTouchOtherFacultiesOrSchoolWideData()
    {
        var name = await SeedTwoFacultiesAsync();
        await using (var cntt = Db(name, "CNTT"))
        {
            cntt.SinhViens.Add(new SinhVien { MaSV = "B1", HoTen = "Trùng mã khoa khác" });
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => cntt.SaveChangesAsync());
            Assert.Contains("thuộc khoa khác", ex.Message);
        }
        await using (var cntt = Db(name, "CNTT"))
        {
            cntt.SinhViens.Add(new SinhVien { MaSV = "A9", HoTen = "Gán sang khoa khác", MaKhoa = "QTKD" });
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => cntt.SaveChangesAsync());
        }
        await using (var cntt = Db(name, "CNTT"))
        {
            (await cntt.ThongBaos.SingleAsync(x => x.MaThongBao == "T0")).TieuDe = "Khoa sửa thông báo toàn trường";
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => cntt.SaveChangesAsync());
        }
        await using (var cntt = Db(name, "CNTT"))
        {
            (await cntt.SinhViens.SingleAsync(x => x.MaSV == "A1")).MaKhoa = "QTKD";
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => cntt.SaveChangesAsync());
        }
    }

    [Fact]
    public async Task StudentsAndLecturersOnlyJoinRoundsOfTheirFaculty()
    {
        var name = await SeedTwoFacultiesAsync();
        await using var admin = Db(name);
        var now = DateTimeOffset.UtcNow;
        admin.SinhVienThamGiaDots.Add(new SinhVienThamGiaDot { MaDot = "DA", MaSV = "B1", NgayThem = now, NguoiThem = "admin", NgayCapNhat = now, NguoiCapNhat = "admin" });
        Assert.Contains("khoa khác", (await Assert.ThrowsAsync<InvalidOperationException>(() => admin.SaveChangesAsync())).Message);
        admin.ChangeTracker.Clear();
        admin.GVHuongDans.Add(new GVHuongDan { MaSo = "HD1", MaGiangVien = "GB", MaSinhVien = "A1", MaDot = "DA", NgayPC = Ngay });
        Assert.Contains("khoa khác", (await Assert.ThrowsAsync<InvalidOperationException>(() => admin.SaveChangesAsync())).Message);
        admin.ChangeTracker.Clear();
        admin.SinhVienThamGiaDots.Add(new SinhVienThamGiaDot { MaDot = "DA", MaSV = "A1", NgayThem = now, NguoiThem = "admin", NgayCapNhat = now, NguoiCapNhat = "admin" });
        await admin.SaveChangesAsync();
    }

    [Fact]
    public async Task NewFacultyGetsDraftRubricsThatOnlyItCanSee()
    {
        var name = await SeedTwoFacultiesAsync();
        await using (var admin = Db(name))
        {
            admin.LoaiThucTaps.AddRange(new LoaiThucTap { MaLoai = "TTNN", TenLoai = "Thực tập nghề nghiệp" }, new LoaiThucTap { MaLoai = "TTKS", TenLoai = "Thực tập kỹ sư" });
            await admin.SaveChangesAsync();
            var service = new InternshipManagement.BLL.Services.Admin.KhoaService(admin);
            var created = await service.CreateAsync(new("ktkt", " Khoa Kế toán - Kiểm toán "));
            Assert.Equal(("KTKT", "Khoa Kế toán - Kiểm toán"), (created.MaKhoa, created.TenKhoa));
            await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(new("KTKT", "Tên khác")));
            await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(new("KHOA_QUA_DAI_1", "Mã quá dài")));
        }
        await using var ktkt = Db(name, "KTKT");
        var rubrics = await ktkt.BoTieuChis.OrderBy(x => x.MaRubric).ToListAsync();
        Assert.Equal(["KTKT_TTKS_V1", "KTKT_TTNN_V1"], rubrics.Select(x => x.MaRubric));
        Assert.All(rubrics, x => Assert.Equal("Nhap", x.TrangThai));
        // Bản nháp lấy đúng mẫu chuẩn nên ban hành được ngay (GV 5 điểm, DN 5 điểm).
        foreach (var rubric in rubrics)
            InternshipManagement.BLL.Services.Admin.RubricService.Validate(await ktkt.TieuChis.Where(x => x.MaRubric == rubric.MaRubric).ToListAsync());
        await using var cntt = Db(name, "CNTT");
        Assert.False(await cntt.BoTieuChis.AnyAsync(x => x.MaKhoa == "KTKT"));
        Assert.False(await cntt.TieuChis.AnyAsync(x => x.MaRubric.StartsWith("KTKT_")));
    }

    // Công ty dùng chung: một khoa không đổi trạng thái/thông tin của công ty mà khoa khác đang hợp tác.
    [Fact]
    public async Task SharedCompanyCannotBeChangedByOneFaculty()
    {
        var name = await SeedTwoFacultiesAsync();
        await using (var admin = Db(name))
        {
            admin.CongTyTheoDots.Add(new CongTyTheoDot { MaCongTy = "CTX", MaDot = "DA", ViTriTuyen = "TTS", YeuCau = "x", SoLuongNhan = 1,
                MoDangKy = DateTimeOffset.UtcNow, HanDangKy = DateTimeOffset.UtcNow.AddDays(1) });
            await admin.SaveChangesAsync();
        }
        await using (var cntt = Db(name, "CNTT"))
            await InternshipManagement.DAL.Common.CongTyTheoKhoa.ChanSuaCongTyDungChungAsync(cntt, "CTX"); // chỉ CNTT dùng: được sửa
        await using (var qtkd = Db(name, "QTKD"))
            await Assert.ThrowsAsync<InvalidOperationException>(() => InternshipManagement.DAL.Common.CongTyTheoKhoa.ChanSuaCongTyDungChungAsync(qtkd, "CTX"));
        // "CT" có đăng ký ở cả đợt CNTT và QTKD: không khoa nào tự đổi được.
        await using (var cntt = Db(name, "CNTT"))
            await Assert.ThrowsAsync<InvalidOperationException>(() => InternshipManagement.DAL.Common.CongTyTheoKhoa.ChanSuaCongTyDungChungAsync(cntt, "CT"));
        await using (var admin = Db(name))
            await InternshipManagement.DAL.Common.CongTyTheoKhoa.ChanSuaCongTyDungChungAsync(admin, "CT"); // QTV không bị giới hạn
    }

    [Fact]
    public async Task EnterprisesOnlyGetFacultiesTheyWorkWith()
    {
        var name = await SeedTwoFacultiesAsync();
        await using (var admin = Db(name))
        {
            admin.DaiDienDoanhNghieps.AddRange(new DaiDienDoanhNghiep { MaSo = "DDCT", MaCongTy = "CT", HoTen = "Đại diện CT" },
                new DaiDienDoanhNghiep { MaSo = "DDY", MaCongTy = "CTY", HoTen = "Đại diện CTY" });
            admin.CongTyTheoDots.Add(new CongTyTheoDot { MaCongTy = "CTY", MaDot = "DA", ViTriTuyen = "TTS", YeuCau = "x", SoLuongNhan = 1,
                MoDangKy = DateTimeOffset.UtcNow, HanDangKy = DateTimeOffset.UtcNow.AddDays(1) });
            await admin.SaveChangesAsync();
        }
        await using var db = Db(name);
        Assert.Equal(["CNTT", "QTKD"], await InternshipManagement.DAL.Common.CongTyTheoKhoa.KhoaCuaDaiDien(db, "DDCT").OrderBy(x => x).ToListAsync());
        Assert.Equal(["CNTT"], await InternshipManagement.DAL.Common.CongTyTheoKhoa.KhoaCuaDaiDien(db, "DDY").ToListAsync());
    }

    [Fact]
    public async Task UnscopedWritesNeedAnExplicitFacultyOnlyWhenSeveralExist()
    {
        var multi = await SeedTwoFacultiesAsync();
        await using (var admin = Db(multi))
        {
            admin.SinhViens.Add(new SinhVien { MaSV = "X1", HoTen = "Chưa chọn khoa" });
            Assert.Contains("nhiều khoa", (await Assert.ThrowsAsync<InvalidOperationException>(() => admin.SaveChangesAsync())).Message);
        }

        var single = Guid.NewGuid().ToString();
        await using (var db = Db(single))
        {
            db.Khoas.Add(new Khoa { MaKhoa = "CNTT", TenKhoa = "Khoa Công nghệ thông tin" });
            await db.SaveChangesAsync();
            db.SinhViens.Add(new SinhVien { MaSV = "S1", HoTen = "Một khoa" });
            await db.SaveChangesAsync();
        }
        await using (var db = Db(single))
            Assert.Equal("CNTT", (await db.SinhViens.SingleAsync()).MaKhoa);
    }
}
