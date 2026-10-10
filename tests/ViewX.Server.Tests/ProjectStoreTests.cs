using System.Text.Json;
using Microsoft.Data.Sqlite;
using ViewX.Server;
using Xunit;

namespace ViewX.Server.Tests;

public sealed class ProjectStoreTests : IDisposable
{
    private readonly string directory = Path.Combine(Path.GetTempPath(), "viewx-test-" + Guid.NewGuid());
    private string DatabasePath => Path.Combine(directory, "test.db");
    private static JsonElement Project(string name = "測試產線") => JsonSerializer.SerializeToElement(new
    {
        id = "project-1",
        name,
        futureExtension = new { preserved = true }
    });

    [Fact]
    public void ProjectAndVersionSurviveReopening()
    {
        var store = new ProjectStore(DatabasePath);
        Assert.Equal(1, store.Save(Project(), 0).Revision);
        var reopened = new ProjectStore(DatabasePath);
        Assert.Equal("測試產線", reopened.List().Single().Name);
        Assert.True(reopened.Get("project-1")!.Project.GetProperty("futureExtension").GetProperty("preserved").GetBoolean());
        Assert.Equal(2, reopened.Save(Project("新版"), 1).Revision);
        using var connection = new SqliteConnection($"Data Source={DatabasePath}");
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT count(*) FROM versions";
        Assert.Equal(2L, command.ExecuteScalar());
    }

    [Fact]
    public void StaleWriteIsRejectedAndTransactionIsRolledBack()
    {
        var store = new ProjectStore(DatabasePath);
        store.Save(Project(), 0);
        Assert.Throws<RevisionConflictException>(() => store.Save(Project("stale"), 0));
        Assert.Equal("測試產線", store.Get("project-1")!.Project.GetProperty("name").GetString());
        Assert.Equal(1, store.Get("project-1")!.Revision);
        Assert.Equal(2, store.Save(Project("updated"), 1).Revision);
        Assert.Null(store.Get("missing"));
    }

    [Fact]
    public async Task ConcurrentWritersCannotOverwriteTheSameRevision()
    {
        var store = new ProjectStore(DatabasePath);
        store.Save(Project(), 0);
        var results = await Task.WhenAll(Enumerable.Range(0, 6).Select(i => Task.Run(() =>
        {
            try { store.Save(Project("writer-" + i), 1); return true; }
            catch (RevisionConflictException) { return false; }
        })));
        Assert.Equal(1, results.Count(success => success));
        Assert.Equal(2, store.Get("project-1")!.Revision);
    }

    public void Dispose() { if (Directory.Exists(directory)) Directory.Delete(directory, recursive: true); }
}
