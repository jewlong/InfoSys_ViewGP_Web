using System.Text.Json;

namespace ViewX.Server;

// Keep the schema-v1 validation rules aligned with src/model.ts. Cross-runtime
// contract tests exercise both validators using the same project fixtures.
public static class ProjectValidator
{
    private static readonly HashSet<string> Kinds = ["text", "rectangle", "circle", "line", "image", "button", "indicator", "number", "input", "switch", "gauge", "bar", "trend", "alarm", "datetime", "multistate", "scale", "table", "slider", "arc", "spinbox", "dropdown"];
    private static readonly HashSet<string> Actions = ["toggle", "set", "increment", "screen", "reset", "momentary", "previousScreen", "openDialog", "closeDialog", "popup", "closePopup", "confirmPopup"];
    private static readonly string[] RequiredElementStrings = ["name", "text", "color", "background", "actionValue"];
    private static readonly string[] OptionalElementStrings = ["variableId", "targetScreenId", "groupId", "conditionId", "enabledId", "image", "unit", "dateTimeFormat", "gridColor", "scaleOrientation"];
    private static bool Property(JsonElement element, string name, out JsonElement value)
    {
        value = default;
        return element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out value);
    }
    private static bool Text(JsonElement element, string name) => Property(element, name, out var value) && value.ValueKind == JsonValueKind.String;
    private static bool Boolean(JsonElement element, string name) => Property(element, name, out var value) && value.ValueKind is JsonValueKind.True or JsonValueKind.False;
    private static bool Number(JsonElement element, string name, double min, double max) =>
        Property(element, name, out var value) && value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out var number) && double.IsFinite(number) && number >= min && number <= max;
    private static bool Array(JsonElement element, string name, out JsonElement value) => Property(element, name, out value) && value.ValueKind == JsonValueKind.Array;
    private static bool Unique(JsonElement element, HashSet<string> ids) => Text(element, "id") && element.GetProperty("id").GetString() is { Length: > 0 } id && ids.Add(id);

    public static bool IsValid(JsonElement project)
    {
        if (!Number(project, "schemaVersion", 1, 1) || !Text(project, "id") || !Text(project, "name") || !Text(project, "description") || !Text(project, "startScreenId") ||
            !Array(project, "screens", out var screens) || screens.GetArrayLength() == 0 || !Array(project, "variables", out var variables)) return false;
        if (Property(project, "autoSave", out var autoSave) && autoSave.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) return false;
        if (!AlarmSettingsValidator.IsValid(project) || !CommunicationSettings.IsValid(project)) return false;
        if (!OptionalProjectSettingsValid(project)) return false;
        var assetIds = new HashSet<string>(StringComparer.Ordinal);
        if (Property(project, "assets", out var assets))
        {
            if (assets.ValueKind != JsonValueKind.Array || assets.GetArrayLength() > 100) return false;
            foreach (var asset in assets.EnumerateArray())
            {
                if (!Unique(asset, assetIds) || !Text(asset, "name") || string.IsNullOrWhiteSpace(asset.GetProperty("name").GetString()) ||
                    asset.GetProperty("name").GetString()!.Length > 200 || !Text(asset, "data")) return false;
                var data = asset.GetProperty("data").GetString()!;
                if (data.Length > 4 * 1024 * 1024 + 30 || !System.Text.RegularExpressions.Regex.IsMatch(data, @"\Adata:image/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}\z")) return false;
            }
        }
        var ids = new HashSet<string>(StringComparer.Ordinal);
        foreach (var variable in variables.EnumerateArray())
        {
            if (!Unique(variable, ids) || !Text(variable, "name") || !Text(variable, "type") || !Property(variable, "initial", out var initial)) return false;
            var validInitial = variable.GetProperty("type").GetString() switch
            {
                "number" => Number(variable, "initial", double.MinValue, double.MaxValue),
                "boolean" => initial.ValueKind is JsonValueKind.True or JsonValueKind.False,
                "string" => initial.ValueKind == JsonValueKind.String,
                _ => false
            };
            if (!validInitial) return false;
        }
        var startFound = false;
        foreach (var screen in screens.EnumerateArray())
        {
            if (!Unique(screen, ids) || !Text(screen, "name") || !Number(screen, "width", 100, 4096) || !Number(screen, "height", 100, 4096) ||
                !Text(screen, "background") || !Array(screen, "elements", out var elements) || elements.GetArrayLength() > 2000) return false;
            if (Property(screen, "type", out var sType) && (sType.ValueKind != JsonValueKind.String || !new[] { "screen", "dialog", "normal", "popup" }.Contains(sType.GetString()))) return false;
            if (Property(screen, "inheritsScreenId", out var inheritId) && inheritId.ValueKind != JsonValueKind.String) return false;
            if (Property(screen, "popupCommitMode", out var commit) && (commit.ValueKind != JsonValueKind.String || commit.GetString() is not ("immediate" or "transactional"))) return false;
            if (Property(screen, "popupModal", out var modal) && modal.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) return false;
            if (screen.GetProperty("id").GetString() == project.GetProperty("startScreenId").GetString()) startFound = true;
            foreach (var element in elements.EnumerateArray())
            {
                if (Property(element, "imageAssetId", out var assetId) && (assetId.ValueKind != JsonValueKind.String || !assetIds.Contains(assetId.GetString()!))) return false;
                if (!AppearanceValidator.IsValid(element) || !DataSettingsValidator.IsValid(element) || !AdvancedSettingsValidator.IsValid(element) || !Unique(element, ids) || !Text(element, "kind") || !Kinds.Contains(element.GetProperty("kind").GetString()!) ||
                    !RequiredElementStrings.All(name => Text(element, name)) || !Number(element, "x", 0, double.MaxValue) || !Number(element, "y", 0, double.MaxValue) ||
                    !Number(element, "width", double.Epsilon, 4096) || !Number(element, "height", double.Epsilon, 4096) || !Number(element, "fontSize", 8, 1000) ||
                    !Boolean(element, "locked") || !Boolean(element, "visible") || !Text(element, "action") || !Actions.Contains(element.GetProperty("action").GetString()!)) return false;
                foreach (var name in OptionalElementStrings)
                    if (Property(element, name, out var value) && value.ValueKind != JsonValueKind.String) return false;
                if (Property(element, "decimals", out var decimals) && (decimals.ValueKind != JsonValueKind.Number || !decimals.TryGetDouble(out var places) || places != Math.Truncate(places) || places < 0 || places > 6)) return false;
                if (Property(element, "image", out var image) && image.GetString() is { Length: > 0 } source &&
                    !new[] { "png", "jpeg", "webp", "gif" }.Any(type => source.StartsWith($"data:image/{type};base64,", StringComparison.Ordinal))) return false;
            }
        }
        return startFound && ValidScreenStructure(project, screens);
    }

    private static bool IntInRange(JsonElement value, long min, long max) =>
        value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out var n) && n >= min && n <= max;

    private static bool OptionalProjectSettingsValid(JsonElement project)
    {
        if (Property(project, "autoSaveIntervalMs", out var interval) && !IntInRange(interval, 1000, 60000)) return false;
        if (Property(project, "maxPopupDepth", out var depth) && !IntInRange(depth, 1, 16)) return false;
        if (!Property(project, "alarmRetention", out var retention)) return true;
        if (retention.ValueKind != JsonValueKind.Object) return false;
        if (Property(retention, "maxDays", out var days) && !IntInRange(days, 1, 3650)) return false;
        if (Property(retention, "maxRecords", out var records) && !IntInRange(records, 100, 100000)) return false;
        if (Property(retention, "autoPrune", out var prune) && prune.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) return false;
        return true;
    }

    private static bool ValidScreenStructure(JsonElement project, JsonElement screens)
    {
        var byId = screens.EnumerateArray().ToDictionary(s => s.GetProperty("id").GetString()!, StringComparer.Ordinal);
        foreach (var screen in screens.EnumerateArray())
        {
            if (Property(screen, "type", out var type) &&
                (type.ValueKind != JsonValueKind.String || type.GetString() is not ("normal" or "popup" or "screen" or "dialog"))) return false;
            if (screen.GetProperty("id").GetString() == project.GetProperty("startScreenId").GetString() &&
                Property(screen, "type", out var startType) && startType.GetString() is ("popup" or "dialog")) return false;
            if (Property(screen, "parentScreenId", out var canonical) && Property(screen, "inheritsScreenId", out var legacy) &&
                (canonical.ValueKind != JsonValueKind.String || legacy.ValueKind != JsonValueKind.String || canonical.GetString() != legacy.GetString())) return false;
            var visited = new HashSet<string>(StringComparer.Ordinal) { screen.GetProperty("id").GetString()! };
            var current = screen;
            while (Property(current, "parentScreenId", out var parent) || Property(current, "inheritsScreenId", out parent))
            {
                if (parent.ValueKind != JsonValueKind.String || parent.GetString() is not { Length: > 0 } id ||
                    !visited.Add(id) || !byId.TryGetValue(id, out current)) return false;
            }
        }
        return true;
    }
}
