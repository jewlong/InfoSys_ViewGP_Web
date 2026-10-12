using System.Text.Json;
using ViewX.Server;
using Xunit;

namespace ViewX.Server.Tests;
public sealed class AlarmHistoryStoreTests : IDisposable
{
    private readonly string directory=Path.Combine(Path.GetTempPath(),"viewgp-alarm-"+Guid.NewGuid());
    private string Db=>Path.Combine(directory,"test.db");
    private AlarmHistoryStore Store() {var projects=new ProjectStore(Db); if(projects.Get("p") is null) projects.Save(JsonSerializer.SerializeToElement(new {id="p",name="Project"}),0);return new(Db);}
    private static AlarmHistoryEvent Event(string id="event")=>new(id,null,"area","Motor",2,"Production","rule","Emergency","critical",JsonSerializer.SerializeToElement(4),1000,null,null,null);
    [Fact]
    public void LifecycleRetriesAreIdempotentAndSurviveReopening()
    {
        var store=Store();var e=Event();store.Append("p",new("session",1000,[e]));
        store.Append("p",new("session",1000,[e with {AcknowledgedAt=1100,ClearedAt=1200,ClearedReason="masked"}]));
        store.Append("p",new("session",1000,[e]));
        var reopened=new AlarmHistoryStore(Db);var page=reopened.List("p",0,50);Assert.Equal(1,page.Total);
        Assert.Equal(1100,page.Items[0].AcknowledgedAt);Assert.Equal(1200,page.Items[0].ClearedAt);Assert.Equal("masked",page.Items[0].ClearedReason);
    }
    [Fact]
    public void SessionEndClosesPendingAndLateEventsButPreservesConditionClears()
    {
        var store=Store();store.Append("p",new("session",1000,[Event(),Event("cleared") with {ClearedAt=1200,ClearedReason="condition"}]));
        Assert.True(store.End("p","session"));store.Append("p",new("session",1000,[Event("late")]));
        var rows=store.List("p",0,50).Items;Assert.All(rows,e=>Assert.NotNull(e.ClearedAt));
        Assert.Equal("condition",rows.Single(e=>e.Id=="cleared").ClearedReason);Assert.Equal("sessionEnded",rows.Single(e=>e.Id=="late").ClearedReason);
    }
    [Fact]
    public void ConflictingIdentityRollsBackEntireBatchAndFiltersAreProjectScoped()
    {
        var store=Store();store.Append("p",new("session",1000,[Event()]));
        Assert.Throws<AlarmHistoryConflictException>(()=>store.Append("p",new("session",1000,[Event("new"),Event() with {Message="tampered"}])));
        Assert.Equal(1,store.List("p",0,50).Total);
        Assert.Equal(1,store.List("p",0,50,"Emergency","critical","Production",1000,1000).Total);
        Assert.Empty(store.List("other",0,50).Items);Assert.Empty(store.List("p",0,50,null,"info").Items);
    }
    [Fact]
    public void InvalidEventsAndSettingsAreRejected()
    {
        Assert.True(AlarmHistoryStore.Valid(new("session",1000,[Event()])));
        Assert.False(AlarmHistoryStore.Valid(new("session",1000,[Event() with {Bit=16}])));
        Assert.False(AlarmHistoryStore.Valid(new("session",1000,[Event() with {AcknowledgedAt=999}])));
        Assert.False(AlarmHistoryStore.Valid(new("session",1000,[Event() with {ElementId="widget"}])));
        Assert.False(AlarmHistoryStore.Valid(new("session",1000,[Event(),Event()])));
    }
    public void Dispose(){if(Directory.Exists(directory))Directory.Delete(directory,true);}
}
