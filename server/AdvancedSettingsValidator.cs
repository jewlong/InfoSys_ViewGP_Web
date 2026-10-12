using System.Text.Json;
using System.Text.RegularExpressions;

namespace ViewX.Server;

public static class AdvancedSettingsValidator
{
    private static bool Finite(JsonElement value) => value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out var n) && double.IsFinite(n);
    public static bool IsValid(JsonElement element)
    {
        if (element.ValueKind != JsonValueKind.Object) return false;
        foreach (var name in new[] { "scaleMin", "scaleMax", "warningThreshold", "criticalThreshold" })
            if (element.TryGetProperty(name, out var value) && !Finite(value)) return false;
        foreach (var name in new[] { "fillColor", "trackColor" })
            if (element.TryGetProperty(name, out var value) && (value.ValueKind != JsonValueKind.String || !Regex.IsMatch(value.GetString()!, "^#[0-9a-fA-F]{6}$"))) return false;
        foreach (var name in new[] { "showValue", "showScale" })
            if (element.TryGetProperty(name, out var value) && value.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) return false;
        if (element.TryGetProperty("orientation", out var direction) && (direction.ValueKind != JsonValueKind.String || !new[] { "horizontal", "vertical" }.Contains(direction.GetString()))) return false;
        if (element.TryGetProperty("scaleOrientation", out var sDir) && (sDir.ValueKind != JsonValueKind.String || !new[] { "horizontal", "vertical" }.Contains(sDir.GetString()))) return false;
        if (element.TryGetProperty("gridColor", out var gColor) && (gColor.ValueKind != JsonValueKind.String || !Regex.IsMatch(gColor.GetString()!, "^#[0-9a-fA-F]{6}$"))) return false;
        if (element.TryGetProperty("dateTimeFormat", out var dtFormat) && (dtFormat.ValueKind != JsonValueKind.String || dtFormat.GetString()!.Length > 100)) return false;
        foreach (var name in new[] { "scaleShowAxis", "scaleShowLabels", "tableDiagonal" })
            if (element.TryGetProperty(name, out var value) && value.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) return false;
        foreach (var (name, min, max) in new[] { ("tableCols", 1, 50), ("tableRows", 1, 50), ("scaleMajorTicks", 1, 50), ("scaleMinorTicks", 0, 50) })
            if (element.TryGetProperty(name, out var value) && (!Finite(value) || value.GetDouble() != Math.Truncate(value.GetDouble()) || value.GetDouble() < min || value.GetDouble() > max)) return false;
        if (element.TryGetProperty("multistateItems", out var items))
        {
            if (items.ValueKind != JsonValueKind.Array || items.GetArrayLength() > 20) return false;
            foreach (var item in items.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object || !item.TryGetProperty("value", out var v) || !Finite(v) ||
                    !item.TryGetProperty("label", out var l) || l.ValueKind != JsonValueKind.String || l.GetString()!.Length > 50 ||
                    !item.TryGetProperty("color", out var c) || c.ValueKind != JsonValueKind.String || !Regex.IsMatch(c.GetString()!, "^#[0-9a-fA-F]{6}$")) return false;
            }
        }
        foreach (var (name, min, max) in new[] { ("sampleInterval", 100, 60000), ("historyPoints", 10, 600), ("alarmMaxRows", 1, 100) })
            if (element.TryGetProperty(name, out var value) && (!Finite(value) || value.GetDouble() != Math.Truncate(value.GetDouble()) || value.GetDouble() < min || value.GetDouble() > max)) return false;
        if (!element.TryGetProperty("alarmRules", out var rules)) return true;
        if (rules.ValueKind != JsonValueKind.Array || rules.GetArrayLength() > 20) return false;
        var ids = new HashSet<string>(StringComparer.Ordinal);
        foreach (var rule in rules.EnumerateArray())
        {
            if (rule.ValueKind != JsonValueKind.Object || !rule.TryGetProperty("id", out var id) || id.ValueKind != JsonValueKind.String || id.GetString() is not { Length: > 0 } key || !ids.Add(key)) return false;
            foreach (var name in new[] { "message", "variableId" })
                if (!rule.TryGetProperty(name, out var value) || value.ValueKind != JsonValueKind.String) return false;
            if (!rule.TryGetProperty("operator", out var op) || op.ValueKind != JsonValueKind.String || !new[] { "gt", "gte", "lt", "lte", "eq", "ne", "true", "false" }.Contains(op.GetString())) return false;
            if (!rule.TryGetProperty("severity", out var severity) || severity.ValueKind != JsonValueKind.String || !new[] { "info", "warning", "critical" }.Contains(severity.GetString())) return false;
            if (rule.TryGetProperty("threshold", out var threshold) && !Finite(threshold)) return false;
            if (rule.TryGetProperty("enabled", out var enabled) && enabled.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) return false;
        }
        return true;
    }
}
