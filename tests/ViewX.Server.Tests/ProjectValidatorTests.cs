using System.Text.Json;
using System.Text.Json.Nodes;
using ViewX.Server;
using Xunit;

namespace ViewX.Server.Tests;

public sealed class ProjectValidatorTests
{
    private const string ValidProject = """
        {"schemaVersion":1,"id":"p","name":"產線","description":"","startScreenId":"s",
        "variables":[{"id":"v","name":"計數","type":"number","initial":1}],
        "screens":[{"id":"s","name":"主畫面","width":960,"height":600,"background":"#101c2e",
        "elements":[{"id":"e","kind":"number","name":"數值","x":0,"y":0,"width":160,"height":48,
        "text":"","color":"#ffffff","background":"#000000","fontSize":16,
        "action":"toggle","actionValue":"1","locked":false,"visible":true,"variableId":"v"}]}]}
        """;
    [Fact]
    public void ValidProjectPasses() => Assert.True(ProjectValidator.IsValid(JsonDocument.Parse(ValidProject).RootElement));
    [Fact]
    public void NullElementIsRejected()
    {
        var project = JsonNode.Parse(ValidProject)!;
        project["screens"]![0]!["elements"]![0] = null;
        Assert.False(ProjectValidator.IsValid(JsonSerializer.SerializeToElement(project)));
    }
    [Theory]
    [InlineData("null")]
    [InlineData("[]")]
    [InlineData("{}")]
    [InlineData("{\"schemaVersion\":1,\"id\":\"p\",\"name\":\"n\",\"description\":\"\",\"startScreenId\":\"s\",\"screens\":[null],\"variables\":[]}")]
    public void MalformedProjectsAreRejected(string json) => Assert.False(ProjectValidator.IsValid(JsonDocument.Parse(json).RootElement));
    [Theory]
    [InlineData("width", "0")]
    [InlineData("id", "\"v\"")]
    [InlineData("variableId", "null")]
    [InlineData("image", "\"https://example.com/image.png\"")]
    [InlineData("decimals", "2.5")]
    [InlineData("kind", "\"__proto__\"")]
    [InlineData("fontWeight", "\"heavy\"")]
    [InlineData("borderWidth", "21")]
    [InlineData("sampleInterval", "99")]
    [InlineData("historyPoints", "601")]
    [InlineData("alarmRules", "[null]")]
    [InlineData("orientation", "\"diagonal\"")]
    [InlineData("showValue", "1")]
    [InlineData("inputStep", "0")]
    [InlineData("inputMax", "\"10\"")]
    [InlineData("useGrouping", "null")]
    [InlineData("numberFormat", "\"bad\"")]
    [InlineData("lineHeight", "0.5")]
    [InlineData("shapeFilled", "null")]
    [InlineData("buttonHoverColor", "\"red\"")]
    public void InvalidElementPropertiesAreRejected(string name, string json)
    {
        var project = JsonNode.Parse(ValidProject)!;
        project["screens"]![0]!["elements"]![0]![name] = JsonNode.Parse(json);
        Assert.False(ProjectValidator.IsValid(JsonSerializer.SerializeToElement(project)));
    }

    [Fact]
    public void PopupInheritanceAndActionsRoundTrip()
    {
        var project = JsonNode.Parse(ValidProject)!;
        var popup = project["screens"]![0]!.DeepClone();
        popup["id"] = "popup";
        popup["type"] = "popup";
        popup["parentScreenId"] = "s";
        popup["elements"] = new JsonArray();
        project["screens"]!.AsArray().Add(popup);
        var button = project["screens"]![0]!["elements"]![0]!;
        button["kind"] = "button";
        button["action"] = "popup";
        button["targetScreenId"] = "popup";
        Assert.True(ProjectValidator.IsValid(JsonSerializer.SerializeToElement(project)));
        button["action"] = "closePopup";
        Assert.True(ProjectValidator.IsValid(JsonSerializer.SerializeToElement(project)));
        project["screens"]![0]!["parentScreenId"] = "popup";
        Assert.False(ProjectValidator.IsValid(JsonSerializer.SerializeToElement(project)));
    }

    [Theory]
    [InlineData("type", "null")]
    [InlineData("type", "\"invalid\"")]
    [InlineData("type", "\"popup\"")]
    [InlineData("parentScreenId", "null")]
    [InlineData("parentScreenId", "\"\"")]
    [InlineData("parentScreenId", "\"missing\"")]
    [InlineData("parentScreenId", "\"s\"")]
    public void InvalidScreenStructureIsRejected(string name, string json)
    {
        var project = JsonNode.Parse(ValidProject)!;
        project["screens"]![0]![name] = JsonNode.Parse(json);
        Assert.False(ProjectValidator.IsValid(JsonSerializer.SerializeToElement(project)));
    }
}
