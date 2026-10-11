using System.Text.Json;

namespace ViewX.Server;

public static class DataSettingsValidator
{
    public static bool IsValid(JsonElement element)
    {
        if (element.ValueKind != JsonValueKind.Object) return false;
        foreach (var (name, options) in new[] {
            ("numberFormat", new[] { "decimal", "integer", "percent", "scientific" }),
            ("numberLocale", new[] { "en-US", "zh-TW", "de-DE" }) })
            if (element.TryGetProperty(name, out var value) && (value.ValueKind != JsonValueKind.String || !options.Contains(value.GetString()))) return false;
        if (element.TryGetProperty("useGrouping", out var grouping) && grouping.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) return false;
        if (element.TryGetProperty("numberPrefix", out var prefix) && prefix.ValueKind != JsonValueKind.String) return false;
        foreach (var name in new[] { "inputMin", "inputMax", "inputStep" })
            if (element.TryGetProperty(name, out var value) && (value.ValueKind != JsonValueKind.Number || !value.TryGetDouble(out var number) || !double.IsFinite(number) || (name == "inputStep" && number <= 0))) return false;
        return true;
    }
}
