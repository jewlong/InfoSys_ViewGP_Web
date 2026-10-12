using System.Collections.Concurrent;
using System.Text.Json;

namespace ViewX.Server;

public sealed record TagSample(object? Value, string Quality, long? UpdatedAt, string? Error);
public sealed record DeviceSample(string Id, string State, long? LastSuccessAt, string? Error);
public sealed record CommunicationSnapshot(string SessionId, string ProjectId, IReadOnlyDictionary<string, TagSample> Tags, DeviceSample[] Devices);
public sealed class CommunicationSessionException(string message) : Exception(message);

public sealed class CommunicationRuntime : BackgroundService
{
    private readonly ConcurrentDictionary<string, Session> sessions = new();
    private readonly object startLock = new();
    public CommunicationSnapshot Start(CommunicationConfig config)
    {
        lock (startLock)
        {
            if (sessions.Count >= 16) throw new CommunicationSessionException("通訊工作階段已達上限，請先停止其他連線");
            var usedPorts = sessions.Values.SelectMany(s => s.Config.Devices.Where(d => s.Config.Tags.Any(t => t.Mapping.DeviceId == d.Id))).Where(d => d.Enabled && d.Transport == "rtu").Select(d => d.SerialPort!).ToHashSet(StringComparer.OrdinalIgnoreCase);
            if (config.Devices.Any(d => d.Enabled && d.Transport == "rtu" && usedPorts.Contains(d.SerialPort!))) throw new CommunicationSessionException("串列埠已被其他通訊工作階段使用");
            if (!config.Devices.Any(d => d.Enabled && config.Tags.Any(t => t.Mapping.DeviceId == d.Id))) throw new ArgumentException("請設定至少一個啟用設備與有效標籤映射");
            var session = new Session(config); sessions[session.Id] = session; session.Start(); return session.Snapshot();
        }
    }
    public CommunicationSnapshot? Get(string id) => sessions.TryGetValue(id, out var session) ? session.Snapshot() : null;
    public async Task<object> Write(string id, string variableId, JsonElement value, CancellationToken token)
    {
        if (!sessions.TryGetValue(id, out var session)) throw new KeyNotFoundException("通訊工作階段已結束");
        session.Touch(); return await session.Write(variableId, value, token);
    }
    public async Task<bool> End(string id)
    {
        if (!sessions.TryGetValue(id, out var session)) return false;
        await session.Stop(); sessions.TryRemove(id, out _); return true;
    }
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(5000, stoppingToken);
                foreach (var s in sessions.Values) if (Environment.TickCount64 - s.LastSeen > 30000) await End(s.Id);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
        finally { await Task.WhenAll(sessions.Keys.Select(End)); }
    }
    private sealed class Session
    {
        public string Id { get; } = Guid.NewGuid().ToString("N");
        public CommunicationConfig Config { get; }
        private long lastSeen = Environment.TickCount64;
        public long LastSeen => Interlocked.Read(ref lastSeen);
        private readonly CancellationTokenSource cancellation = new();
        private readonly DeviceWorker[] workers;
        private readonly object stopLock = new();
        private Task? stopTask;
        public Session(CommunicationConfig config)
        {
            Config = config;
            workers = config.Devices.Select(d => new DeviceWorker(d, config.Tags.Where(t => t.Mapping.DeviceId == d.Id).ToArray(), cancellation.Token)).ToArray();
        }
        public void Touch() => Interlocked.Exchange(ref lastSeen, Environment.TickCount64);
        public void Start() { foreach (var w in workers) w.Start(); }
        public CommunicationSnapshot Snapshot()
        {
            Touch(); var states = workers.Select(w => w.Snapshot()).ToArray();
            return new(Id, Config.ProjectId, states.SelectMany(s => s.Tags).ToDictionary(x => x.Key, x => x.Value), states.Select(s => s.Device).ToArray());
        }
        public Task<object> Write(string variableId, JsonElement value, CancellationToken token)
        {
            var worker = workers.FirstOrDefault(w => w.Tags.Any(t => t.Id == variableId)) ?? throw new ArgumentException("標籤未設定設備映射");
            return worker.Write(variableId, value, token);
        }
        public Task Stop() { lock (stopLock) return stopTask ??= StopCore(); }
        private async Task StopCore() { cancellation.Cancel(); await Task.WhenAll(workers.Select(w => w.Stop())); cancellation.Dispose(); }
    }
    private sealed class DeviceWorker
    {
        public CommunicationTag[] Tags { get; }
        private readonly CommunicationDevice device;
        private readonly CancellationToken stopped;
        private readonly SemaphoreSlim gate = new(1,1);
        private readonly object stateLock = new();
        private readonly Dictionary<string, TagSample> samples;
        private DeviceSample state;
        private readonly IModbusTransport transport;
        private readonly IReadOnlyList<ModbusReadBlock> blocks;
        private Task loop = Task.CompletedTask;
        public DeviceWorker(CommunicationDevice device, CommunicationTag[] tags, CancellationToken stopped)
        {
            this.device = device; Tags = tags; this.stopped = stopped; blocks = ModbusCodec.Plan(tags);
            transport = device.Transport == "tcp" ? new ModbusTcpTransport(device.Host!, device.Port) : new ModbusRtuTransport(device);
            state = new(device.Id, device.Enabled ? (tags.Length > 0 ? "connecting" : "unmapped") : "disabled", null, device.Enabled ? null : "設備未啟用");
            samples = tags.ToDictionary(t => t.Id, _ => new TagSample(null, device.Enabled ? "waiting" : "bad", null, state.Error));
        }
        public void Start() { if (device.Enabled && Tags.Length > 0) loop = PollLoop(); }
        private CancellationTokenSource Timeout(CancellationToken extra = default)
        {
            var timeout = CancellationTokenSource.CreateLinkedTokenSource(stopped, extra); timeout.CancelAfter(device.TimeoutMs); return timeout;
        }
        private async Task<byte[]> Exchange(byte[] pdu, CancellationToken extra = default)
        {
            using var timeout = Timeout(extra);
            try { return await transport.ExchangeAsync((byte)device.UnitId, pdu, timeout.Token); }
            catch (OperationCanceledException) when (!stopped.IsCancellationRequested && !extra.IsCancellationRequested) { throw new TimeoutException("設備通訊逾時"); }
        }
        private async Task Poll()
        {
            var values = new Dictionary<string, object>();
            foreach (var block in blocks)
                foreach (var (id, value) in ModbusCodec.Decode(block, await Exchange(ModbusCodec.ReadRequest(block.Function, block.Address, block.Count)))) values[id] = value;
            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            lock (stateLock)
            {
                foreach (var (id, value) in values) samples[id] = new(value, "good", now, null);
                state = new(device.Id, "connected", now, null);
            }
        }
        private void Failed(Exception error)
        {
            transport.Dispose();
            var message = error is TimeoutException ? "設備通訊逾時" : error.Message;
            lock (stateLock)
            {
                state = state with { State = "error", Error = message };
                foreach (var id in samples.Keys.ToArray()) samples[id] = samples[id] with { Quality = "bad", Error = message };
            }
        }
        private async Task PollLoop()
        {
            try
            {
                while (!stopped.IsCancellationRequested)
                {
                    await gate.WaitAsync(stopped);
                    try { await Poll(); }
                    catch (OperationCanceledException) when (stopped.IsCancellationRequested) { break; }
                    catch (Exception e) { Failed(e); }
                    finally { gate.Release(); }
                    await Task.Delay(device.PollIntervalMs, stopped);
                }
            }
            catch (OperationCanceledException) when (stopped.IsCancellationRequested) { }
            finally { transport.Dispose(); }
        }
        public async Task<object> Write(string id, JsonElement value, CancellationToken token)
        {
            if (!device.Enabled) throw new ArgumentException("設備未啟用");
            var tag = Tags.First(t => t.Id == id);
            var request = ModbusCodec.WriteRequest(tag.Mapping, value);
            using var linked = CancellationTokenSource.CreateLinkedTokenSource(stopped, token);
            await gate.WaitAsync(linked.Token);
            try
            {
                lock (stateLock) if (samples[id].Quality != "good") throw new ArgumentException("設備資料尚未有效，無法寫入");
                var response = await Exchange(request, token); ModbusCodec.ValidateWrite(request, response);
                // Read the actual register after the acknowledgement; never publish optimistic values.
                var block = new ModbusReadBlock(tag.Mapping.Function, tag.Mapping.Address, tag.Mapping.Words, [tag]);
                var confirmed = ModbusCodec.Decode(block, await Exchange(ModbusCodec.ReadRequest(block.Function, block.Address, block.Count), token))[id];
                var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                lock (stateLock) samples[id] = new(confirmed, "good", now, null);
                return confirmed;
            }
            catch (ArgumentException) { throw; }
            catch (Exception e) { Failed(e); throw new IOException("設備寫入未能確認，請檢查設備實際值；寫入不會自動重試", e); }
            finally { gate.Release(); }
        }
        public (Dictionary<string, TagSample> Tags, DeviceSample Device) Snapshot()
        { lock (stateLock) return (new(samples), state); }
        public async Task Stop() { await loop; await gate.WaitAsync(); try { transport.Dispose(); } finally { gate.Release(); } }
    }
}
