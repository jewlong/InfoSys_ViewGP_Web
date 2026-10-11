using System.Text.Json;
using System.Text.RegularExpressions;

namespace ViewX.Server;

public static class AppearanceValidator
{
    private static readonly Dictionary<string, string[]> Enums = new()
    {
        ["fontWeight"] = ["normal", "bold"], ["textAlign"] = ["left", "center", "right"],
        ["verticalAlign"] = ["top", "middle", "bottom"], ["borderStyle"] = ["none", "solid", "dashed", "dotted"],
        ["imageFit"] = ["contain", "cover", "fill", "none"], ["imagePosition"] = ["center", "top", "bottom", "left", "right"]
    };
    public static bool IsValid(JsonElement element)
    {
        if (element.ValueKind != JsonValueKind.Object) return false;
        foreach (var (name, options) in Enums)
            if (element.TryGetProperty(name, out var value) && (value.ValueKind != JsonValueKind.String || !options.Contains(value.GetString()))) return false;
        foreach (var name in new[] { "italic", "underline", "wordWrap", "textBackground", "shapeFilled" })
            if (element.TryGetProperty(name, out var value) && value.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) return false;
        foreach (var (name, min, max) in new[] { ("lineHeight", 1d, 3d), ("borderWidth", 0d, 20d), ("borderRadius", 0d, 1000d) })
            if (element.TryGetProperty(name, out var value) && (value.ValueKind != JsonValueKind.Number || !value.TryGetDouble(out var number) || !double.IsFinite(number) || number < min || number > max)) return false;
        if (element.TryGetProperty("fontFamily", out var font) && (font.ValueKind != JsonValueKind.String || font.GetString()!.Length is < 1 or > 200)) return false;
        foreach (var name in new[] { "borderColor", "buttonHoverBackground", "buttonHoverColor", "buttonPressedBackground", "buttonPressedColor", "buttonDisabledBackground", "buttonDisabledColor" })
            if (element.TryGetProperty(name, out var value) && (value.ValueKind != JsonValueKind.String || !Regex.IsMatch(value.GetString()!, "^#[0-9a-fA-F]{6}$"))) return false;
        return true;
    }
}
