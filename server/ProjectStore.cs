using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Data.Sqlite;

namespace ViewX.Server;

public sealed record ProjectSummary(string Id, string Name, long Revision,
    [property: JsonPropertyName("updated_at")] string UpdatedAt);
public sealed record StoredProject(JsonElement Project, long Revision, string UpdatedAt);
public sealed record SaveResult(long Revision, string UpdatedAt);
public sealed class RevisionConflictException() : Exception("專案已有新版本，請重新開啟或另存新專案。");

// Each operation has its own connection; BEGIN IMMEDIATE protects revision checks
// and version writes as a single atomic operation, including concurrent API requests.
public sealed class ProjectStore
{
    private readonly string connectionString;
    public ProjectStore(string path)
    {
        var fullPath = Path.GetFullPath(path);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = fullPath,
            ForeignKeys = true,
            DefaultTimeout = 5,
            Pooling = false
        }.ToString();
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, content TEXT NOT NULL,
                revision INTEGER NOT NULL, updated_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS versions (
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                revision INTEGER NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL,
                PRIMARY KEY(project_id, revision));
            """;
        command.ExecuteNonQuery();
    }

    private SqliteConnection Open()
    {
        var connection = new SqliteConnection(connectionString);
        connection.Open();
        return connection;
    }

    public IReadOnlyList<ProjectSummary> List()
    {
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT id,name,revision,updated_at FROM projects ORDER BY updated_at DESC";
        using var reader = command.ExecuteReader();
        var result = new List<ProjectSummary>();
        while (reader.Read()) result.Add(new(reader.GetString(0), reader.GetString(1), reader.GetInt64(2), reader.GetString(3)));
        return result;
    }

    public StoredProject? Get(string id)
    {
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT content,revision,updated_at FROM projects WHERE id=$id";
        command.Parameters.AddWithValue("$id", id);
        using var reader = command.ExecuteReader();
        if (!reader.Read()) return null;
        using var document = JsonDocument.Parse(reader.GetString(0));
        return new(document.RootElement.Clone(), reader.GetInt64(1), reader.GetString(2));
    }

    public SaveResult Save(JsonElement project, long expectedRevision)
    {
        using var connection = Open();
        using var transaction = connection.BeginTransaction(deferred: false);
        var id = project.GetProperty("id").GetString()!;
        using var select = connection.CreateCommand();
        select.Transaction = transaction;
        select.CommandText = "SELECT revision FROM projects WHERE id=$id";
        select.Parameters.AddWithValue("$id", id);
        var value = select.ExecuteScalar();
        var currentRevision = value is null ? 0 : Convert.ToInt64(value);
        if (expectedRevision != currentRevision) throw new RevisionConflictException();
        var revision = checked(currentRevision + 1);
        var timestamp = DateTimeOffset.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'");
        // Preserve the original JSON, including optional fields and future extensions.
        var content = project.GetRawText();
        using var save = connection.CreateCommand();
        save.Transaction = transaction;
        save.CommandText = """
            INSERT INTO projects (id,name,content,revision,updated_at)
            VALUES ($id,$name,$content,$revision,$timestamp)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name,content=excluded.content,
                revision=excluded.revision,updated_at=excluded.updated_at;
            INSERT INTO versions (project_id,revision,content,created_at)
            VALUES ($id,$revision,$content,$timestamp);
            """;
        save.Parameters.AddWithValue("$id", id);
        save.Parameters.AddWithValue("$name", project.GetProperty("name").GetString()!);
        save.Parameters.AddWithValue("$content", content);
        save.Parameters.AddWithValue("$revision", revision);
        save.Parameters.AddWithValue("$timestamp", timestamp);
        save.ExecuteNonQuery();
        transaction.Commit();
        return new(revision, timestamp);
    }
}
