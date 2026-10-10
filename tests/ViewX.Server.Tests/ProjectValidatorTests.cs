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
    public void InvalidElementPropertiesAreRejected(string name, string json)
    {
        var project = JsonNode.Parse(ValidProject)!;
        project["screens"]![0]!["elements"]![0]![name] = JsonNode.Parse(json);
        Assert.False(ProjectValidator.IsValid(JsonSerializer.SerializeToElement(project)));
    }
}
