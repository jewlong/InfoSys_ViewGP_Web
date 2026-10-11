using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.FileProviders;
using ViewX.Server;

const int MaxBodyBytes = 20 * 1024 * 1024;
var builder = WebApplication.CreateBuilder(args);
// Normal checkout: server/. Published output: wwwroot and .data beside the app.
var repositoryRoot = File.Exists(Path.Combine(builder.Environment.ContentRootPath, "ViewX.Server.csproj"))
    ? Directory.GetParent(builder.Environment.ContentRootPath)!.FullName
    : builder.Environment.ContentRootPath;
var databasePath = Environment.GetEnvironmentVariable("VIEWX_DB_PATH") ?? Path.Combine(repositoryRoot, ".data", "viewx.db");
var store = new ProjectStore(databasePath);
builder.Services.AddSingleton(store);
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = MaxBodyBytes);
if (string.IsNullOrEmpty(builder.Configuration["urls"])) builder.WebHost.UseUrls("http://localhost:5000");
var app = builder.Build();
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api")) context.Response.Headers.CacheControl = "no-store";
    try { await next(context); }
    catch (RevisionConflictException exception) { await Error(context, 409, exception.Message); }
    catch (BadHttpRequestException exception) { await Error(context, exception.StatusCode, exception.StatusCode == 413 ? "專案超過 20 MB" : "請求格式錯誤"); }
    catch (SqliteException exception) when (exception.SqliteErrorCode is 5 or 6) { await Error(context, 503, "資料庫忙碌，請稍後重試"); }
    catch (Exception exception)
    {
        app.Logger.LogError(exception, "ViewX request failed");
        await Error(context, 500, "伺服器錯誤");
    }
});
app.MapGet("/api/health", () => Results.Json(new { status = "ok", storage = "sqlite" }));
app.MapGet("/api/projects", (ProjectStore db) => Results.Json(db.List()));
app.MapGet("/api/projects/{id}", (string id, ProjectStore db) =>
    db.Get(id) is { } project ? Results.Json(project) : Results.Json(new { error = "找不到專案" }, statusCode: 404));
app.MapPut("/api/projects/{id}", async (string id, HttpRequest request, ProjectStore db) =>
{
    var origin = request.Headers.Origin.ToString();
    if (origin.Length > 0 && origin != $"{request.Scheme}://{request.Host}")
        return Results.Json(new { error = "不允許跨來源寫入" }, statusCode: 403);
    if (request.ContentType?.Split(';')[0].Trim().Equals("application/json", StringComparison.OrdinalIgnoreCase) != true)
        return Results.Json(new { error = "請使用 JSON 格式" }, statusCode: 415);
    if (request.ContentLength > MaxBodyBytes) return Results.Json(new { error = "專案超過 20 MB" }, statusCode: 413);
    JsonDocument document;
    try { document = await JsonDocument.ParseAsync(request.Body, cancellationToken: request.HttpContext.RequestAborted); }
    catch (JsonException) { return Results.Json(new { error = "JSON 格式錯誤" }, statusCode: 400); }
    using (document)
    {
        var body = document.RootElement;
        if (body.ValueKind != JsonValueKind.Object || !body.TryGetProperty("project", out var project) || !ProjectValidator.IsValid(project) ||
            project.GetProperty("id").GetString() != id || !body.TryGetProperty("revision", out var revision) || revision.ValueKind != JsonValueKind.Number ||
            !revision.TryGetInt64(out var expectedRevision) || expectedRevision < 0 || expectedRevision >= 9_007_199_254_740_991)
            return Results.Json(new { error = "專案資料格式錯誤" }, statusCode: 400);
        return Results.Json(db.Save(project, expectedRevision));
    }
});
app.MapGet("/api/projects/{id}/versions", (string id, ProjectStore db) =>
    db.Get(id) is null ? Results.Json(new { error = "找不到專案" }, statusCode: 404) : Results.Json(db.ListVersions(id)));
app.MapGet("/api/projects/{id}/versions/{revision:long}", (string id, long revision, ProjectStore db) =>
    db.GetVersion(id, revision) is { } version ? Results.Json(version) : Results.Json(new { error = "找不到版本" }, statusCode: 404));
app.MapPost("/api/projects/{id}/restore", async (string id, HttpRequest request, ProjectStore db) =>
{
    var origin = request.Headers.Origin.ToString();
    if (origin.Length > 0 && origin != $"{request.Scheme}://{request.Host}")
        return Results.Json(new { error = "不允許跨來源寫入" }, statusCode: 403);
    if (request.ContentType?.Split(';')[0].Trim().Equals("application/json", StringComparison.OrdinalIgnoreCase) != true)
        return Results.Json(new { error = "請使用 JSON 格式" }, statusCode: 415);
    JsonDocument document;
    try { document = await JsonDocument.ParseAsync(request.Body, cancellationToken: request.HttpContext.RequestAborted); }
    catch (JsonException) { return Results.Json(new { error = "JSON 格式錯誤" }, statusCode: 400); }
    using (document)
    {
        var body = document.RootElement;
        if (body.ValueKind != JsonValueKind.Object || !body.TryGetProperty("revision", out var revision) || revision.ValueKind != JsonValueKind.Number ||
            !revision.TryGetInt64(out var expected) || expected < 1 || expected >= 9_007_199_254_740_991 ||
            !body.TryGetProperty("sourceRevision", out var source) || source.ValueKind != JsonValueKind.Number || !source.TryGetInt64(out var sourceRevision) || sourceRevision < 1)
            return Results.Json(new { error = "版本格式錯誤" }, statusCode: 400);
        return db.Restore(id, sourceRevision, expected) is { } restored ? Results.Json(restored) : Results.Json(new { error = "找不到版本" }, statusCode: 404);
    }
});
app.Map("/api/{**path}", () => Results.Json(new { error = "API 不存在" }, statusCode: 404));
var frontendPath = Directory.Exists(Path.Combine(repositoryRoot, "dist"))
    ? Path.Combine(repositoryRoot, "dist") : Path.Combine(app.Environment.ContentRootPath, "wwwroot");
if (File.Exists(Path.Combine(frontendPath, "index.html")))
{
    var files = new PhysicalFileProvider(frontendPath);
    app.Lifetime.ApplicationStopped.Register(files.Dispose);
    app.UseStaticFiles(new StaticFileOptions { FileProvider = files });
    app.MapFallbackToFile("index.html", new StaticFileOptions { FileProvider = files });
}
else app.MapGet("/", () => Results.Text("ViewX API is running. Start the frontend with npm run dev, or run npm run build to serve the application here."));
app.Run();

static async Task Error(HttpContext context, int status, string message)
{
    if (context.Response.HasStarted) return;
    context.Response.StatusCode = status;
    await context.Response.WriteAsJsonAsync(new { error = message });
}
