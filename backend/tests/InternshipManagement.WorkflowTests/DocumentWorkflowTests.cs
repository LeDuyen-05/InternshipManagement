using System.Text;
using InternshipManagement.BLL.Services.Documents;
using InternshipManagement.DAL;
using InternshipManagement.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;
using InternshipManagement.API.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace InternshipManagement.WorkflowTests;

// 04/11/2026: kiểm tra quyền/hạn trước–sau lưu bằng kho giả lập; không thay kiểm chứng R2 thật.
public class DocumentWorkflowTests
{
    private sealed class Clock : TimeProvider
    {
        public DateTimeOffset Now = new(2029, 1, 10, 0, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }
    private sealed class Store : IDocumentObjectStore
    {
        public int Writes, Reads, LegacyReads, Deletes;
        public byte[] Bytes = [];
        public Func<Task>? AfterWrite, AfterRead;
        public async Task PutAsync(string key, byte[] bytes, string type, CancellationToken ct) {
            Writes++; Bytes = bytes; if (AfterWrite != null) await AfterWrite();
        }
        public async Task<byte[]> GetAsync(string key, long size, CancellationToken ct) {
            Reads++; if (AfterRead != null) await AfterRead(); return Bytes;
        }
        public Task<byte[]> GetLegacyLocalAsync(string key, long size, CancellationToken ct) {
            LegacyReads++; return GetAsync(key, size, ct);
        }
        public Task DeleteTemporaryAsync(string key, CancellationToken ct) { Deletes++; return Task.CompletedTask; }
    }
    private sealed class Fixture : IAsyncDisposable
    {
        public readonly Clock Time = new();
        public readonly Store Objects = new();
        public readonly AppDbContext Db;
        public readonly DocumentStorageOptions Options = new() { Enabled = true, Provider = "Local" };
        public readonly DocumentActor Student = new("ACCOUNT", "SinhVien", Student: "S");
        public DocumentService Service => new(Db, new(Db, Time), Objects, Options, Time);
        public Fixture() {
            Db = new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options) { RoundClock = Time };
        }
        public async Task Seed() {
            Db.SinhViens.Add(new() { MaSV = "S", HoTen = "Sinh viên mẫu" });
            Db.DotThucTaps.Add(new() { MaSo = "D", TenDot = "Đợt kiểm tra", NamHoc = "2028-2029", TrangThai = "DangDienRa", MaRubric = "TTKS_V1", ThoiGianBD = new(2029, 1, 1), ThoiGianKT = new(2029, 3, 1) });
            Db.CongTys.Add(new() { MaCongTy = "CT", TenCongTy = "Đơn vị mẫu" });
            Db.PhanBoThucTaps.Add(new() { MaPhanBo = "PB", MaDot = "D", MaSinhVien = "S", MaCongTy = "CT", DaDuocKhoaDuyet = true, TrangThai = "DangThucTap" });
            Db.GVHuongDans.Add(new() { MaSo = "HD", MaDot = "D", MaSinhVien = "S", MaGiangVien = "GV", TrangThai = "DangHuongDan" });
            Db.TienDoThucTaps.Add(new() { MaTienDo = "R", MaDot = "D", MaSV = "S", MocThoiGian = new(2029, 1, 11) });
            await Db.SaveChangesAsync();
        }
        public Task<DocumentDto> Upload(DocumentActor? actor = null) => Service.UploadAsync("Progress", "R", Guid.NewGuid().ToString(), "report.pdf",
            new MemoryStream(Encoding.UTF8.GetBytes("%PDF-1.7\nfixture")), actor ?? Student, default);
        public ValueTask DisposeAsync() => Db.DisposeAsync();
    }

    [Fact]
    public async Task UploadDoesNotSubmitReportAndReadyReplayDoesNotRewriteObject()
    {
        await using var f = new Fixture(); await f.Seed();
        var uploaded = await f.Upload();
        Assert.Equal("Ready", (await f.Db.StoredDocuments.FindAsync(uploaded.Id))!.State);
        Assert.Equal("ChuaNop", (await f.Db.TienDoThucTaps.FindAsync("R"))!.TrangThaiDuyet);
        Assert.Null((await f.Db.TienDoThucTaps.FindAsync("R"))!.NgayNop);
        var record = await f.Db.StoredDocuments.FindAsync(uploaded.Id);
        var replay = await f.Service.UploadAsync("Progress", "R", record!.RequestId, "report.pdf",
            new MemoryStream(f.Objects.Bytes), f.Student, default);
        Assert.Equal(uploaded.Id, replay.Id); Assert.Equal(1, f.Objects.Writes);
    }

    [Fact]
    public async Task WrongStudentIsRejectedBeforeObjectWrite()
    {
        await using var f = new Fixture(); await f.Seed();
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => f.Upload(new("OTHER", "SinhVien", Student: "OTHER")));
        Assert.Equal(0, f.Objects.Writes); Assert.Empty(f.Db.StoredDocuments);
    }

    // 04/11/2026: historical local links survive enabling R2 without changing metadata.
    [Fact]
    public async Task LegacyLocalReadAfterR2SwitchPreservesMetadataAndChecksPermissionsTwice()
    {
        await using var f = new Fixture(); await f.Seed(); var uploaded = await f.Upload();
        f.Options.Provider = "R2"; f.Options.Endpoint = "https://" + new string('a', 32) + ".r2.cloudflarestorage.com";
        f.Options.Bucket = "private-test"; f.Options.AccessKeyId = "test"; f.Options.SecretAccessKey = "test";
        var result = await f.Service.DownloadAsync(uploaded.Id, f.Student, default);
        Assert.Equal(f.Objects.Bytes, result.Bytes); Assert.Equal(1, f.Objects.LegacyReads);
        Assert.Equal("LOCAL_STORAGE", (await f.Db.StoredDocuments.FindAsync(uploaded.Id))!.StorageId);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => f.Service.DownloadAsync(uploaded.Id, new("OTHER", "SinhVien", Student: "OTHER"), default));
        Assert.Equal(1, f.Objects.LegacyReads);
        f.Objects.AfterRead = async () => { (await f.Db.GVHuongDans.FindAsync("HD"))!.TrangThai = "NgungHuongDan"; await f.Db.SaveChangesAsync(); };
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => f.Service.DownloadAsync(uploaded.Id, new("LECTURER", "GiangVien", Lecturer: "GV"), default));
        Assert.Equal(0, f.Objects.Deletes);
    }

    [Fact]
    public async Task LegacyLocalReadRejectsCorruptedBytesAndUnrelatedStorage()
    {
        await using var f = new Fixture(); await f.Seed(); var uploaded = await f.Upload();
        f.Options.Provider = "R2"; f.Options.Endpoint = "https://" + new string('a', 32) + ".r2.cloudflarestorage.com";
        f.Options.Bucket = "private-test"; f.Options.AccessKeyId = "test"; f.Options.SecretAccessKey = "test";
        f.Objects.Bytes[0] ^= 1;
        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Service.DownloadAsync(uploaded.Id, f.Student, default));
        var record = (await f.Db.StoredDocuments.FindAsync(uploaded.Id))!; record.StorageId = "OTHER_R2_BUCKET"; await f.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Service.DownloadAsync(uploaded.Id, f.Student, default));
        Assert.Equal(1, f.Objects.Reads); Assert.Equal(1, f.Objects.LegacyReads);
    }

    [Fact]
    public async Task DeadlinePassingDuringObjectWriteCannotCreateReadyAttachment()
    {
        await using var f = new Fixture(); await f.Seed();
        f.Objects.AfterWrite = () => { f.Time.Now = f.Time.Now.AddDays(3); return Task.CompletedTask; };
        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Upload());
        Assert.Equal(1, f.Objects.Writes);
        Assert.Equal("Failed", Assert.Single(f.Db.StoredDocuments).State);
        Assert.Equal("ChuaNop", (await f.Db.TienDoThucTaps.FindAsync("R"))!.TrangThaiDuyet);
    }

    [Fact]
    public async Task LecturerLosingAssignmentDuringDownloadCannotReceiveBytes()
    {
        await using var f = new Fixture(); await f.Seed(); var uploaded = await f.Upload();
        f.Objects.AfterRead = async () => {
            (await f.Db.GVHuongDans.FindAsync("HD"))!.TrangThai = "NgungHuongDan";
            await f.Db.SaveChangesAsync();
        };
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => f.Service.DownloadAsync(uploaded.Id, new("LECTURER", "GiangVien", Lecturer: "GV"), default));
        Assert.Equal(1, f.Objects.Reads);
        Assert.Equal("Ready", (await f.Db.StoredDocuments.FindAsync(uploaded.Id))!.State);
        Assert.Equal(0, f.Objects.Deletes);
    }

    // 04/11/2026: preview dùng cùng kiểm tra quyền và checksum với tải xuống.
    private static DocumentsController Controller(Fixture f, string student = "S") => new(f.Service, new(f.Db, f.Time), f.Options)
    {
        ControllerContext = new() { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([
            new(ClaimTypes.NameIdentifier, "ACCOUNT"), new(ClaimTypes.Role, "SinhVien"), new("maSV", student)
        ], "Test")) } }
    };

    [Fact]
    public async Task PreviewReturnsInlinePdfWithPrivateHeadersAndRejectsAnotherStudent()
    {
        await using var f = new Fixture(); await f.Seed(); var uploaded = await f.Upload();
        var controller = Controller(f);
        var result = Assert.IsType<FileContentResult>(await controller.Preview(uploaded.Id, default));
        Assert.Equal("application/pdf", result.ContentType);
        Assert.Equal(f.Objects.Bytes, result.FileContents);
        Assert.StartsWith("inline", controller.Response.Headers.ContentDisposition.ToString());
        Assert.Equal("private, no-store", controller.Response.Headers.CacheControl.ToString());
        Assert.Equal("nosniff", controller.Response.Headers["X-Content-Type-Options"]);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => Controller(f, "OTHER").Preview(uploaded.Id, default));
        Assert.Equal(1, f.Objects.Reads);
    }

    [Fact]
    public async Task PreviewRejectsChangedBytesAndDoesNotExposeOfficeInline()
    {
        await using var f = new Fixture(); await f.Seed(); var uploaded = await f.Upload();
        f.Objects.Bytes[0] = 0;
        await Assert.ThrowsAsync<InvalidOperationException>(() => Controller(f).Preview(uploaded.Id, default));
        f.Objects.Bytes[0] = (byte)'%';
        var record = (await f.Db.StoredDocuments.FindAsync(uploaded.Id))!;
        record.ContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        await f.Db.SaveChangesAsync();
        var rejected = Assert.IsType<ObjectResult>(await Controller(f).Preview(uploaded.Id, default));
        Assert.Equal(415, rejected.StatusCode);
    }

    [Fact]
    public async Task OnlyAdministratorMayCleanFailedFilesAfterTwentyFourHoursAndReadyFilesStay()
    {
        await using var f = new Fixture(); await f.Seed(); var ready = await f.Upload();
        var admin = new DocumentActor("ADMIN", "QuanTriVien");
        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Service.CleanupAsync(ready.Id, admin, default));
        f.Objects.AfterWrite = () => throw new InvalidOperationException("Object store unavailable");
        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Upload());
        var failed = Assert.Single(f.Db.StoredDocuments.Where(x => x.State == "Failed"));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => f.Service.CleanupAsync(failed.Id, f.Student, default));
        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Service.CleanupAsync(failed.Id, admin, default));
        f.Time.Now = f.Time.Now.AddHours(25);
        await f.Service.CleanupAsync(failed.Id, admin, default);
        Assert.Equal("ADMIN", failed.CleanedBy); Assert.NotNull(failed.CleanedAt);
        Assert.Equal(2, await f.Db.StoredDocuments.CountAsync());
        Assert.Equal("Ready", (await f.Db.StoredDocuments.FindAsync(ready.Id))!.State);
    }
}
