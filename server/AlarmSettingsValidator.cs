using System.Text.Json;

namespace ViewX.Server;

public static class AlarmSettingsValidator
{
    private static bool Text(JsonElement e, string key, int max, bool nonempty = false) =>
        e.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.String && v.GetString()!.Length <= max &&
        (!nonempty || !string.IsNullOrWhiteSpace(v.GetString()));
    private static bool Boolean(JsonElement e, string key) => e.TryGetProperty(key, out var v) && v.ValueKind is JsonValueKind.True or JsonValueKind.False;
    private static bool Integer(JsonElement e, string key, int min, int max) => e.TryGetProperty(key, out var v) &&
        v.ValueKind == JsonValueKind.Number && v.TryGetDouble(out var n) && double.IsFinite(n) && n == Math.Truncate(n) && n >= min && n <= max;
    public static bool IsValid(JsonElement project)
    {
        if (project.TryGetProperty("alarmTicker", out var ticker) &&
            (ticker.ValueKind != JsonValueKind.Object || !Boolean(ticker, "enabled") || !Text(ticker, "position", 10) ||
             ticker.GetProperty("position").GetString() is not ("top" or "bottom") || !Integer(ticker, "intervalMs", 1000, 60000))) return false;
        if (!project.TryGetProperty("alarmAreas", out var areas)) return true;
        if (areas.ValueKind != JsonValueKind.Array || areas.GetArrayLength() > 100) return false;
        var ids = new HashSet<string>();
        foreach (var area in areas.EnumerateArray())
        {
            if (area.ValueKind != JsonValueKind.Object || !Text(area, "id", int.MaxValue, true) || !ids.Add(area.GetProperty("id").GetString()!) ||
                !Text(area, "name", 200, true) || !Text(area, "variableId", int.MaxValue) || !Text(area, "group", 200) ||
                !Boolean(area, "enabled") || !Integer(area, "updateIntervalMs", 100, 60000) ||
                (area.TryGetProperty("maskVariableId", out var mask) && mask.ValueKind != JsonValueKind.String) ||
                !area.TryGetProperty("rules", out var rules) || rules.ValueKind != JsonValueKind.Array || rules.GetArrayLength() > 16) return false;
            var bits = new HashSet<int>(); var ruleIds = new HashSet<string>();
            foreach (var rule in rules.EnumerateArray())
            {
                if (rule.ValueKind != JsonValueKind.Object || !Text(rule, "id", int.MaxValue, true) || !ruleIds.Add(rule.GetProperty("id").GetString()!) ||
                    !Integer(rule, "bit", 0, 15) || !bits.Add((int)rule.GetProperty("bit").GetDouble()) || !Text(rule, "message", 2000, true) ||
                    !Text(rule, "severity", 20) || rule.GetProperty("severity").GetString() is not ("info" or "warning" or "critical") ||
                    (rule.TryGetProperty("enabled", out _) && !Boolean(rule, "enabled"))) return false;
            }
        }
        return true;
    }
}
