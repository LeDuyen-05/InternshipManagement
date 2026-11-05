using InternshipManagement.BLL.Services.Documents;
using Xunit;

namespace InternshipManagement.WorkflowTests;

public class DocumentStorageOptionsTests
{
    [Fact]
    public void StorageIsDisabledByDefaultAndMissingEndpointDoesNotSelectLocal()
    {
        var options = new DocumentStorageOptions();
        Assert.False(options.Enabled);
        Assert.False(options.IsLocal);
        options.Enabled = true;
        Assert.Throws<InvalidOperationException>(options.Validate);
        options.Provider = "Unknown";
        Assert.Throws<InvalidOperationException>(options.Validate);
        options.Provider = "Local";
        options.Validate();
        Assert.True(options.IsLocal);
    }

    [Fact]
    public async Task DisabledLocalStorageCannotDeleteFiles()
    {
        var store = new R2ObjectStore(new DocumentStorageOptions { Provider = "Local" });
        await Assert.ThrowsAsync<InvalidOperationException>(() => store.DeleteTemporaryAsync("internship/test", default));
    }

    [Theory]
    [InlineData("../outside")]
    [InlineData("/outside")]
    [InlineData("internship/../../outside")]
    [InlineData("internship\\outside")]
    public async Task LocalStorageRejectsKeysOutsideItsDirectory(string key)
    {
        var store = new R2ObjectStore(new DocumentStorageOptions { Enabled = true, Provider = "Local" });
        await Assert.ThrowsAsync<ArgumentException>(() => store.PutAsync(key, [1], "application/pdf", default));
        await Assert.ThrowsAsync<ArgumentException>(() => store.GetAsync(key, 1, default));
        await Assert.ThrowsAsync<ArgumentException>(() => store.DeleteTemporaryAsync(key, default));
    }
}
