using Microsoft.Data.Sqlite;
using System.Text.Json;

namespace ViewX.Server;

public sealed record AlarmHistoryEvent(string Id, string? ElementId, string? AreaId, string? AreaName, int? Bit,
    string? Group, string RuleId, string Message, string Severity, JsonElement Value,
    long RaisedAt, long? ClearedAt, long? AcknowledgedAt, string? ClearedReason);
public sealed record AlarmBatch(string SessionId, long StartedAt, AlarmHistoryEvent[] Events);
public sealed record AlarmHistoryPage(IReadOnlyList<AlarmHistoryEvent> Items, long Total, int Offset, int Limit);
public sealed class AlarmHistoryConflictException() : Exception("警報事件識別碼或模擬工作階段衝突");

public sealed class AlarmHistoryStore
{
    private readonly string connectionString;
    public AlarmHistoryStore(string path)
    {
        connectionString = new SqliteConnectionStringBuilder { DataSource = Path.GetFullPath(path), ForeignKeys = true, DefaultTimeout = 5, Pooling = false }.ToString();
        using var db = Open(); using var command = db.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS alarm_sessions (
                id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                started_at INTEGER NOT NULL, ended_at INTEGER);
            CREATE TABLE IF NOT EXISTS alarm_events (
                id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                session_id TEXT NOT NULL REFERENCES alarm_sessions(id) ON DELETE CASCADE,
                source_kind TEXT NOT NULL, source_id TEXT NOT NULL, area_name TEXT, bit_index INTEGER,
                group_name TEXT, rule_id TEXT NOT NULL, message TEXT NOT NULL, severity TEXT NOT NULL,
                value_json TEXT NOT NULL, raised_at INTEGER NOT NULL, cleared_at INTEGER,
                acknowledged_at INTEGER, cleared_reason TEXT);
            CREATE INDEX IF NOT EXISTS ix_alarm_events_project_time ON alarm_events(project_id, raised_at DESC, id);
            CREATE INDEX IF NOT EXISTS ix_alarm_events_session ON alarm_events(session_id);
            """;
        command.ExecuteNonQuery();
    }
    private SqliteConnection Open() { var db = new SqliteConnection(connectionString); db.Open(); return db; }
    public static bool Valid(AlarmBatch? batch)
    {
        static bool Id(string? value) => !string.IsNullOrWhiteSpace(value) && value.Length <= 200;
        static bool Time(long value) => value >= 0 && value <= 8_640_000_000_000_000;
        if (batch is null || !Id(batch.SessionId) || !Time(batch.StartedAt) || batch.Events is null || batch.Events.Length > 200) return false;
        var ids = new HashSet<string>();
        return batch.Events.All(e => e is not null && Id(e.Id) && ids.Add(e.Id) && Id(e.RuleId) &&
            (Id(e.ElementId) != Id(e.AreaId)) && (e.ElementId is null || Id(e.ElementId)) && (e.AreaId is null || Id(e.AreaId)) &&
            (e.AreaId is null ? e.Bit is null : e.Bit is >= 0 and <= 15) && (e.AreaName is null || e.AreaName.Length <= 200) &&
            (e.Group is null || e.Group.Length <= 200) && e.Message is not null && e.Message.Length <= 2000 &&
            e.Severity is "info" or "warning" or "critical" &&
            (e.Value.ValueKind is JsonValueKind.True or JsonValueKind.False ||
             (e.Value.ValueKind == JsonValueKind.Number && e.Value.TryGetDouble(out var n) && double.IsFinite(n))) &&
            Time(e.RaisedAt) && e.RaisedAt >= batch.StartedAt &&
            (e.ClearedAt is null || (Time(e.ClearedAt.Value) && e.ClearedAt >= e.RaisedAt)) &&
            (e.AcknowledgedAt is null || (Time(e.AcknowledgedAt.Value) && e.AcknowledgedAt >= e.RaisedAt)) &&
            (e.ClearedReason is null || (e.ClearedAt is not null && e.ClearedReason is "condition" or "masked" or "disabled" or "invalidValue" or "sessionEnded")));
    }
    public void Append(string projectId, AlarmBatch batch)
    {
        using var db = Open(); using var transaction = db.BeginTransaction(deferred: false);
        using var session = db.CreateCommand(); session.Transaction = transaction;
        session.CommandText = "INSERT INTO alarm_sessions(id,project_id,started_at) VALUES($id,$project,$started) ON CONFLICT(id) DO NOTHING; SELECT project_id,started_at,ended_at FROM alarm_sessions WHERE id=$id";
        session.Parameters.AddWithValue("$id", batch.SessionId); session.Parameters.AddWithValue("$project", projectId); session.Parameters.AddWithValue("$started", batch.StartedAt);
        long? endedAt;
        using (var reader = session.ExecuteReader())
        {
            if (!reader.Read() || reader.GetString(0) != projectId || reader.GetInt64(1) != batch.StartedAt) throw new AlarmHistoryConflictException();
            endedAt = reader.IsDBNull(2) ? null : reader.GetInt64(2);
        }
        foreach (var e in batch.Events)
        {
            using var check = db.CreateCommand(); check.Transaction = transaction;
            check.CommandText = "SELECT project_id,session_id,source_kind,source_id,rule_id,raised_at,message,severity,value_json FROM alarm_events WHERE id=$id";
            check.Parameters.AddWithValue("$id", e.Id);
            var kind = e.AreaId is null ? "widget" : "global"; var sourceId = e.AreaId ?? e.ElementId!;
            using (var reader = check.ExecuteReader())
            {
                if (reader.Read() && (reader.GetString(0) != projectId || reader.GetString(1) != batch.SessionId || reader.GetString(2) != kind ||
                    reader.GetString(3) != sourceId || reader.GetString(4) != e.RuleId || reader.GetInt64(5) != e.RaisedAt ||
                    reader.GetString(6) != e.Message || reader.GetString(7) != e.Severity || reader.GetString(8) != e.Value.GetRawText())) throw new AlarmHistoryConflictException();
            }
            using var save = db.CreateCommand(); save.Transaction = transaction;
            save.CommandText = """
                INSERT INTO alarm_events(id,project_id,session_id,source_kind,source_id,area_name,bit_index,group_name,rule_id,message,severity,value_json,raised_at,cleared_at,acknowledged_at,cleared_reason)
                VALUES($id,$project,$session,$kind,$source,$area,$bit,$group,$rule,$message,$severity,$value,$raised,$cleared,$ack,$reason)
                ON CONFLICT(id) DO UPDATE SET
                    cleared_at=COALESCE(alarm_events.cleared_at,excluded.cleared_at),
                    cleared_reason=CASE WHEN alarm_events.cleared_at IS NULL THEN excluded.cleared_reason ELSE alarm_events.cleared_reason END,
                    acknowledged_at=COALESCE(alarm_events.acknowledged_at,excluded.acknowledged_at);
                """;
            var cleared = e.ClearedAt ?? (endedAt is null ? null : Math.Max(endedAt.Value, e.RaisedAt));
            foreach (var (name, value) in new (string, object?)[] {
                ("$id",e.Id),("$project",projectId),("$session",batch.SessionId),("$kind",kind),("$source",sourceId),("$area",e.AreaName),
                ("$bit",e.Bit),("$group",e.Group),("$rule",e.RuleId),("$message",e.Message),("$severity",e.Severity),
                ("$value",e.Value.GetRawText()),("$raised",e.RaisedAt),("$cleared",cleared),("$ack",e.AcknowledgedAt),
                ("$reason",e.ClearedReason ?? (e.ClearedAt.HasValue ? "condition" : endedAt is null ? null : "sessionEnded")) }) save.Parameters.AddWithValue(name, value ?? DBNull.Value);
            save.ExecuteNonQuery();
        }
        transaction.Commit();
    }
    public bool End(string projectId, string sessionId)
    {
        using var db = Open(); using var transaction = db.BeginTransaction(deferred: false); using var command = db.CreateCommand(); command.Transaction = transaction;
        command.CommandText = "UPDATE alarm_sessions SET ended_at=COALESCE(ended_at,$now) WHERE id=$session AND project_id=$project";
        command.Parameters.AddWithValue("$now", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()); command.Parameters.AddWithValue("$session", sessionId); command.Parameters.AddWithValue("$project", projectId);
        if (command.ExecuteNonQuery() == 0) return false;
        command.CommandText = """
            UPDATE alarm_events SET cleared_at=MAX(raised_at,(SELECT ended_at FROM alarm_sessions WHERE id=$session)),cleared_reason='sessionEnded'
            WHERE project_id=$project AND session_id=$session AND cleared_at IS NULL;
            """;
        command.ExecuteNonQuery(); transaction.Commit(); return true;
    }
    public AlarmHistoryPage List(string projectId, int offset, int limit, string? search = null, string? severity = null, string? group = null, long? from = null, long? to = null)
    {
        using var db = Open(); using var command = db.CreateCommand();
        var where = "project_id=$project AND ($search IS NULL OR instr(message,$search)>0 OR instr(COALESCE(area_name,''),$search)>0) AND ($severity IS NULL OR severity=$severity) AND ($group IS NULL OR group_name=$group) AND ($from IS NULL OR raised_at>=$from) AND ($to IS NULL OR raised_at<=$to)";
        foreach (var (key, value) in new (string, object?)[] { ("$project", projectId), ("$search", search), ("$severity", severity), ("$group", group), ("$from", from), ("$to", to) }) command.Parameters.AddWithValue(key, value ?? DBNull.Value);
        command.CommandText = "SELECT COUNT(*) FROM alarm_events WHERE " + where; var total = Convert.ToInt64(command.ExecuteScalar());
        command.Parameters.AddWithValue("$offset", offset); command.Parameters.AddWithValue("$limit", limit);
        command.CommandText = "SELECT id,source_kind,source_id,area_name,bit_index,group_name,rule_id,message,severity,value_json,raised_at,cleared_at,acknowledged_at,cleared_reason FROM alarm_events WHERE " + where + " ORDER BY raised_at DESC,id DESC LIMIT $limit OFFSET $offset";
        var items = new List<AlarmHistoryEvent>(); using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            using var value = JsonDocument.Parse(reader.GetString(9)); var global = reader.GetString(1) == "global";
            items.Add(new(reader.GetString(0), global ? null : reader.GetString(2), global ? reader.GetString(2) : null,
                reader.IsDBNull(3) ? null : reader.GetString(3), reader.IsDBNull(4) ? null : reader.GetInt32(4), reader.IsDBNull(5) ? null : reader.GetString(5),
                reader.GetString(6), reader.GetString(7), reader.GetString(8), value.RootElement.Clone(), reader.GetInt64(10),
                reader.IsDBNull(11) ? null : reader.GetInt64(11), reader.IsDBNull(12) ? null : reader.GetInt64(12), reader.IsDBNull(13) ? null : reader.GetString(13)));
        }
        return new(items, total, offset, limit);
    }
}
